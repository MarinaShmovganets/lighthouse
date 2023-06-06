/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @type {import('./index.js')['default']} */
const lighthouse = async function lighthouse(...args) {
  const {default: lighthouse} = await import('./index.js');
  return lighthouse(...args);
};

/** @type {import('./index.js')['legacyNavigation']} */
const legacyNavigation = async function legacyNavigation(...args) {
  const {legacyNavigation} = await import('./index.js');
  return legacyNavigation(...args);
};

/** @type {import('./index.js')['startFlow']} */
const startFlow = async function startFlow(...args) {
  const {startFlow} = await import('./index.js');
  return startFlow(...args);
};

/** @type {import('./index.js')['navigation']} */
const navigation = async function navigation(...args) {
  const {navigation} = await import('./index.js');
  return navigation(...args);
};

/** @type {import('./index.js')['startTimespan']} */
const startTimespan = async function startTimespan(...args) {
  const {startTimespan} = await import('./index.js');
  return startTimespan(...args);
};

/** @type {import('./index.js')['snapshot']} */
const snapshot = async function snapshot(...args) {
  const {snapshot} = await import('./index.js');
  return snapshot(...args);
};

/** @type {import('./index.js')['generateReport']} */
const generateReport = async function generateReport(...args) {
  const {generateReport} = await import('./index.js');
  return generateReport(...args);
};

/** @type {import('./index.js')['auditFlowArtifacts']} */
const auditFlowArtifacts = async function auditFlowArtifacts(...args) {
  const {auditFlowArtifacts} = await import('./index.js');
  return auditFlowArtifacts(...args);
};

/** @type {import('./index.js')['getAuditList']} */
const getAuditList = async function getAuditList(...args) {
  const {getAuditList} = await import('./index.js');
  return getAuditList(...args);
};

/**
 * @return {Promise<import('./index.js')['traceCategories']>} 
 */
const getTraceCategories = async function getTraceCategories() {
  const {traceCategories} = await import('./index.js');

  return traceCategories
};

/**
 * @return {Promise<import('./index.js')['Audit']>} 
 */
const getAudit = async function getAudit() {
  const {Audit} = await import('./index.js');
  return Audit
};

/**
 * @return {Promise<import('./index.js')['Gatherer']>} 
 */
const getGatherer = async function getGatherer() {
  const {Gatherer} = await import('./index.js');
  return Gatherer
};

/**
 * @return {Promise<import('./index.js')['NetworkRecords']>} 
 */
const getNetworkRecords = async function getNetworkRecords() {
  const {NetworkRecords} = await import('./index.js');
  return NetworkRecords
};

/**
 * @return {Promise<import('./index.js')['desktopConfig']>} 
 */
const getDesktopConfig = async function getDesktopConfig() {
  const {desktopConfig} = await import('./index.js');
  return desktopConfig
};

/**
 * @return {Promise<import('./index.js')['defaultConfig']>} 
 */
const getDefaultConfig = async function getDefaultConfig() {
  const {defaultConfig} = await import('./index.js');

  return defaultConfig
};

/**
 * @return {Promise<import('./index.js')>} 
 */
const asyncImport = async function asyncImport() {
  const esm = await import('./index.js');
  return esm
};

module.exports = lighthouse;
module.exports.asyncImport = asyncImport
module.exports.getAudit = getAudit;
module.exports.getGatherer = getGatherer;
module.exports.getNetworkRecords = getNetworkRecords;

module.exports.getDesktopConfig = getDesktopConfig;
module.exports.getDefaultConfig = getDefaultConfig;

module.exports.legacyNavigation = legacyNavigation;
module.exports.startFlow = startFlow;
module.exports.navigation = navigation;
module.exports.startTimespan = startTimespan;
module.exports.snapshot = snapshot;
module.exports.generateReport = generateReport;
module.exports.auditFlowArtifacts = auditFlowArtifacts;
module.exports.getAuditList = getAuditList;
module.exports.getTraceCategories = getTraceCategories;
