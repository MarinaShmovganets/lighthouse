/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @param {unknown} arr
 * @return {arr is Array<Record<string, unknown>>}
 */
function isArrayOfUnknownObjects(arr) {
  return Array.isArray(arr) && arr.every(isObjectOfUnknownProperties);
}

/**
 * @param {unknown} val
 * @return {val is Record<string, unknown>}
 */
function isObjectOfUnknownProperties(val) {
  return typeof val === 'object' && val !== null;
}

/**
 * A set of methods for extracting and validating a Lighthouse plugin config.
 */
class ConfigPlugin {
  /**
   * Extract and validate the list of AuditDefns added by the plugin (or undefined
   * if no additional audits are being added by the plugin).
   * @param {unknown} auditsJson
   * @param {string} fullPluginName
   * @return {Array<{path: string}>|undefined}
   */
  static _parseAuditsList(auditsJson, fullPluginName) {
    // Plugin audits aren't required (relying on LH default audits) so fall back to [].
    if (auditsJson === undefined) {
      return undefined;
    } else if (!isArrayOfUnknownObjects(auditsJson)) {
      throw new Error(`${fullPluginName} has an invalid audits array.`);
    }

    return auditsJson.map(auditDefnJson => {
      const {path, ...invalidRest} = auditDefnJson;

      const invalidKeys = Object.keys(invalidRest);
      if (invalidKeys.length > 0) {
        const keys = invalidKeys.join(', ');
        throw new Error(`${fullPluginName} has invalid audit properties: [${keys}].`);
      }

      if (typeof path !== 'string') {
        throw new Error(`${fullPluginName} has a missing audit path.`);
      }
      return {
        path,
      };
    });
  }

  /**
   * Extract and validate the list of category AuditRefs added by the plugin.
   * @param {unknown} auditRefsJson
   * @param {string} fullPluginName
   * @return {Array<LH.Config.AuditRefJson>}
   */
  static _parseAuditRefsList(auditRefsJson, fullPluginName) {
    if (!isArrayOfUnknownObjects(auditRefsJson)) {
      throw new Error(`${fullPluginName} has no valid auditsRefs.`);
    }

    return auditRefsJson.map(auditRefJson => {
      const {id, weight, ...invalidRest} = auditRefJson;

      const invalidKeys = Object.keys(invalidRest);
      if (invalidKeys.length > 0) {
        const keys = invalidKeys.join(', ');
        throw new Error(`${fullPluginName} has invalid auditRef properties [${keys}].`);
      }

      if (typeof id !== 'string') {
        throw new Error(`${fullPluginName} has an invalid auditRef id.`);
      }
      if (typeof weight !== 'number') {
        throw new Error(`${fullPluginName} has an invalid auditRef weight.`);
      }

      return {
        id,
        weight,
      };
    });
  }

  /**
   * Extract and validate the category added by the plugin.
   * @param {unknown} categoryJson
   * @param {string} fullPluginName
   * @return {LH.Config.CategoryJson}
   */
  static _parseCategory(categoryJson, fullPluginName) {
    if (!isObjectOfUnknownProperties(categoryJson)) {
      throw new Error(`${fullPluginName} has no valid category.`);
    }

    const {
      title,
      description,
      manualDescription,
      auditRefs: auditRefsJson,
      ...invalidRest
    } = categoryJson;

    const invalidKeys = Object.keys(invalidRest);
    if (invalidKeys.length > 0) {
      const keys = invalidKeys.join(', ');
      throw new Error(`${fullPluginName} has invalid category properties [${keys}].`);
    }

    if (typeof title !== 'string') {
      throw new Error(`${fullPluginName} has an invalid category tile.`);
    }
    if (typeof description !== 'string' && typeof description !== 'undefined') {
      throw new Error(`${fullPluginName} has an invalid category description.`);
    }
    if (typeof manualDescription !== 'string' && typeof manualDescription !== 'undefined') {
      throw new Error(`${fullPluginName} has an invalid category manualDescription.`);
    }
    const auditRefs = ConfigPlugin._parseAuditRefsList(auditRefsJson, fullPluginName);

    return {
      title,
      auditRefs,
      description: description,
      manualDescription: manualDescription,
    };
  }

  /**
   * Extracts and validates a ConfigJson from the provided plugin input, throwing
   * if it deviates from the expected object shape.
   * @param {unknown} pluginJson
   * @param {string} pluginName
   * @return {LH.Config.Json}
   */
  static parsePlugin(pluginJson, pluginName) {
    const fullName = `lighthouse-plugin-${pluginName}`;

    // Clone to prevent modifications or original and to deactivate any live properties.
    pluginJson = JSON.parse(JSON.stringify(pluginJson));
    if (!isObjectOfUnknownProperties(pluginJson)) {
      throw new Error(`${fullName} is not defined as an object.`);
    }

    const {
      audits: pluginAuditsJson,
      category: pluginCategoryJson,
      ...invalidRest
    } = pluginJson;

    // Assert no other properties found.
    const invalidKeys = Object.keys(invalidRest);
    if (invalidKeys.length > 0) {
      throw new Error(`${fullName} has invalid properties [${invalidKeys.join(', ')}].`);
    }

    return {
      audits: ConfigPlugin._parseAuditsList(pluginAuditsJson, fullName),
      categories: {
        pluginName: ConfigPlugin._parseCategory(pluginCategoryJson, fullName),
      },
    };
  }
}

module.exports = ConfigPlugin;
