'use strict';

const gulp = require('gulp');
const connect = require('gulp-connect');
const lighthouse = require('../../../lighthouse-core');
const perfConfig = require('../../../lighthouse-core/config/perf.json');
const port = 8080;

const connectServer = function() {
  return connect.server({
    root: '../public',
    livereload: true,
    port: port
  });
};

function handleOk() {
  connect.serverClose();
  process.exit(0);
}

function handleError() {
  process.exit(1);
}

gulp.task('lighthouse', function() {
  connectServer();

  const url = `http://localhost:${port}/index.html`;
  lighthouse(url, {}, perfConfig)
    .then(_ => handleOk)
    .catch(_ => handleError);
});

gulp.task('default', ['lighthouse']);
