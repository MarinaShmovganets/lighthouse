'use strict';

const gulp = require('gulp');
const connect = require('gulp-connect');
const lighthouse = require('lighthouse');
const ChromeLauncher = require('lighthouse/lighthouse-cli/chrome-launcher').ChromeLauncher;
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const PORT = 8080;
let launcher;

/**
 * Connect to server
 */
const connectServer = function() {
  return connect.server({
    root: './public',
    livereload: true,
    port: PORT
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
  launcher = new ChromeLauncher();
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
  const lighthouseOptions = {}; // available options - https://github.com/GoogleChrome/lighthouse/#cli-options
  return lighthouse(url, lighthouseOptions, perfConfig)
    .then(handleOk)
    .catch(handleError);
};

/**
 * Handle ok result
 * @param {Object} results - Lighthouse results
 */
const handleOk = function(results) {
  disconnectServer();
  // TODO: use lighthouse results for checking your performance expectations
  /* eslint-disable no-console */
  console.log(results);
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
  launchChrome().then(_ => {
    connectServer();
    return runLighthouse();
  });
});

gulp.task('default', ['lighthouse']);
