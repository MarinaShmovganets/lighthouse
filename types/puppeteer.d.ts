import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';

/**
 * @fileoverview Lighthouse should be compatible with puppeteer and puppeteer-core even though the types can be slightly different between the two packages.
 * Anytime we want to use a Puppeteer type within Lighthouse, we should pull the union type from here rather than one of the packages directly.
 */

declare module Puppeteer {
  export type Browser = puppeteerCore.Browser | puppeteer.Browser;
  export type Page = puppeteerCore.Page | puppeteer.Page;
  export type CDPSession = puppeteerCore.CDPSession | puppeteer.CDPSession;
  export type Connection = puppeteerCore.Connection | puppeteer.Connection;
}

export default Puppeteer;
