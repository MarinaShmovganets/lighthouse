'use strict';

const gulp = require('gulp');
const compileReport = require('./gulp/compile-report');
const compilePartials = require('./gulp/compile-partials');

gulp.task('compileReport', compileReport);
gulp.task('compilePartials', compilePartials);

gulp.task('compile-templates', ['compileReport', 'compilePartials']);

gulp.task('default', 'compile-templates');
