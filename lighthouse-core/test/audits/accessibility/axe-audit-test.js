/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const AxeAudit = require('../../../audits/accessibility/axe-audit.js');
const assert = require('assert');

/* eslint-env jest */

describe('Accessibility: axe-audit', () => {
  describe('audit()', () => {
    it('generates audit output using subclass meta', () => {
      class FakeA11yAudit extends AxeAudit {
        static get meta() {
          return {
            id: 'fake-aria-fail',
            title: 'You have an aria-* issue',
            requiredArtifacts: ['Accessibility'],
          };
        }
      }
      const artifacts = {
        Accessibility: {
          violations: [{
            id: 'fake-aria-fail',
            nodes: [{}],
            help: 'http://example.com/',
          }],
        },
      };

      const output = FakeA11yAudit.audit(artifacts);
      assert.equal(output.score, 0);
    });

    it('considers error-free incomplete cases without node matches as audit pass', () => {
      class FakeA11yAudit extends AxeAudit {
        static get meta() {
          return {
            id: 'fake-incomplete-fail',
            title: 'Example title',
            requiredArtifacts: ['Accessibility'],
          };
        }
      }
      const artifacts = {
        Accessibility: {
          incomplete: [{
            id: 'fake-incomplete-fail',
            nodes: [],
            help: 'http://example.com/',
          }],
        },
      };

      const output = FakeA11yAudit.audit(artifacts);
      assert.equal(output.score, 1);
    });

    it('considers error-free incomplete cases with node matches as audit failure', () => {
      class FakeA11yAudit extends AxeAudit {
        static get meta() {
          return {
            id: 'fake-incomplete-fail',
            title: 'Example title',
            requiredArtifacts: ['Accessibility'],
          };
        }
      }
      const artifacts = {
        Accessibility: {
          incomplete: [{
            id: 'fake-incomplete-fail',
            nodes: [{}],
            help: 'http://example.com/',
          }],
        },
      };

      const output = FakeA11yAudit.audit(artifacts);
      assert.equal(output.score, 0);
    });
  });
});
