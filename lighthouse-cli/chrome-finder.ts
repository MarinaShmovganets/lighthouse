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

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

type Priorities = Array<{regex: RegExp, weight: number}>;

export function darwin() {
  const suffixes = [
    '/Contents/MacOS/Google Chrome Canary',
    '/Contents/MacOS/Google Chrome'
  ];

  const LSREGISTER =
    '/System/Library/Frameworks/CoreServices.framework' +
    '/Versions/A/Frameworks/LaunchServices.framework' +
    '/Versions/A/Support/lsregister';

  const installations: Array<string> = [];

  execSync(
    `${LSREGISTER} -dump` +
    ' | grep -i \'google chrome\\( canary\\)\\?.app$\'' +
    ' | awk \'{$1=""; print $0}\''
  ).toString()
    .split(/\r?\n/)
    .forEach((inst: string) => {
      suffixes.forEach(suffix => {
        const execPath = path.join(inst.trim(), suffix);
        if (canAccess(execPath)) {
          installations.push(execPath);
        }
      });
    });

  const priorities: Priorities = [{
    regex: new RegExp(`^${process.env.HOME}/Applications/.*Chrome.app`),
    weight: 50
  }, {
    regex: new RegExp(`^${process.env.HOME}/Applications/.*Chrome Canary.app`),
    weight: 51
  }, {
    regex: /^\/Applications\/.*Chrome.app/,
    weight: 100
  }, {
    regex: /^\/Applications\/.*Chrome Canary.app/,
    weight: 101
  }, {
    regex: /^\/Volumes\/.*Chrome.app/,
    weight: -2
  }, {
    regex: /^\/Volumes\/.*Chrome Canary.app/,
    weight: -1
  }];

  return sort(installations, priorities);
}

export function linux() {
  const installations: Array<string> = [];
  const suffixes = [
    '/share/applications/chromium-devel.desktop',
    '/share/applications/google-chrome.desktop'
  ];
  const installationFolders = [
    process.env.HOME + '/.local/',
    '/usr/',
  ];
  installationFolders.forEach(folder => {
    suffixes.forEach(suffix => {
      const desktopPath = path.join(folder, suffix);

      if (desktopPath && canAccess(desktopPath)) {
        const execPath = execSync(`grep 'Exec=' ${desktopPath} | awk -F '=' '{print $2}'`)
          .toString()
          .split(/\r?\n/)[0].replace(/(^[^ ]+).*/, '$1');

        if (execPath && canAccess(execPath)) {
          installations.push(execPath);
        }
      }
    })
  });

  const execPath = process.env.LIGHTHOUSE_CHROMIUM_PATH;
  if (execPath && canAccess(execPath)) {
    installations.push(execPath);
  }

  if (!installations.length) {
    throw new Error('The environment variable LIGHTHOUSE_CHROMIUM_PATH must be set to ' +
      'executable of a build of Chromium version 52.0 or later.');
  }

  const priorities: Priorities = [{
    regex: new RegExp(`chrome-wrapper$`),
    weight: 51
  }, {
    regex: new RegExp(`google-chrome-stable$`),
    weight: 50
  }, {
    regex: new RegExp(process.env.LIGHTHOUSE_CHROMIUM_PATH),
    weight: 100
  }];

  return sort(installations, priorities);
}

export function win32() {
  const installations: Array<string> = [];
  const suffixes = [
    '\\Google\\Chrome SxS\\Application\\chrome.exe',
    '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const prefixes = [
    process.env.LOCALAPPDATA,
    process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)']
  ];
  prefixes.forEach(prefix =>
    suffixes.forEach(suffix => {
      const chromePath = path.join(prefix, suffix);
      if (canAccess(chromePath)) {
        installations.push(chromePath);
      }
    })
  );
  return installations;
}

function sort(installations: Array<string>, priorities: Priorities) {
  const defaultPriority = 10;
  return installations
    // assign priorities
    .map((inst: string) => {
      for (const pair of priorities) {
        if (pair.regex.test(inst)) {
          return [inst, pair.weight];
        }
      }
      return [inst, defaultPriority];
    })
    // sort based on priorities
    .sort((a, b) => (<any>b)[1] - (<any>a)[1])
    // remove priority flag
    .map(pair => pair[0]);
}

function canAccess(file: string): Boolean {
  try {
    fs.accessSync(file);
    return true;
  } catch (e) {
    return false;
  }
}
