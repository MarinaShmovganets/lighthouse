/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const SessionEmitMonkeypatch = Symbol('monkeypatch');

/** @implements {LH.Gatherer.FRProtocolSession} */
class ProtocolSession {
  /**
   * @param {import('puppeteer').CDPSession} session
   */
  constructor(session) {
    this._session = session;

    // FIXME: Monkeypatch puppeteer to be able to listen to *all* protocol events.
    // This patched method will now emit a copy of every event on `*`.
    const originalEmit = session.emit;
    // @ts-expect-error - Test for the monkeypatch.
    if (originalEmit[SessionEmitMonkeypatch]) return;
    session.emit = (method, ...params) => {
      originalEmit.call(session, '*', {method, params});
      return originalEmit.call(session, method, ...params);
    };
    // @ts-expect-error - It's monkeypatching 🤷‍♂️.
    session.emit[SessionEmitMonkeypatch] = true;

    /** @type {LH.Gatherer.FRProtocolSession['on']} @param {Array<*>} args */
    this.on = (...args) => args.length === 1 ?
      session.on('*', args[0]) :
      session.on(args[0], args[1]);

    /** @type {LH.Gatherer.FRProtocolSession['once']} */
    this.once = (event, callback) => {
      session.once(event, callback);
    };

    /** @type {LH.Gatherer.FRProtocolSession['off']} @param {Array<*>} args */
    this.off = (...args) => args.length === 1 ?
      session.off('*', args[0]) :
      session.off(args[0], args[1]);
  }

  /**
   * @return {boolean}
   */
  hasNextProtocolTimeout() {
    return false;
  }

  /**
   * @return {number}
   */
  getNextProtocolTimeout() {
    return Number.MAX_SAFE_INTEGER;
  }

  /**
   * @param {number} ms
   */
  setNextProtocolTimeout(ms) { // eslint-disable-line no-unused-vars
    // TODO(FR-COMPAT): support protocol timeout
  }

  /**
   * @template {keyof LH.CrdpCommands} C
   * @param {C} method
   * @param {LH.CrdpCommands[C]['paramsType']} params
   * @return {Promise<LH.CrdpCommands[C]['returnType']>}
   */
  sendCommand(method, ...params) {
    return this._session.send(method, ...params);
  }
}

module.exports = ProtocolSession;

