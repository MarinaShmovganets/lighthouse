import * as lhApi from 'lighthouse';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();

const flow = await lhApi.startFlow(page);

await flow.navigate('https://example.com');

await flow.startTimespan({name: 'Click button'});
await page.click('button');
await flow.endTimespan();

await flow.snapshot({name: 'New page state'});
