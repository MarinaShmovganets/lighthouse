#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

if (process.argv.length !== 4) {
  console.error('Usage $0: <input file> <output file>');
  process.exit(1);
}

const inputDevtoolsLogPath = path.resolve(process.cwd(), process.argv[2]);
const outputDevtoolsLogPath = path.resolve(process.cwd(), process.argv[3]);
const inputDevtoolsLogRaw = fs.readFileSync(inputDevtoolsLogPath, 'utf8');
/** @type {LH.DevtoolsLog} */
const inputDevtoolsLog = JSON.parse(inputDevtoolsLogRaw);

const includedHeaders = new Set([
  // Request headers
  'accept',
  'accept-encoding',
  'accept-ranges',
  // Response headers
  'status',
  'content-length',
  'content-type',
  'content-encoding',
  'content-range',
  'etag',
  'cache-control',
  'last-modified',
  'link',
  'x-robots-tag',
]);

/** @param {any} headers */
function cleanHeaders(headers) {
  if (!headers) return;

  for (const [k, v] of Object.entries(headers)) {
    if (!includedHeaders.has(k.toLowerCase())) headers[k] = undefined;
  }
}

/** @param {{url: string}} obj */
function cleanDataURI(obj) {
  obj.url = obj.url.replace(/^(data:.*?base64,).*/, '$1FILLER');
}

/** @param {LH.Crdp.Network.ResponseReceivedEvent['response']} [response] */
function cleanResponse(response) {
  if (!response) return;
  cleanDataURI(response);
  cleanHeaders(response.requestHeaders);
  cleanHeaders(response.headers);
  response.securityDetails = undefined;
  response.headersText = undefined;
  response.requestHeadersText = undefined;

  /** @type {any} */
  const timing = response.timing || {}
  for (const [k, v] of Object.entries(timing)) {
    if (v === -1) timing[k] = undefined;
  }
}

/** @param {LH.DevtoolsLog} log */
function filterDevtoolsLogEvents(log) {
  return log.map(original => {
    /** @type {LH.Protocol.RawEventMessage} */
    const entry = JSON.parse(JSON.stringify(original));

    switch (entry.method) {
      case 'Network.requestWillBeSent':
        cleanDataURI(entry.params.request);
        cleanHeaders(entry.params.request.headers);
        cleanResponse(entry.params.redirectResponse);
        break;
      case 'Network.responseReceived':
        cleanResponse(entry.params.response);
        break;
    }

    return entry;
  });
}

const filteredLog = filterDevtoolsLogEvents(inputDevtoolsLog);
const output = `[
${filteredLog.map(e => '  ' + JSON.stringify(e)).join(',\n')}
]`;

/** @param {string} s */
const size = s => Math.round(s.length / 1024) + 'kb';
console.log(`Reduced DevtoolsLog from ${size(inputDevtoolsLogRaw)} to ${size(output)}`);
fs.writeFileSync(outputDevtoolsLogPath, output);
