const exec = require('child_process').exec;

var cwd = require('path').resolve();
const corePath = `${cwd}/lighthouse-core`;
const extPath = `${cwd}/lighthouse-extension`;

const npm = 'npm --prefix';
const cmd = `${npm} ${corePath} install ${corePath} && ${npm} ${extPath} install ${extPath}`;

console.log(cmd);
console.log('...');

const child = exec(cmd,
  function(error, stdout, stderr) {
    process.stderr.write(stderr);
    process.stdout.write(stdout);
    if (stdout.length === 0) {
      console.log('The full install may not have completed.');
      console.log('To manually install child dependencies:');
      console.log(`    ${cmd}`);
    }
  });
child.stderr.pipe(process.stderr);
child.stdout.pipe(process.stdout);
