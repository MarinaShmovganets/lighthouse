const exec = require('child_process').exec;

const corePath = './lighthouse-core';
const extPath = './lighthouse-extension';
const cmd = `npm --prefix ${corePath} install ${corePath} && npm --prefix ${extPath} install ${extPath}`;

console.log(cmd);
console.log('...');

exec(cmd,
  function(error, stdout) {
    console.log(stdout);
    if (error !== null) {
      console.log('exec error: ' + error);
    }
  }).stderr.pipe(process.stderr);
