/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const NetworkRequest = {
  /** @type {LH.Util.SelfMap<LH.Crdp.Network.ResourceType>} */
  TYPES: {
    XHR: 'XHR',
    Fetch: 'Fetch',
    EventSource: 'EventSource',
    Script: 'Script',
    Stylesheet: 'Stylesheet',
    Image: 'Image',
    Media: 'Media',
    Font: 'Font',
    Document: 'Document',
    TextTrack: 'TextTrack',
    WebSocket: 'WebSocket',
    Other: 'Other',
    Manifest: 'Manifest',
    SignedExchange: 'SignedExchange',
    Ping: 'Ping',
    Preflight: 'Preflight',
    CSPViolationReport: 'CSPViolationReport',
    Prefetch: 'Prefetch',
  },
};

export {
  NetworkRequest,
};
