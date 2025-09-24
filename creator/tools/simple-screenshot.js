#!/usr/bin/env node

const puppeteer = require('puppeteer');
const path = require('path');

async function takeScreenshot(url, filename) {
    let browser;
    try {
        console.log(`📸 Taking screenshot of: ${url}`);

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        // Wait a bit for any animations/loading
        await page.waitForTimeout(3000);

        const outputPath = path.join(__dirname, 'screenshots', filename);
        await page.screenshot({
            path: outputPath,
            fullPage: true,
            type: 'png'
        });

        console.log(`✅ Screenshot saved: ${outputPath}`);

    } catch (error) {
        console.error(`❌ Error taking screenshot: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node simple-screenshot.js <url> <filename>');
    process.exit(1);
}

const [url, filename] = args;
takeScreenshot(url, filename);