/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {BaseNode} from './base-node.js';
import {NetworkRequest} from '../network-request.js';

class NetworkNode extends BaseNode {
  /**
   * @param {LH.Artifacts.NetworkRequest} networkRecord
   */
  constructor(networkRecord) {
    super(networkRecord.requestId);
    /** @private */
    this._record = networkRecord;
    /** @private */
    this._priority = networkRecord.priority;
    /**
     * Value 0-1 where 0 is VeryLow and 1 is VeryHigh, weighted over time
     * as a network resource's priority is elevated as marked by ResourceChangePriority
     * trace events.
     */
    this.weightedPriority = 0; // Is really initialized by createGraph.
  }

  get type() {
    return BaseNode.TYPES.NETWORK;
  }

  /**
   * Final priority of the network record.
   */
  get priority() {
    return this._record.priority;
  }

  set priority(priority) {
    this._priority = priority;
  }

  /**
   * @return {number}
   */
  get startTime() {
    return this._record.startTime * 1000 * 1000;
  }

  /**
   * @return {number}
   */
  get endTime() {
    return this._record.endTime * 1000 * 1000;
  }

  /**
   * @return {LH.Artifacts.NetworkRequest}
   */
  get record() {
    return this._record;
  }

  /**
   * @return {string}
   */
  get initiatorType() {
    return this._record.initiator && this._record.initiator.type;
  }

  /**
   * @return {boolean}
   */
  get fromDiskCache() {
    return !!this._record.fromDiskCache;
  }

  /**
   * @return {boolean}
   */
  get isNonNetworkProtocol() {
    return NetworkRequest.isNonNetworkRequest(this._record);
  }


  /**
   * Returns whether this network record can be downloaded without a TCP connection.
   * During simulation we treat data coming in over a network connection separately from on-device data.
   * @return {boolean}
   */
  get isConnectionless() {
    return this.fromDiskCache || this.isNonNetworkProtocol;
  }

  /**
   * @return {boolean}
   */
  hasRenderBlockingPriority() {
    const priority = this.priority;
    const isScript = this._record.resourceType === NetworkRequest.TYPES.Script;
    const isDocument = this._record.resourceType === NetworkRequest.TYPES.Document;
    const isBlockingScript = priority === 'High' && isScript;
    const isBlockingHtmlImport = priority === 'High' && isDocument;
    return priority === 'VeryHigh' || isBlockingScript || isBlockingHtmlImport;
  }

  /**
   * @return {NetworkNode}
   */
  cloneWithoutRelationships() {
    const node = new NetworkNode(this._record);
    node.weightedPriority = this.weightedPriority;
    node.setIsMainDocument(this._isMainDocument);
    return node;
  }
}

export {NetworkNode};
