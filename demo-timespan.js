'use strict';

const fs = require('fs');
const open = require('open');
const puppeteer = require('puppeteer');
const defaultConfig = require('./lighthouse-core/fraggle-rock/config/default-config.js');
const lighthouse = require('./lighthouse-core/fraggle-rock/api.js');

async function main() {
  const browser = await puppeteer.launch({headless: false, slowMo: 500});

  try {
    const page = await browser.newPage();

    // Start the lighthouse timespan.
    const config = {...defaultConfig, settings: {output: 'html'}};
    const timespan = await lighthouse.startTimespan({page, config});

    await page.goto('https://www.mikescerealshack.co/memes/new?season=3&episode=19&scene=9&timecode=208.41&random=y');
    const [$btn1] = await page.$x(`//button[contains(., 'Continue')]`);
    await $btn1.click();
    await page.waitForTimeout(1000);
    const [$layout] = await page.$x(`//div[contains(., '1 x 2')]`);
    await $layout.click();

    // End the lighthouse timespan.
    const {report} = await timespan.endTimespan();
    fs.writeFileSync('fr-report.html', report);
    open('fr-report.html');
  } catch (err) {
    console.error(err); // eslint-disable-line
  } finally {
    await browser.close();
  }
}

main();
