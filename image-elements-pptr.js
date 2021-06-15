'use strict';
const puppeteer = require('puppeteer');
const lighthouse = require('./lighthouse-core/fraggle-rock/api.js');

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
  });
  const page = await browser.newPage();

  await page.goto(process.argv[2] || 'https://paulirish.com');
  await new Promise(r => setTimeout(r, 2000));

  const result = await lighthouse.snapshot({page});
  if (!result) return;

  console.log('### ImageElementsSnapshot ###');
  console.log(result.artifacts.ImageElementsSnapshot);
  console.log('### ImageElements ###');
  console.log(result.artifacts.ImageElements);
}
run();
