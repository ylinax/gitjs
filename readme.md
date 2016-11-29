# Simple Git

A light weight interface for running git commands in any [node.js](http://nodejs.org) application.

# Installation

Easiest through [npm](http://npmjs.org): `npm install simple-git`

# Dependencies

Relies on [git](http://git-scm.com/downloads) already having been installed on the system, and that it can be called
using the command `git`.

# Usage

Include into your app using:

    var simpleGit = require('simple-git')( workingDirPath );

where the `workingDirPath` is optional, defaulting to the current directory.

Use `simpleGit` by chaining any of its functions together. Each function accepts an optional final argument which will
be called when that step has been completed. When it is called it has two arguments - firstly an error object (or null
when no error occurred) and secondly the data generated by that call.

`.clone(repoPath, localPath, handlerFn)` clone a remote repo at `repoPath` to a local directory at `localPath`

`.diff(options, handlerFn)` get the diff of the current repo compared to the last commit with a set of options supplied as a string

`.diff(handlerFn)` get the diff for all file in the current repo compared to the last commit

`.pull(remote, branch, handlerFn)` pull all updates from the repo ('origin'/'master')

`.fetch(remote, branch, handlerFn)` update the local working copy database with changes from a remote repo

`.fetch(handlerFn)` update the local working copy database with changes from the default remote repo and branch

`.tags(handlerFn)` list all tags

`.checkout(checkoutWhat, handlerFn)` checks out the supplied tag, revision or branch

`.checkoutBranch(branchName, startPoint, handlerFn)` checks out a new branch from the supplied start point

`.checkoutLocalBranch(branchName, handlerFn)` checks out a new local branch

`.checkoutLatestTag(handlerFn)` convenience method to pull then checkout the latest tag

`.add([fileA, ...], handlerFn)` adds one or more files to be under source control

`.commit(message, handlerFn)` commits changes in the current working directory with the supplied message

`.commit(message, [fileA, ...], handlerFn)` commits changes on the named files with the supplied message

`.push(remote, branch, handlerFn)` pushes to a named remote and named branch

`.rm([fileA, ...], handlerFn)` removes any number of files from source control

`.rmKeepLocal([fileA, ...], handlerFn)` removes files from source control but leaves them on disk

`.addRemote(name, repo, handlerFn)` adds a new named remote to be tracked as `name` at the path `repo`

`.removeRemote(name, handlerFn)` removes the named remote

`.listRemote([args], handlerFn)` lists remote repositories - there are so many optional arguments in the underlying
`git ls-remote` call, just supply any you want to use as the optional `args` string.


# Examples

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


