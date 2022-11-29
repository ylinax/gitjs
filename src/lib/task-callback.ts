import { SimpleGitTask } from './tasks/task';
import { GitError, GitResponseError } from './api';
import { NOOP } from './utils';
import { SimpleGitTaskCallback } from './types';

export function taskCallback<R>(task: SimpleGitTask<R>, response: Promise<R>, callback: SimpleGitTaskCallback<R> = NOOP) {

   const onSuccess = (data: R) => {
      callback(null, data);
   };

   const onError = (err: GitError | GitResponseError) => {
      if (err?.task === task) {
         if (err instanceof GitResponseError) {
            return callback(addDeprecationNoticeToError(err));
         }
         callback(err);
      }
   };

   response.then(onSuccess, onError);

}

function addDeprecationNoticeToError (err: GitResponseError) {
   let log = (name: string) => {
      console.warn(`simple-git deprecation notice: accessing GitResponseError.${name} should be GitResponseError.git.${name}`);
      log = NOOP;
   };

   return Object.create(err, Object.getOwnPropertyNames(err.git).reduce(descriptorReducer, {}));

   function descriptorReducer(all: PropertyDescriptorMap, name: string): typeof all {
      if (name in err) {
         return all;
      }

      all[name] = {
         enumerable: false,
         configurable: false,
         get () {
            log(name);
            return err.git[name];
         },
      };

      return all;
   }
}
