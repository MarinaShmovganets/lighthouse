import * as lhApi from 'lighthouse';
import puppeteer from 'puppeteer';

const config: lhApi.Config = {
  extends: 'lighthouse:default',
  settings: {
    skipAudits: ['uses-http2'],
  },
};

const browser = await puppeteer.launch();
const page = await browser.newPage();

const flow: lhApi.UserFlow = await lhApi.startFlow(page, {config});

await flow.navigate('https://example.com');

await flow.startTimespan({name: 'Click button'});
await page.click('button');
await flow.endTimespan();

await flow.snapshot({name: 'New page state'});
