/**
 * Copyright 2017 Google Inc. All rights reserved.
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

/* globals self, Util */

class CategoryRenderer {
  /**
   * @param {!DOM} dom
   * @param {!DetailsRenderer} detailsRenderer
   */
  constructor(dom, detailsRenderer) {
    /** @private {!DOM} */
    this._dom = dom;
    /** @private {!DetailsRenderer} */
    this._detailsRenderer = detailsRenderer;
    /** @private {!Document|!Element} */
    this._templateContext = this._dom.document();
  }

  /**
   * @param {!ReportRenderer.AuditJSON} audit
   * @return {!Element}
   */
  _renderAuditScore(audit) {
    const tmpl = this._dom.cloneTemplate('#tmpl-lh-audit-score', this._templateContext);

    const scoringMode = audit.result.scoringMode;
    const description = audit.result.helpText;
    let title = audit.result.description;

    if (audit.result.displayValue) {
      title += `:  ${audit.result.displayValue}`;
    }
    if (audit.result.optimalValue) {
      title += ` (target: ${audit.result.optimalValue})`;
    }

    if (audit.result.debugString) {
      const debugStrEl = tmpl.appendChild(this._dom.createElement('div', 'lh-debug'));
      debugStrEl.textContent = audit.result.debugString;
    }

    // Append audit details to header section so the entire audit is within a <details>.
    const header = /** @type {!HTMLDetailsElement} */ (this._dom.find('.lh-score__header', tmpl));
    if (audit.result.details) {
      header.appendChild(this._detailsRenderer.render(audit.result.details));
    }

    const scoreEl = this._dom.find('.lh-score', tmpl);
    if (audit.result.informative) {
      scoreEl.classList.add('lh-score--informative');
    }

    return this._populateScore(tmpl, audit.score, scoringMode, title, description);
  }

  /**
   * @param {!DocumentFragment|!Element} element DOM node to populate with values.
   * @param {number} score
   * @param {string} scoringMode
   * @param {string} title
   * @param {string} description
   * @return {!Element}
   */
  _populateScore(element, score, scoringMode, title, description) {
    // Fill in the blanks.
    const valueEl = this._dom.find('.lh-score__value', element);
    valueEl.textContent = Util.formatNumber(score);
    valueEl.classList.add(`lh-score__value--${Util.calculateRating(score)}`,
        `lh-score__value--${scoringMode}`);

    this._dom.find('.lh-score__title', element).textContent = title;
    this._dom.find('.lh-score__description', element)
        .appendChild(this._dom.createSpanFromMarkdown(description));

    return /** @type {!Element} **/ (element);
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @return {!Element}
   */
  _renderCategoryScore(category) {
    const tmpl = this._dom.cloneTemplate('#tmpl-lh-category-score', this._templateContext);
    const score = Math.round(category.score);

    const gaugeContainerEl = this._dom.find('.lh-score__gauge', tmpl);
    const gaugeEl = this.renderScoreGauge(category);
    gaugeContainerEl.appendChild(gaugeEl);

    return this._populateScore(tmpl, score, 'numeric', category.name, category.description);
  }

  /**
   * @param {!ReportRenderer.AuditJSON} audit
   * @return {!Element}
   */
  _renderAudit(audit) {
    const element = this._dom.createElement('div', 'lh-audit');
    element.appendChild(this._renderAuditScore(audit));
    return element;
  }

  /**
   * @param {!ReportRenderer.AuditJSON} audit
   * @param {number} scale
   * @return {!Element}
   */
  _renderPerfHintAudit(audit, scale) {
    const extendedInfo = /** @type {!CategoryRenderer.PerfHintExtendedInfo}
        */ (audit.result.extendedInfo);
    if (!extendedInfo.value.wastedMs) return this._dom.createElement('span');

    const element = this._dom.createElement('details', [
      'lh-perf-hint',
      `lh-perf-hint--${Util.calculateRating(audit.score)}`,
      'lh-expandable-details',
    ].join(' '));
    const summary = this._dom.createElement('summary', 'lh-perf-hint__summary ' +
        'lh-expandable-details__summary');
    element.appendChild(summary);

    const titleEl = this._dom.createElement('div', 'lh-perf-hint__title');
    titleEl.textContent = audit.result.description;
    summary.appendChild(titleEl);

    const sparklineContainerEl = this._dom.createElement('div', 'lh-perf-hint__sparkline');
    const sparklineEl = this._dom.createElement('div', 'lh-sparkline');
    const sparklineBarEl = this._dom.createElement('div', 'lh-sparkline__bar');
    sparklineBarEl.style.width = extendedInfo.value.wastedMs / scale * 100 + '%';
    sparklineEl.appendChild(sparklineBarEl);
    sparklineContainerEl.appendChild(sparklineEl);
    summary.appendChild(sparklineContainerEl);

    const statsEl = this._dom.createElement('div', 'lh-perf-hint__stats');
    const statsMsEl = this._dom.createElement('div', 'lh-perf-hint__primary-stat');
    statsMsEl.textContent = extendedInfo.value.wastedMs.toLocaleString() + ' ms';
    statsEl.appendChild(statsMsEl);
    summary.appendChild(statsEl);

    const arrowEl = this._dom.createElement('div', 'lh-toggle-arrow', {title: 'See resources'});
    summary.appendChild(arrowEl);

    if (extendedInfo.value.wastedKb) {
      const statsKbEl = this._dom.createElement('div', 'lh-perf-hint__secondary-stat');
      statsKbEl.textContent = extendedInfo.value.wastedKb.toLocaleString() + ' KB';
      statsEl.appendChild(statsKbEl);
    }

    const descriptionEl = this._dom.createElement('div', 'lh-perf-hint__description');
    descriptionEl.textContent = audit.result.helpText;
    element.appendChild(descriptionEl);

    if (audit.result.details) {
      element.appendChild(this._detailsRenderer.render(audit.result.details));
    }
    return element;
  }

  /**
   * @param {!Array<!ReportRenderer.AuditJSON>} audits
   * @param {!ReportRenderer.GroupJSON} group
   * @param {function(!ReportRenderer.AuditJSON): !Element=} renderAudit
   * @return {!Element}
   */
  _renderAuditGroup(audits, group, renderAudit) {
    if (!renderAudit) {
      renderAudit = this._renderAudit.bind(this);
    }

    const auditGroupElem = this._dom.createElement('details',
          'lh-audit-group lh-expandable-details');
    const auditGroupHeader = this._dom.createElement('div',
          'lh-audit-group__header lh-expandable-details__header');
    auditGroupHeader.textContent = group.title;

    const auditGroupDescription = this._dom.createElement('div', 'lh-audit-group__description');
    auditGroupDescription.textContent = group.description;

    const auditGroupSummary = this._dom.createElement('summary',
          'lh-audit-group__summary lh-expandable-details__summary');
    const auditGroupArrow = this._dom.createElement('div', 'lh-toggle-arrow', {
      title: 'See audits',
    });
    auditGroupSummary.appendChild(auditGroupHeader);
    auditGroupSummary.appendChild(auditGroupArrow);

    auditGroupElem.appendChild(auditGroupSummary);
    auditGroupElem.appendChild(auditGroupDescription);
    audits.forEach(audit => auditGroupElem.appendChild(renderAudit(audit)));
    return auditGroupElem;
  }

  /**
   * @param {!Array<!Element>} elements
   * @return {!Element}
   */
  _renderPassedAuditsSection(elements) {
    const passedElem = this._dom.createElement('details', 'lh-passed-audits');
    const passedSummary = this._dom.createElement('summary', 'lh-passed-audits-summary');
    passedElem.appendChild(passedSummary);
    passedSummary.textContent = `View ${elements.length} passed items`;
    elements.forEach(elem => passedElem.appendChild(elem));
    return passedElem;
  }

  /**
   * @param {!Document|!Element} context
   */
  setTemplateContext(context) {
    this._templateContext = context;
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @return {!DocumentFragment}
   */
  renderScoreGauge(category) {
    const tmpl = this._dom.cloneTemplate('#tmpl-lh-gauge', this._templateContext);
    this._dom.find('.lh-gauge__wrapper', tmpl).href = `#${category.id}`;
    this._dom.find('.lh-gauge__label', tmpl).textContent = category.name;

    const score = Math.round(category.score);
    const fillRotation = Math.floor((score / 100) * 180);

    const gauge = this._dom.find('.lh-gauge', tmpl);
    gauge.setAttribute('data-progress', score); // .dataset not supported in jsdom.
    gauge.classList.add(`lh-gauge--${Util.calculateRating(score)}`);

    this._dom.findAll('.lh-gauge__fill', gauge).forEach(el => {
      el.style.transform = `rotate(${fillRotation}deg)`;
    });

    this._dom.find('.lh-gauge__mask--full', gauge).style.transform =
        `rotate(${fillRotation}deg)`;
    this._dom.find('.lh-gauge__fill--fix', gauge).style.transform =
        `rotate(${fillRotation * 2}deg)`;
    this._dom.find('.lh-gauge__percentage', gauge).textContent = score;

    return tmpl;
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @param {!Object<string, !ReportRenderer.GroupJSON>} groups
   * @return {!Element}
   */
  render(category, groups) {
    switch (category.id) {
      case 'performance':
        return this._renderPerformanceCategory(category, groups);
      case 'accessibility':
        return this._renderAccessibilityCategory(category, groups);
      default:
        return this._renderDefaultCategory(category);
    }
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @return {!Element}
   */
  _renderDefaultCategory(category) {
    const element = this._dom.createElement('div', 'lh-category');
    element.id = category.id;
    element.appendChild(this._renderCategoryScore(category));

    const passedAudits = category.audits.filter(audit => audit.score === 100);
    const nonPassedAudits = category.audits.filter(audit => !passedAudits.includes(audit));

    for (const audit of nonPassedAudits) {
      element.appendChild(this._renderAudit(audit));
    }

    // Don't create a passed section if there are no passed.
    if (!passedAudits.length) {
      return element;
    }

    const passedElements = passedAudits.map(audit => this._renderAudit(audit));
    const passedElem = this._renderPassedAuditsSection(passedElements);
    element.appendChild(passedElem);
    return element;
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @param {!Object<string, !ReportRenderer.GroupJSON>} groups
   * @return {!Element}
   */
  _renderPerformanceCategory(category, groups) {
    const element = this._dom.createElement('div', 'lh-category');
    element.id = category.id;
    element.appendChild(this._renderCategoryScore(category));

    const metricAudits = category.audits.filter(audit => audit.group === 'perf-metric');
    const metricAuditsEl = this._renderAuditGroup(metricAudits, groups['perf-metric']);
    metricAuditsEl.open = true;
    element.appendChild(metricAuditsEl);

    const hintAudits = category.audits
        .filter(audit => audit.group === 'perf-hint' && audit.score < 100)
        .sort((auditA, auditB) => auditB.result.rawValue - auditA.result.rawValue);
    let maxWaste = 0;
    hintAudits.forEach(audit => maxWaste = Math.max(maxWaste, audit.result.rawValue));

    const scale = Math.ceil(maxWaste / 1000) * 1000;
    const hintAuditsEl = this._renderAuditGroup(hintAudits, groups['perf-hint'],
        audit => this._renderPerfHintAudit(audit, scale));
    hintAuditsEl.open = hintAudits.some(audit => audit.score < 100);
    element.appendChild(hintAuditsEl);

    const infoAudits = category.audits
        .filter(audit => audit.group === 'perf-info' && audit.score < 100);
    const infoAuditsEl = this._renderAuditGroup(infoAudits, groups['perf-info']);
    infoAuditsEl.open = hintAudits.some(audit => audit.score < 100);
    element.appendChild(infoAuditsEl);

    const passedElements = category.audits
        .filter(audit => audit.group !== 'perf-metric' && audit.score === 100)
        .map(audit => this._renderAudit(audit));

    if (!passedElements.length) return element;

    const passedElem = this._renderPassedAuditsSection(passedElements);
    element.appendChild(passedElem);
    return element;
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @param {!Object<string, !ReportRenderer.GroupJSON>} groupDefinitions
   * @return {!Element}
   */
  _renderAccessibilityCategory(category, groupDefinitions) {
    const element = this._dom.createElement('div', 'lh-category');
    element.id = category.id;
    element.appendChild(this._renderCategoryScore(category));

    const auditsGroupedByGroup = /** @type {!Object<string,
        {passed: !Array<!ReportRenderer.AuditJSON>,
        failed: !Array<!ReportRenderer.AuditJSON>}>} */ ({});
    category.audits.forEach(audit => {
      const groupId = audit.group;
      const groups = auditsGroupedByGroup[groupId] || {passed: [], failed: []};

      if (audit.score === 100) {
        groups.passed.push(audit);
      } else {
        groups.failed.push(audit);
      }

      auditsGroupedByGroup[groupId] = groups;
    });

    const passedElements = /** @type {!Array<!Element>} */ ([]);
    Object.keys(auditsGroupedByGroup).forEach(groupId => {
      const group = groupDefinitions[groupId];
      const groups = auditsGroupedByGroup[groupId];
      if (groups.failed.length) {
        const auditGroupElem = this._renderAuditGroup(groups.failed, group);
        auditGroupElem.open = true;
        element.appendChild(auditGroupElem);
      }

      if (groups.passed.length) {
        const auditGroupElem = this._renderAuditGroup(groups.passed, group);
        passedElements.push(auditGroupElem);
      }
    });

    // don't create a passed section if there are no passed
    if (!passedElements.length) return element;

    const passedElem = this._renderPassedAuditsSection(passedElements);
    element.appendChild(passedElem);
    return element;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CategoryRenderer;
} else {
  self.CategoryRenderer = CategoryRenderer;
}


/**
 * @typedef {{
 *     value: {
 *       wastedMs: (number|undefined),
 *       wastedKb: (number|undefined),
 *     }
 * }}
 */
CategoryRenderer.PerfHintExtendedInfo; // eslint-disable-line no-unused-expressions
