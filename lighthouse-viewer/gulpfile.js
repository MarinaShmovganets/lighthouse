/**
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
const gutil = require('gulp-util');
const runSequence = require('run-sequence');
const gulp = require('gulp');
const browserify = require('browserify');
const eslint = require('gulp-eslint');
const tap = require('gulp-tap');

gulp.task('lint', () => {
  return gulp.src([
    'app/src/**/*.js',
    'gulpfile.js'
  ])
  .pipe(eslint())
  .pipe(eslint.format());
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
  .pipe(gulp.dest('dist/images'));
});

gulp.task('css', () => {
  return gulp.src([
    'app/styles/**/*.css',
    '../lighthouse-core/report/styles/report.css'
  ])
  .pipe(gulp.dest('dist/styles'));
});

gulp.task('html', () => {
  return gulp.src('app/*.html')
  .pipe(gulp.dest('dist'));
});

function applyBrowserifyTransforms(bundle) {
  // Fix an issue with imported speedline code that doesn't brfs well.
  return bundle.transform('../lighthouse-extension/fs-transform', {
    global: true
  })
  // Transform the fs.readFile etc, but do so in all the modules.
  .transform('brfs', {
    global: true
  });
}

gulp.task('browserify', () => {
  return gulp.src([
    'app/src/main.js'
  ], {read: false})
    .pipe(tap(file => {
      let bundle = browserify(file.path);
      bundle = applyBrowserifyTransforms(bundle);

      // Inject the new browserified contents back into our gulp pipeline
      file.contents = bundle.bundle();
    }))
    .pipe(gulp.dest('dist/src'));
});

gulp.task('clean', () => {
  return del(['.tmp', 'dist']).then(paths =>
    paths.forEach(path => gutil.log('deleted:', gutil.colors.blue(path)))
  );
});

gulp.task('watch', ['lint', 'browserify', 'html', 'images', 'css'], () => {
  gulp.watch([
    'app/styles/**/*.css',
    '../lighthouse-core/report/styles/**/*.css'
  ]).on('change', () => {
    runSequence('css');
  });

  gulp.watch([
    'app/index.html'
  ]).on('change', () => {
    runSequence('html');
  });

  gulp.watch([
    'app/src/**/*.js',
    '../lighthouse-core/**/*.js'
  ], ['browserify']);
});

gulp.task('build', cb => {
  runSequence(
    'lint', 'browserify',
    ['html', 'images', 'css'], cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
