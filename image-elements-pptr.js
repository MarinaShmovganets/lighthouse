'use strict';
const puppeteer = require('puppeteer');
const lighthouse = require('./lighthouse-core/fraggle-rock/api.js');

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
  });
  const page = await browser.newPage();

  const run = await lighthouse.startTimespan({page});

  await page.goto(process.argv[2] || 'https://paulirish.com');
  await new Promise(r => setTimeout(r, 2000));

  const result = await run.endTimespan();
  if (!result) return;

  console.log('### ImageElements ###');
  console.log(result.artifacts.ImageElements);
}
run();
