#!/usr/bin/env node

// Simple test script for global Puppeteer
import { execSync } from 'child_process';

const script = `
const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting Puppeteer test...');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '${process.env.HOME}/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });

        console.log('Browser launched successfully');

        const page = await browser.newPage();
        console.log('New page created');

        await page.goto('https://example.com', { waitUntil: 'networkidle2', timeout: 10000 });
        console.log('Page loaded');

        await page.screenshot({ path: './screenshots/test-example.png' });
        console.log('Screenshot taken successfully');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
})();
`;

try {
    console.log('Running Puppeteer test with global installation...');
    const result = execSync(`NODE_PATH=/usr/local/lib/node_modules node -e "${script}"`, {
        encoding: 'utf8',
        timeout: 30000  // 30 second timeout
    });
    console.log(result);
} catch (error) {
    console.error('Test failed:', error.message);
}