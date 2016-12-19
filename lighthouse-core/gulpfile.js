/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const del = require('del');
const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const runSequence = require('run-sequence');
const browserify = require('browserify');

const $ = gulpLoadPlugins();

const DIST_FOLDER = 'report/dist';

gulp.task('browserify', () => {
  return gulp.src([
    'report/scripts/report.js'
  ], {read: false})
    .pipe($.tap(file => {
      const bundle = browserify(file.path, {debug: false})
        .plugin('tsify', { // Note: tsify needs to come before transforms.
          allowJs: true,
          target: 'es5',
          diagnostics: true,
          pretty: true,
          removeComments: true
        })
        .transform('brfs')
        .bundle();

      file.contents = bundle; // Inject transformed content back the gulp pipeline.
    }))
    .pipe(gulp.dest(`${DIST_FOLDER}/scripts`));
});

gulp.task('compile', ['browserify'], () => {
  return gulp.src([`${DIST_FOLDER}/scripts/report.js`])
    .pipe($.uglify()) // minify.
    .pipe(gulp.dest(`${DIST_FOLDER}/scripts`));
});

gulp.task('clean', () => {
  return del([DIST_FOLDER]).then(paths =>
      paths.forEach(path => console.log('deleted: ' + path)));
});

gulp.task('default', ['clean'], cb => {
  runSequence('compile', cb);
});
