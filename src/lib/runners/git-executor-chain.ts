import { spawn, SpawnOptions } from 'child_process';
import { GitError } from '../api';
import { OutputLogger } from '../git-logger';
import { PluginStore } from '../plugins';
import { EmptyTask, isBufferTask, isEmptyTask, } from '../tasks/task';
import {
   GitExecutorResult,
   Maybe,
   outputHandler,
   RunnableTask,
   SimpleGitExecutor,
   SimpleGitTask,
   TaskResponseFormat
} from '../types';
import { callTaskParser, first, GitOutputStreams, objectToString } from '../utils';
import { Scheduler } from './scheduler';
import { TasksPendingQueue } from './tasks-pending-queue';

export class GitExecutorChain implements SimpleGitExecutor {

   private _chain: Promise<any> = Promise.resolve();
   private _queue = new TasksPendingQueue();

   public get binary() {
      return this._executor.binary;
   }

   public get cwd() {
      return this._executor.cwd;
   }

   public get env() {
      return this._executor.env;
   }

   public get outputHandler() {
      return this._executor.outputHandler;
   }

   constructor(
      private _executor: SimpleGitExecutor,
      private _scheduler: Scheduler,
      private _plugins: PluginStore
   ) {
   }

   public chain() {
      return this;
   }

   public push<R>(task: SimpleGitTask<R>): Promise<R> {
      this._queue.push(task);

      return this._chain = this._chain.then(() => this.attemptTask(task));
   }

   private async attemptTask<R>(task: SimpleGitTask<R>): Promise<void | R> {
      const onScheduleComplete = await this._scheduler.next();
      const onQueueComplete = () => this._queue.complete(task);

      try {
         const {logger} = this._queue.attempt(task);
         return await (isEmptyTask(task)
               ? this.attemptEmptyTask(task, logger)
               : this.attemptRemoteTask(task, logger)
         ) as R;
      } catch (e) {
         throw this.onFatalException(task, e);
      } finally {
         onQueueComplete();
         onScheduleComplete();
      }
   }

   private onFatalException<R>(task: SimpleGitTask<R>, e: Error) {
      const gitError = (e instanceof GitError) ? Object.assign(e, {task}) : new GitError(task, e && String(e));

      this._chain = Promise.resolve();
      this._queue.fatal(gitError);

      return gitError;
   }

   private async attemptRemoteTask<R>(task: RunnableTask<R>, logger: OutputLogger) {
      const args = this._plugins.exec('spawn.args', [...task.commands], pluginContext(task, task.commands));

      const raw = await this.gitResponse(
         task,
         this.binary, args, this.outputHandler, logger.step('SPAWN'),
      );
      const outputStreams = await this.handleTaskData(task, raw, logger.step('HANDLE'));

      logger(`passing response to task's parser as a %s`, task.format);

      if (isBufferTask(task)) {
         return callTaskParser(task.parser, outputStreams);
      }

      return callTaskParser(task.parser, outputStreams.asStrings());
   }

   private async attemptEmptyTask(task: EmptyTask, logger: OutputLogger) {
      logger(`empty task bypassing child process to call to task's parser`);
      return task.parser();
   }

   private handleTaskData<R>(
      {onError, concatStdErr}: SimpleGitTask<R>,
      {exitCode, stdOut, stdErr}: GitExecutorResult, logger: OutputLogger): Promise<GitOutputStreams> {

      return new Promise((done, fail) => {
         logger(`Preparing to handle process response exitCode=%d stdOut=`, exitCode);

         if (exitCode && stdErr.length && onError) {
            logger.info(`exitCode=%s handling with custom error handler`);
            logger(`concatenate stdErr to stdOut: %j`, concatStdErr);
            return onError(
               exitCode,
               Buffer.concat([...(concatStdErr ? stdOut : []), ...stdErr]).toString('utf-8'),
               (result: TaskResponseFormat) => {
                  logger.info(`custom error handler treated as success`);
                  logger(`custom error returned a %s`, objectToString(result));

                  done(new GitOutputStreams(
                     Buffer.isBuffer(result) ? result : Buffer.from(String(result)),
                     Buffer.concat(stdErr),
                  ));
               },
               fail
            );
         }

         if (exitCode && stdErr.length) {
            logger.info(`exitCode=%s treated as error when then child process has written to stdErr`);
            return fail(Buffer.concat(stdErr).toString('utf-8'));
         }

         if (concatStdErr) {
            logger(`concatenating stdErr onto stdOut before processing`);
            logger(`stdErr: $O`, stdErr);
            stdOut.push(...stdErr);
         }

         logger.info(`retrieving task output complete`);
         done(new GitOutputStreams(
            Buffer.concat(stdOut),
            Buffer.concat(stdErr),
         ));
      });
   }

   private async gitResponse<R>(task: SimpleGitTask<R>, command: string, args: string[], outputHandler: Maybe<outputHandler>, logger: OutputLogger): Promise<GitExecutorResult> {
      const outputLogger = logger.sibling('output');
      const spawnOptions: SpawnOptions = {
         cwd: this.cwd,
         env: this.env,
         windowsHide: true,
      };

      return new Promise((done) => {
         const stdOut: Buffer[] = [];
         const stdErr: Buffer[] = [];

         let attempted = false;

         function attemptClose(exitCode: number, event: string = 'retry') {

            // closing when there is content, terminate immediately
            if (attempted || stdErr.length || stdOut.length) {
               logger.info(`exitCode=%s event=%s`, exitCode, event);
               done({
                  stdOut,
                  stdErr,
                  exitCode,
               });
               attempted = true;
               outputLogger.destroy();
            }

            // first attempt at closing but no content yet, wait briefly for the close/exit that may follow
            if (!attempted) {
               attempted = true;
               setTimeout(() => attemptClose(exitCode, 'deferred'), 50);
               logger('received %s event before content on stdOut/stdErr', event)
            }

         }

         logger.info(`%s %o`, command, args);
         logger('%O', spawnOptions)
         const spawned = spawn(command, args, spawnOptions);

         spawned.stdout!.on('data', onDataReceived(stdOut, 'stdOut', logger, outputLogger.step('stdOut')));
         spawned.stderr!.on('data', onDataReceived(stdErr, 'stdErr', logger, outputLogger.step('stdErr')));

         spawned.on('error', onErrorReceived(stdErr, logger));

         spawned.on('close', (code: number) => attemptClose(code, 'close'));
         spawned.on('exit', (code: number) => attemptClose(code, 'exit'));

         if (outputHandler) {
            logger(`Passing child process stdOut/stdErr to custom outputHandler`);
            outputHandler(command, spawned.stdout!, spawned.stderr!, [...args]);
         }

         this._plugins.exec('spawn.after', undefined, {
            ...pluginContext(task, args),
            spawned,
         });

      });
   }

}

function pluginContext<R>(task: SimpleGitTask<R>, commands: string[]) {
   return {
      method: first(task.commands) || '',
      commands,
   }
}

function onErrorReceived(target: Buffer[], logger: OutputLogger) {
   return (err: Error) => {
      logger(`[ERROR] child process exception %o`, err);
      target.push(Buffer.from(String(err.stack), 'ascii'));
   }
}

function onDataReceived(target: Buffer[], name: string, logger: OutputLogger, output: OutputLogger) {
   return (buffer: Buffer) => {
      logger(`%s received %L bytes`, name, buffer);
      output(`%B`, buffer);
      target.push(buffer)
   }
}
