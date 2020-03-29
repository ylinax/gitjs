# Simple Git
[![NPM version](http://img.shields.io/npm/v/simple-git.svg)](https://www.npmjs.com/package/simple-git) [![Build Status](https://travis-ci.org/steveukx/git-js.svg?branch=master)](https://travis-ci.org/steveukx/git-js)

A light weight interface for running git commands in any [node.js](http://nodejs.org) application.

# Installation

Easiest through [npm](http://npmjs.org): `npm install simple-git`

# Dependencies

Requires [git](http://git-scm.com/downloads) to be installed and that it can be called using the command `git`.

# Usage

Include into your app using:

    var simpleGit = require('simple-git')( workingDirPath );

> where the `workingDirPath` is optional, defaulting to the current directory.

Use `simpleGit` by chaining any of its functions together. Each function accepts an optional final argument which will
be called when that step has been completed. When it is called it has two arguments - firstly an error object (or null
when no error occurred) and secondly the data generated by that call.

| API | What it does |
|-----|--------------|
| `.add([fileA, ...], handlerFn)` | adds one or more files to be under source control |
| `.addAnnotatedTag(tagName, tagMessage, handlerFn)` | adds an annotated tag to the head of the current branch |
| `.addConfig(key, value[, handlerFn])` |  add a local configuration property |
| `.addRemote(name, repo, handlerFn)` | adds a new named remote to be tracked as `name` at the path `repo` |
| `.addTag(name, handlerFn)` | adds a lightweight tag to the head of the current branch |
| `.branch([options, ][handlerFn])` | gets a list of all branches, calls `handlerFn` with two arguments, an error object and [BranchSummary](src/responses/BranchSummary.js) instance. When supplied, the options can be either an array of arguments supported by the [branch](https://git-scm.com/docs/git-branch) command or a standard [options](#how-to-specify-options) object. |
| `.branchLocal([handlerFn])` | gets a list of local branches, calls `handlerFn` with two arguments, an error object and [BranchSummary](src/responses/BranchSummary.js) instance |
| `.catFile(options[, handlerFn])` | generate `cat-file` detail, `options` should be an array of strings as supported arguments to the [cat-file](https://git-scm.com/docs/git-cat-file) command |
| `.checkout(checkoutWhat, handlerFn)` | checks out the supplied tag, revision or branch. `checkoutWhat` can be one or more strings to be used as parameters appended to the `git checkout` command. |
| `.checkoutBranch(branchName, startPoint, handlerFn)` | checks out a new branch from the supplied start point |
| `.checkoutLocalBranch(branchName, handlerFn)` | checks out a new local branch |
| `.deleteLocalBranch(branchName, handlerFn)` | deletes a local branch |
| `.checkoutLatestTag(handlerFn)` | convenience method to pull then checkout the latest tag |
| `.clone(repoPath, [localPath, [options]], [handlerFn])` | clone a remote repo at `repoPath` to a local directory at `localPath` (can be omitted to use the default of a directory with the same name as the repo name) with an optional array of additional arguments to include between `git clone` and the trailing `repo local` arguments |
| `.clearQueue()` | immediately clears the queue of pending tasks (note: any command currently in progress will still call its completion callback) |
| `.commit(message, handlerFn)` | commits changes in the current working directory with the supplied message where the message can be either a single string or array of strings to be passed as separate arguments (the `git` command line interface converts these to be separated by double line breaks) |
| `.commit(message, [fileA, ...], options, handlerFn)` | commits changes on the named files with the supplied message, when supplied, the optional options object can contain any other parameters to pass to the commit command, setting the value of the property to be a string will add `name=value` to the command string, setting any other type of value will result in just the key from the object being passed (ie: just `name`), an example of setting the author is below |
| `.customBinary(gitPath)` | sets the command to use to reference git, allows for using a git binary not available on the path environment variable |
| `.cwd(workingDirectory)` |  Sets the current working directory for all commands after this step in the chain |
| `.diff(options, handlerFn)` | get the diff of the current repo compared to the last commit with a set of options supplied as a string |
| `.diff(handlerFn)` | get the diff for all file in the current repo compared to the last commit |
| `.diffSummary(handlerFn)` | gets a summary of the diff for files in the repo, uses the `git diff --stat` format to calculate changes. Handler is called with a nullable error object and an instance of the [DiffSummary](src/responses/DiffSummary.js) |
| `.diffSummary(options, handlerFn)` | includes options in the call to `diff --stat options` and returns a [DiffSummary](src/responses/DiffSummary.js) |
| `.fetch([options, ] handlerFn)` | update the local working copy database with changes from the default remote repo and branch, when supplied the options argument can be a standard [options object](#how-to-specify-options) either an array of string commands as supported by the [git fetch](https://git-scm.com/docs/git-fetch). On success, the returned data will be an instance of the [FetchSummary](src/responses/FetchSummary.js) |
| `.fetch(remote, branch, handlerFn)` | update the local working copy database with changes from a remote repo |
| `.fetch(handlerFn)` | update the local working copy database with changes from the default remote repo and branch |
| `.init(bare, handlerFn)` | initialize a repository, optional `bare` parameter makes intialized repository bare |
| `.log([options], handlerFn)` | list commits between `options.from` and `options.to` tags or branch (if not specified will show all history). Additionally you can provide `options.file`, which is the path to a file in your repository. Then only this file will be considered. For any other set of options, supply `options` as an array of strings to be appended to the `git log` command. To use a custom splitter in the log format, set `options.splitter` to be the string the log should be split on. Options can also be supplied as a standard [options](#how-to-specify-options) object for adding custom properties supported by the [git log](https://git-scm.com/docs/git-log) command. |
| `.mergeFromTo(from, to, [[options,] handlerFn])` | merge from one branch to another, when supplied the options should be an array of additional parameters to pass into the [git merge](https://git-scm.com/docs/git-merge) command |
| `.merge(options, handlerFn)` | runs a merge, `options` can be either an array of arguments supported by the [git merge](https://git-scm.com/docs/git-merge) command or an [options](#how-to-specify-options) object. Conflicts during the merge result in an error response, the response type whether it was an error or success will be a [MergeSummary](src/responses/MergeSummary.js) instance. When successful, the MergeSummary has all detail from a the [PullSummary](src/responses/PullSummary.js) |
| `.mirror(repoPath, localPath, handlerFn])` | clone and mirror the repo to local |
| `.mv(from, to, handlerFn])` | rename or move a single file at `from` to `to`. On success the `handlerFn` will be called with a [MoveSummary](src/responses/MoveSummary.js) |
| `.mv(from, to, handlerFn])` | move all files in the `from` array to the `to` directory. On success the `handlerFn` will be called with a [MoveSummary](src/responses/MoveSummary.js) |
| `.pull(handlerFn)` | Pulls all updates from the default tracked repo |
| `.pull(remote, branch, handlerFn)` | pull all updates from the specified remote branch (eg 'origin'/'master') |
| `.pull(remote, branch, options, handlerFn)` | Pulls from named remote with any necessary options |
| `.push(remote, branch[, options] handlerFn)` | pushes to a named remote/branch, supports additional [options](#how-to-specify-options) from the [git push](https://git-scm.com/docs/git-push) command. |
| `.pushTags(remote, handlerFn)` | pushes tags to a named remote |
| `.rebase([options,] handlerFn)` | Rebases the repo, `options` should be supplied as an array of string parameters supported by the [git rebase](https://git-scm.com/docs/git-rebase) command, or an object of options (see details below for option formats). |
| `.removeRemote(name, handlerFn)` | removes the named remote |
| `.rm([fileA, ...], handlerFn)` | removes any number of files from source control |
| `.rmKeepLocal([fileA, ...], handlerFn)` | removes files from source control but leaves them on disk |
| `.silent(isSilent)` | sets whether the console should be used for logging errors (defaults to `true` when the `NODE_ENV` contains the string `prod`) |
| `.stashList([options, ][handlerFn])` | Retrieves the stash list, optional first argument can be an object specifying `options.splitter` to override the default value of `:`, alternatively options can be a set of arguments as supported by the `git stash list` command. |
| `.stash([options, ][ handlerFn])` | Stash the working directory, optional first argument can be an array of string arguments or [options](#how-to-specify-options) object to pass to the [git stash](https://git-scm.com/docs/git-stash) command. |
| `.subModule(args [, handlerFn])` | Run a `git submodule` command with on or more arguments passed in as an `args` array |
| `.submoduleAdd(repo, path[, handlerFn])` | adds a new sub module |
| `.submoduleInit([args, ][handlerFn])` | inits sub modules, args should be an array of string arguments to pass to the `git submodule init` command |
| `.submoduleUpdate([args, ][handlerFn])` | updates sub modules, args should be an array of string arguments to pass to the `git submodule update` command |
| `.tag(args[], handlerFn)` | Runs any supported [git tag](https://git-scm.com/docs/git-tag) commands with arguments passed as an array of strings . |
| `.tags([options, ] handlerFn)` | list all tags, use the optional [options](#how-to-specify-options) object to set any options allows by the [git tag](https://git-scm.com/docs/git-tag) command. Tags will be sorted by semantic version number by default, for git versions 2.7 and above, use the `--sort` option to set a custom sort. |
| `.getRemotes([verbose], handlerFn)` | gets a list of the named remotes, when the verbose option is supplied as true, includes the URLs and purpose of each ref |
| `.reset([resetMode,] handlerFn)` | resets the repository, the optional first argument can either be an array of options supported by the `git reset` command or one of the string constants `mixed`, `hard`, or `soft`, if omitted the reset will be a soft reset to head, handlerFn: (err) |
| `.revparse([options], handlerFn)` | wraps git rev-parse. Primarily used to convert friendly commit references (ie branch names) to SHA1 hashes. Options should be an array of string options compatible with the [git rev-parse](http://git-scm.com/docs/git-rev-parse) |
| `.status(handlerFn)` | gets the status of the current repo |
| `.show([options], handlerFn)` | Show various types of objects, for example the file content at a certain commit. `options` is the single value string or array of string commands you want to run |
| `.checkIgnore([filepath, ...], handlerFn)` | checks if filepath excluded by .gitignore rules |
| `.listRemote([args], handlerFn)` | lists remote repositories - there are so many optional arguments in the underlying  `git ls-remote` call, just supply any you want to use as the optional `args` array of strings eg: `git.listRemote(['--heads', '--tags'], console.log.bind(console))` |
| `.outputHandler(handlerFn)` | attaches a handler that will be called with the name of the command being run and the `stdout` and `stderr` [readable streams](http://nodejs.org/api/stream.html#stream_class_stream_readable) created by the [child process](http://nodejs.org/api/child_process.html#child_process_class_childprocess) running that command |
| `.clean(mode [, options [, handlerFn]])` | clean the working tree. Mode should be "n" - dry run  or "f" - force |
| `.raw(args[, handlerFn])` | Execute any arbitrary array of commands supported by the underlying git binary. When the git process returns a non-zero signal on exit and it printed something to `stderr`, the commmand will be treated as an error, otherwise treated as a success. |
| `.revert(commit [, options [, handlerFn]])` | reverts one or more commits in the working copy. The commit can be any regular commit-ish value (hash, name or offset such as `HEAD~2`) or a range of commits (eg: `master~5..master~2`). When supplied the [options](#how-to-specify-options) argument contain any options accepted by [git-revert](https://git-scm.com/docs/git-revert). |
| `.exec(handlerFn)` | calls a simple function in the current step |

# How to Specify Options

For `.pull` or `.commit` options are included as an object, the keys of which will all be merged as trailing
arguments in the command string. When the value of the property in the options object is a `string`, that name value
pair will be included in the command string as `name=value`. For example:

```
// results in 'git pull origin master --no-rebase'
git().pull('origin', 'master', {'--no-rebase': null})

// results in 'git pull origin master --rebase=true'
git().pull('origin', 'master', {'--rebase': 'true'})
```

# Release History

Bumped to a new major revision in the 1.x branch, now uses `ChildProcess.spawn` in place of `ChildProcess.exec` to
add escaping to the arguments passed to each of the tasks.

# Deprecated APIs

Use of these APIs is deprecated and should be avoided as support for them will be removed in future release:

`.then(func)` In versions 1.72 and below, it was possible to add a regular function call to the queue of tasks to be
 run. As this name clashes with the use of Promises, in version 1.73.0 it is renamed to `.exec(fn)` and a warning will
 be logged to `stdout` if `.then` is used. From version 2.0 the library will support promises without the need to wrap
 or use the alternative require `require('simple-git/promise')`.

`.log([from, to], handlerFn)` list commits between `from` and `to` tags or branch, switch to supplying the revisions
as an options object instead.

# Complex Requests

When no suitable wrapper exists in the interface for creating a request, it is possible to run a command directly
using `git.raw([...], handler)`. The array of commands are passed directly to the `git` binary:

```
const git = require('simple-git');
const path = '/path/to/repo';

git(path).raw(
   [
      'config',
      '--global',
      'advice.pushNonFastForward',
      'false'
   ], (err, result) = {

      // err is null unless this command failed
      // result is the raw output of this command

   });
```

# Authentication

The easiest way to supply a username / password to the remote host is to include it in the URL, for example:

```
const USER = 'something';
const PASS = 'somewhere';
const REPO = 'github.com/username/private-repo';

const git = require('simple-git/promise');
const remote = `https://${USER}:${PASS}@${REPO}`;

git().silent(true)
  .clone(remote)
  .then(() => console.log('finished'))
  .catch((err) => console.error('failed: ', err));

```

Be sure to enable silent mode to prevent fatal errors from being logged to stdout.

# Examples
```js
    // update repo and get a list of tags
    require('simple-git')(__dirname + '/some-repo')
         .pull()
         .tags(function(err, tags) {
            console.log("Latest available tag: %s", tags.latest);
         });

    // update repo and when there are changes, restart the app
    require('simple-git')()
         .pull(function(err, update) {
            if(update && update.summary.changes) {
               require('child_process').exec('npm restart');
            }
         });

    // starting a new repo
    require('simple-git')()
         .init()
         .add('./*')
         .commit("first commit!")
         .addRemote('origin', 'https://github.com/user/repo.git')
         .push('origin', 'master');

    // push with -u
    require('simple-git')()
         .add('./*')
         .commit("first commit!")
         .addRemote('origin', 'some-repo-url')
         .push(['-u', 'origin', 'master'], function () {
            // done.
         });

    // piping to the console for long running tasks
    require('simple-git')()
         .outputHandler(function (command, stdout, stderr) {
            stdout.pipe(process.stdout);
            stderr.pipe(process.stderr);
         })
         .checkout('https://github.com/user/repo.git');

    // update repo and print messages when there are changes, restart the app
    require('simple-git')()
         .then(function() {
            console.log('Starting pull...');
         })
         .pull(function(err, update) {
            if(update && update.summary.changes) {
               require('child_process').exec('npm restart');
            }
         })
         .then(function() {
            console.log('pull done.');
         });

    // get a full commits list, and then only between 0.11.0 and 0.12.0 tags
    require('simple-git')()
        .log(function(err, log) {
            console.log(log);
        })
        .log('0.11.0', '0.12.0', function(err, log) {
            console.log(log);
        });

    // set the local configuration for author, then author for an individual commit
    require('simple-git')()
        .addConfig('user.name', 'Some One')
        .addConfig('user.email', 'some@one.com')
        .commit('committed as "Some One"', 'file-one')
        .commit('committed as "Another Person"', 'file-two', { '--author': '"Another Person <another@person.com>"' });

    // get remote repositories
    require('simple-git')()
        .listRemote(['--get-url'], function(err, data) {
            if (!err) {
                console.log('Remote url for repository at ' + __dirname + ':');
                console.log(data);
            }
        });
```
