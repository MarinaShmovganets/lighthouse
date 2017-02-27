'use strict';

const gulp = require('gulp');
const handlebars = require('gulp-handlebars');
const declare = require('gulp-declare');
const concat = require('gulp-concat');
const config = require('./config');

module.exports = function() {
  return gulp.src(config.report)
    .pipe(handlebars({
      handlebars: require('handlebars')
    }))
    .pipe(declare({
      namespace: 'report.template',
      noRedeclare: true, // Avoid duplicate declarations
    }))
    .pipe(concat('report-templates.js'))
    .pipe(gulp.dest(config.reportDist));
};
