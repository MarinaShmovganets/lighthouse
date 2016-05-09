/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const fs = require('fs');
const jsdom = require('jsdom');
const mkdirp = require('mkdirp');
const path = require('path');
const paths = {};

function process(src) {
  const html = fs.readFileSync(src);
  const license = /<!--(.*\n)+-->/im;
  let dest = src.replace(/\.html$/, '.js');

  jsdom.env({
    html: html,
    done: function(err, window) {
      if (err) {
        throw err;
      }

      const imports = window.document.querySelectorAll('link[rel="import"]');
      const scripts = window.document.querySelectorAll('script');
      const licenseContent = license.exec(html);
      let scriptsContent = '';

      if (licenseContent) {
        scriptsContent += licenseContent[0]
            .replace(/<!--/, '/**')
            .replace(/-->/, '**/\n\n');
      }

      for (var i = 0; i < imports.length; i++) {
        let importPath = imports[i].getAttribute('href');
        importPath = importPath.replace(/^\//, './third_party/');

        const from = path.dirname(dest);
        const to = importPath.replace(/html$/, 'js');
        let relativePath = path.relative(from, to);

        if (relativePath[0] !== '.') {
          relativePath = './' + relativePath;
        }

        scriptsContent += 'require("' + relativePath + '");\n';

        // Recursively process each import.
        if (paths[importPath]) {
          continue;
        }

        paths[importPath] = true;
        process(importPath);
      }

      for (let s = 0; s < scripts.length; s++) {
        let script = scripts[s];

        script = script.textContent;

        script = script.replace(/tr\.exportTo/, 'global.tr.exportTo');
        script = script.replace(/var global = this;/, '');
        script = script.replace(/this.tr =/, 'global.tr =');
        scriptsContent += script;
      }

      dest = dest.replace(/\.\/third_party\/tracing/, '');
      dest = path.resolve('./third_party/tracing-js-converted/' + dest);

      const destFolder = path.dirname(dest);
      mkdirp(destFolder, function(err) {
        if (err) {
          throw new Error(`Failed to create folder: ${destFolder}`);
        }

        fs.writeFile(dest, scriptsContent, 'utf8');
      });
    }
  });
}

process('convert-start.html');
