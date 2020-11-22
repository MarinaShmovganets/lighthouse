/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const {resolveModule} = require('../../config/config-helpers.js');
const assert = require('assert').strict;
const path = require('path');
const fs = require('fs');

jest.mock('process', () => ({
  cwd: () => jest.fn(),
}));

describe('resolveModule', () => {
  it('lighthouse and plugins are installed in the same path', () => {
    const pluginName = 'chrome-launcher';
    const pathToPlugin = resolveModule(pluginName, null, 'plugin');
    assert.equal(pathToPlugin, require.resolve(pluginName));
  });

  describe('plugin paths to a file', () => {
    const configFixturePath = path.resolve(__dirname, '../fixtures/config-helpers');

    it('relative to the current working directory', () => {
      const pluginName = 'lighthouse-plugin-config-helper';
      process.cwd = jest.fn(() => configFixturePath);
      const pathToPlugin = resolveModule(pluginName, null, 'plugin');
      assert.equal(pathToPlugin, require.resolve(path.resolve(configFixturePath, pluginName)));
    });

    it('relative to the config path', () => {
      const pluginName = 'lighthouse-plugin-config-helper';
      const pathToPlugin = resolveModule(pluginName, configFixturePath, 'plugin');
      assert.equal(pathToPlugin, require.resolve(path.resolve(configFixturePath, pluginName)));
    });
  });

  describe('globally lighthouse and plugins are installed by npm', () => {
    const pluginsDirectory = path.resolve(__dirname, '../fixtures/config-helpers/');
    const plugins = new Map([
      [
        'plugin-in-working-directory',
        path.join(pluginsDirectory, 'node_modules', 'plugin-in-working-directory'),
      ],
      [
        'plugin-in-config-directory',
        path.join(pluginsDirectory, 'config', 'node_modules', 'plugin-in-config-directory'),
      ],
    ]);

    beforeAll(async () => {
      // create a plugin fixture since the node_modules/ is included in the .gitignore
      const createFixture = async (pluginName, pluginDir) => {
        await fs.promises.mkdir(pluginDir, {recursive: true});
        await fs.promises.writeFile(
          path.join(pluginDir, 'package.json'),
          `{"name": "${pluginName}","private": true,"main": "./${pluginName}.js"}`
        );
        await fs.promises.writeFile(path.join(pluginDir, `${pluginName}.js`), `
module.exports = {
  groups: {
    'new-group': {
      title: 'New Group',
    },
  },
  audits: [
    {path: 'redirects'},
    {path: 'user-timings'},
  ],
  category: {
    title: ${pluginName},
    auditRefs: [
      {id: 'redirects', weight: 1, group: 'new-group'},
    ],
  },
};`);
      };

      for (const [name, dir] of plugins.entries()) {
        await createFixture(name, dir);
      }
    });

    afterAll(async () => {
      for (const dir of plugins.values()) {
        await fs.promises.rmdir(dir, {recursive: true});
      }
    });

    // working directory/
    //   |-- node_modules/
    //   |-- package.json
    it('in current working directory', () => {
      const pluginName = 'plugin-in-working-directory';
      const pluginDir = plugins.get(pluginName);
      process.cwd = jest.fn(() => pluginDir);

      const pathToPlugin = resolveModule(pluginName, null, 'plugin');

      assert.equal(pathToPlugin, require.resolve(pluginName, {paths: [pluginDir]}));
    });

    // working directory/
    //   |-- config directory/
    //     |-- node_modules/
    //     |-- config.js
    //     |-- package.json
    it('relative to the config path', () => {
      const pluginName = 'plugin-in-config-directory';
      const pluginDir = plugins.get(pluginName);
      process.cwd = jest.fn(() => '/usr/bin/node');
      const configDirectory = path.resolve(pluginDir, '../../');

      const pathToPlugin = resolveModule(pluginName, configDirectory, 'plugin');

      assert.equal(pathToPlugin, require.resolve(pluginName, {paths: [configDirectory]}));
    });
  });
});
