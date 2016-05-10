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

/* global Intl */

const Aggregate = require('../src/aggregators/aggregate');
const Formatter = require('../formatters/formatter');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

class ReportGenerator {

  constructor() {
    Handlebars.registerHelper('generated', _ => {
      const options = {
        day: 'numeric', month: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        timeZoneName: 'short'
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      return formatter.format(new Date());
    });

    Handlebars.registerHelper('matches', (a, b, opts) => {
      if (a === b) {
        return opts.fn(this);
      }

      return;
    });

    Handlebars.registerHelper('generateAnchor', shortName => {
      return shortName.toLowerCase().replace(/\s/gim, '');
    });

    Handlebars.registerHelper('getItemValue', value => {
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }

      return value;
    });

    Handlebars.registerHelper('getItemRating', value => {
      if (typeof value === 'boolean') {
        return value ? 'good' : 'poor';
      }

      let rating = 'poor';
      if (value > 0.33) {
        rating = 'average';
      }
      if (value > 0.66) {
        rating = 'good';
      }

      return rating;
    });
  }

  getReportHTML() {
    return fs.readFileSync(path.join(__dirname, './templates/report.html'), 'utf8');
  }

  getReportCSS() {
    return fs.readFileSync(path.join(__dirname, './styles/report.css'), 'utf8');
  }

  getReportJS(inline) {
    // If this is for the extension we won't be able to run JS inline to the page so we will
    // return a path to a JS file that will be copied in from ./scripts/report.js by gulp.
    if (inline) {
      const reportScript =
          fs.readFileSync(path.join(__dirname, './scripts/lighthouse-report.js'), 'utf8');
      return `<script>${reportScript}</script>`;
    }
    return '<script src="/pages/scripts/lighthouse-report.js"></script>';
  }

  _createSections(aggregations) {
    return aggregations.reduce((menu, aggregation) => {
      if (menu.indexOf(aggregation.type.name) === -1) {
        menu.push(aggregation.type.name);
      }
      return menu;
    }, []);
  }

  _createPWAAuditsByTag(aggregations) {
    const items = {};

    aggregations.forEach(aggregation => {
      // We only regroup the PWA aggregations around so ignore
      if (aggregation.type.name !== Aggregate.VALID_TYPES.PWA.name) {
        return;
      }

      aggregation.score.subItems.forEach(subItem => {
        // Create a space for the tag.
        if (!items[subItem.tag]) {
          items[subItem.tag] = {};
        }

        // Then use the name to de-dupe the same audit from different aggregations.
        if (!items[subItem.tag][subItem.name]) {
          items[subItem.tag][subItem.name] = subItem;
        }
      });
    });

    return items;
  }

  generateHTML(results, options) {
    const inline = (options && options.inline) || false;
    const totalAggregations = results.aggregations.reduce((total, aggregation) => {
      if (!aggregation.type.contributesToScore) {
        return total;
      }

      return ++total;
    }, 0);
    const totalScore =
        (results.aggregations.reduce((prev, aggregation) => {
          // Only include the score if the aggregation type says to do so.
          if (!aggregation.type.contributesToScore) {
            return prev;
          }

          return prev + aggregation.score.overall;
        }, 0) / totalAggregations);

    // Ensure the formatter for each extendedInfo is registered.
    results.aggregations.forEach(aggregation => {
      aggregation.score.subItems.forEach(subItem => {
        if (!subItem.extendedInfo) {
          return;
        }

        const formatter = Formatter.getByName(subItem.extendedInfo.formatter).getFormatter('html');
        Handlebars.registerPartial(subItem.name, formatter);
      });
    });

    const template = Handlebars.compile(this.getReportHTML());
    return template({
      url: results.url,
      totalScore: Math.round(totalScore * 100),
      css: this.getReportCSS(inline),
      script: this.getReportJS(inline),
      aggregations: results.aggregations,
      auditsByTag: this._createPWAAuditsByTag(results.aggregations)
    });
  }
}

module.exports = ReportGenerator;
