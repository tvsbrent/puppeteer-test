#!/usr/bin/env node
const log = require('fancy-log');
const puppeteer = require('puppeteer');

const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));

const prod = 'https://www.oreilly.com/member/login';
const prodGcp = 'https://grootfrontend.platform-prod.gcp.oreilly.com/member/login';

const currentUrl = prod;
const maxIterations = 50;

(async () => {
  const errors = [];
  const browser = await puppeteer.launch({ headless: false });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);

  // page.on('error', err => {
  //   console.log('ERROR', err);
  // });

  // page.on('pageerror', pageerr => {
  //   console.log('PAGEERROR', pageerr);
  // })

  page.on('requestfailed', request => {
    const url = new URL(request.url(), currentUrl);
    if (url.host.includes('oreilly.com')) {
      const response = request.response();
      const failure = request.failure();
      let statusCode;
      if (response) {
        statusCode = response.status();
      }
      errors.push({
        url: request.url(),
        statusCode,
        errorText: failure.errorText
      })
    }
  });

  log.info('Initial page load.', currentUrl);
  try {
    await page.goto(currentUrl);
    await page.waitForSelector('h1', { timeout: 15000 });
    await sleep(2000);
  } catch (e) {
    errors.push({
      url: currentUrl,
      statusCode: 0,
      errorText: e.message
    });
  }

  let i = 0;
  while (++i < maxIterations) {
    try {
      log.info('Page reload:', i);
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector('h1', { timeout: 15000 });
      await sleep(2000);
    } catch (e) {
      errors.push({
        url: currentUrl,
        statusCode: 0,
        errorText: e.message
      });
    }
  }

  log.info('Error Count:', errors.length);
  errors.forEach(e => log.info('Error:', e.url, e.statusCode, e.errorText));

  await browser.close();
})();
