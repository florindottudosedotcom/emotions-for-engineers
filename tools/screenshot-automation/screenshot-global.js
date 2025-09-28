#!/usr/bin/env node

/**
 * Global Puppeteer Screenshot Tool
 * Uses system-wide Puppeteer installation without local dependencies
 */

import { execSync } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Helper function to run Node.js with global module resolution
function runWithGlobalPuppeteer(script) {
    const globalNodeModules = '/usr/local/lib/node_modules';
    const command = `NODE_PATH=${globalNodeModules} node -e "${script}"`;
    return execSync(command, { encoding: 'utf8' });
}

class GlobalScreenshotTool {
    constructor() {
        this.screenshotsDir = join(__dirname, 'screenshots');
    }

    async ensureScreenshotsDir() {
        try {
            await mkdir(this.screenshotsDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    }

    async takeScreenshot(options = {}) {
        const {
            url = 'http://localhost:8000/creator/cloud.html',
            filename = `screenshot-${Date.now()}.png`,
            fullPage = true,
            width = 1920,
            height = 1080,
            waitFor = null,
            delay = 2000,
        } = options;

        await this.ensureScreenshotsDir();
        const screenshotPath = join(this.screenshotsDir, filename);

        console.log(`Taking screenshot of: ${url}`);

        // Create the Puppeteer script to run with global modules
        const puppeteerScript = `
const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        console.log('Launching browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '${process.env.HOME}/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--allow-running-insecure-content'
            ],
        });

        const page = await browser.newPage();

        console.log('Setting viewport...');
        await page.setViewport({ width: ${width}, height: ${height} });

        console.log('Navigating to page...');
        await page.goto('${url}', { waitUntil: 'networkidle2', timeout: 30000 });

        ${waitFor ? `
        console.log('Waiting for element: ${waitFor}');
        await page.waitForSelector('${waitFor}', { timeout: 10000 });
        ` : ''}

        ${delay > 0 ? `
        console.log('Waiting ${delay}ms for page to settle...');
        await new Promise(resolve => setTimeout(resolve, ${delay}));
        ` : ''}

        console.log('Taking screenshot...');
        await page.screenshot({
            path: '${screenshotPath}',
            fullPage: ${fullPage}
        });

        console.log('Screenshot saved to: ${screenshotPath}');

    } catch (error) {
        console.error('Screenshot failed:', error.message);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
        `;

        try {
            runWithGlobalPuppeteer(puppeteerScript);
            return screenshotPath;
        } catch (error) {
            console.error('Error executing screenshot script:', error.message);
            throw error;
        }
    }

    async takeElementScreenshot(selector, options = {}) {
        const {
            url = 'http://localhost:8000/creator/cloud.html',
            filename = `element-${Date.now()}.png`,
            padding = 10,
        } = options;

        await this.ensureScreenshotsDir();
        const screenshotPath = join(this.screenshotsDir, filename);

        console.log(`Taking element screenshot: ${selector} from ${url}`);

        const puppeteerScript = `
const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '${process.env.HOME}/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--allow-running-insecure-content'
            ],
        });

        const page = await browser.newPage();
        await page.goto('${url}', { waitUntil: 'networkidle2' });
        await page.waitForSelector('${selector}', { timeout: 10000 });

        const element = await page.$('${selector}');
        if (!element) {
            throw new Error('Element not found: ${selector}');
        }

        await element.screenshot({
            path: '${screenshotPath}',
            padding: ${padding}
        });

        console.log('Element screenshot saved to: ${screenshotPath}');

    } catch (error) {
        console.error('Element screenshot failed:', error.message);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
        `;

        try {
            runWithGlobalPuppeteer(puppeteerScript);
            return screenshotPath;
        } catch (error) {
            console.error('Error executing element screenshot script:', error.message);
            throw error;
        }
    }
}

// CLI usage
async function main() {
    const args = process.argv.slice(2);
    const tool = new GlobalScreenshotTool();

    try {
        if (args.includes('--help') || args.includes('-h')) {
            console.log(`
Usage: node screenshot-global.js [options]

Options:
  --url <url>          URL to screenshot (default: http://localhost:8000/creator/cloud.html)
  --filename <name>    Output filename (default: screenshot-{timestamp}.png)
  --element <selector> Take screenshot of specific element
  --width <pixels>     Viewport width (default: 1920)
  --height <pixels>    Viewport height (default: 1080)
  --delay <ms>         Delay before screenshot (default: 2000)
  --help, -h          Show this help

Examples:
  node screenshot-global.js
  node screenshot-global.js --url http://localhost:8000/creator/puter.html
  node screenshot-global.js --element "#chapter-tabs-container"
  node screenshot-global.js --filename my-screenshot.png --delay 5000

Note: This script uses the globally installed Puppeteer package.
            `);
            return;
        }

        const options = {};

        // Parse command line arguments
        for (let i = 0; i < args.length; i += 2) {
            const key = args[i];
            const value = args[i + 1];

            switch (key) {
                case '--url':
                    options.url = value;
                    break;
                case '--filename':
                    options.filename = value;
                    break;
                case '--width':
                    options.width = parseInt(value);
                    break;
                case '--height':
                    options.height = parseInt(value);
                    break;
                case '--delay':
                    options.delay = parseInt(value);
                    break;
                case '--element':
                    options.element = value;
                    break;
            }
        }

        if (options.element) {
            await tool.takeElementScreenshot(options.element, options);
        } else {
            await tool.takeScreenshot(options);
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Export for use as module
export default GlobalScreenshotTool;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}