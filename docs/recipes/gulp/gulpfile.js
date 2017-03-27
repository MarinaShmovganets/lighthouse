'use strict';

const gulp = require('gulp');
const connect = require('gulp-connect');
const lighthouse = require('lighthouse');
const ChromeLauncher = require('lighthouse/lighthouse-cli/chrome-launcher');
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const PORT = 8080;
let launcher;

const connectServer = function() {
  return connect.server({
    root: '../public',
    livereload: true,
    PORT
  });
};

const disconnectServer = function() {
  connect.serverClose();
  launcher.kill();
};

const launchChrome = function() {
  launcher = new (ChromeLauncher.ChromeLauncher || ChromeLauncher)();
  return launcher.isDebuggerReady()
    .catch(() => {
      return launcher.run();
    });
};

const runLighthouse = function() {
  const url = `http://localhost:${PORT}/index.html`;
  const ligthouseOptions = {}; // available options - https://github.com/GoogleChrome/lighthouse/#cli-options
  lighthouse(url, ligthouseOptions, perfConfig)
    .then(handleOk)
    .catch(handleError);
};

const handleOk = function(results) {
  disconnectServer();
  // TODO: use lighthouse results for checking your performance expectations
  process.exit(0);
};

const handleError = function() {
  disconnectServer();
  process.exit(1);
};

gulp.task('lighthouse', function() {
  Promise.resolve(launchChrome()).then(_ => {
    connectServer();
    runLighthouse();
  });
});

gulp.task('default', ['lighthouse']);
