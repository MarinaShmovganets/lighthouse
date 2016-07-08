const exec = require('child_process').exec;

var cwd = require('path').resolve()

const corePath = `${cwd}/lighthouse-core`;
const extPath = `${cwd}/lighthouse-extension`;
const cmd = `npm --prefix ${corePath} install ${corePath} && npm --prefix ${extPath} install ${extPath}`;

console.log(cmd);
console.log('...');

console.log(process.cwd());

const child = exec(cmd);
child.stderr.pipe(process.stderr);
child.stdout.pipe(process.stdout);
