'use strict';

const gulp = require('gulp');
const connect = require('gulp-connect');
const lighthouse = require('lighthouse');
const ChromeLauncher = require('lighthouse/lighthouse-cli/chrome-launcher');
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const PORT = 8080;
let launcher;

/**
 * Connect to server
 */
const connectServer = function() {
  return connect.server({
    root: '../public',
    livereload: true,
    PORT
  });
};

/**
 * Disconnect server
 */
const disconnectServer = function() {
  connect.serverClose();
  launcher.kill();
};

/**
 * Launch chrome
 */
const launchChrome = function() {
  launcher = new (ChromeLauncher.ChromeLauncher || ChromeLauncher)();
  return launcher.isDebuggerReady()
    .catch(() => {
      return launcher.run();
    });
};

/**
 * Run lighthouse
 */
const runLighthouse = function() {
  const url = `http://localhost:${PORT}/index.html`;
  const ligthouseOptions = {}; // available options - https://github.com/GoogleChrome/lighthouse/#cli-options
  lighthouse(url, ligthouseOptions, perfConfig)
    .then(handleOk)
    .catch(handleError);
};

/**
 * Handle ok result
 * @param {Object} results - Lighthouse results
 */
const handleOk = function() {
  disconnectServer();
  // TODO: use lighthouse results for checking your performance expectations
  process.exit(0);
};

/**
 * Handle error
 */
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
