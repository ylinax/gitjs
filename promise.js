
const {gitExportFactory} = require('./src/git-factory');
const {gitP} = require('./src/lib/runners/promise-wrapped');

module.exports = gitExportFactory(gitP);
