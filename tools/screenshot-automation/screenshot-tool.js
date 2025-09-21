#!/usr/bin/env node

/**
 * Standalone Screenshot Tool
 * Quick utility for taking screenshots during development
 */

import puppeteer from 'puppeteer-core';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

class ScreenshotTool {
  constructor() {
    this.browser = null;
    this.screenshotsDir = join(__dirname, 'screenshots');
  }

  async ensureScreenshotsDir() {
    try {
      await mkdir(this.screenshotsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async ensureBrowser() {
    if (!this.browser) {
      console.log('Launching browser...');
      // Use the global Chrome from Puppeteer installation
      const executablePath = process.env.HOME + '/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome';

      this.browser = await puppeteer.launch({
        headless: 'new',
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--allow-running-insecure-content'
        ],
      });
    }
    return this.browser;
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
    const browser = await this.ensureBrowser();
    const page = await browser.newPage();

    try {
      console.log(`Taking screenshot of: ${url}`);

      // Set viewport
      await page.setViewport({ width, height });

      // Navigate to page
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for specific element if provided
      if (waitFor) {
        console.log(`Waiting for element: ${waitFor}`);
        await page.waitForSelector(waitFor, { timeout: 10000 });
      }

      // Additional delay for dynamic content
      if (delay > 0) {
        console.log(`Waiting ${delay}ms for page to settle...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Take screenshot
      const screenshotPath = join(this.screenshotsDir, filename);
      await page.screenshot({
        path: screenshotPath,
        fullPage,
      });

      console.log(`Screenshot saved to: ${screenshotPath}`);
      return screenshotPath;

    } catch (error) {
      console.error('Screenshot failed:', error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  async takeElementScreenshot(selector, options = {}) {
    const {
      url = 'http://localhost:8000/creator/cloud.html',
      filename = `element-${Date.now()}.png`,
      padding = 10,
    } = options;

    await this.ensureScreenshotsDir();
    const browser = await this.ensureBrowser();
    const page = await browser.newPage();

    try {
      console.log(`Taking element screenshot: ${selector} from ${url}`);

      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector(selector, { timeout: 10000 });

      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      const screenshotPath = join(this.screenshotsDir, filename);
      await element.screenshot({
        path: screenshotPath,
        padding,
      });

      console.log(`Element screenshot saved to: ${screenshotPath}`);
      return screenshotPath;

    } catch (error) {
      console.error('Element screenshot failed:', error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const tool = new ScreenshotTool();

  try {
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
Usage: node screenshot-tool.js [options]

Options:
  --url <url>          URL to screenshot (default: http://localhost:8000/creator/cloud.html)
  --filename <name>    Output filename (default: screenshot-{timestamp}.png)
  --element <selector> Take screenshot of specific element
  --width <pixels>     Viewport width (default: 1920)
  --height <pixels>    Viewport height (default: 1080)
  --delay <ms>         Delay before screenshot (default: 2000)
  --help, -h          Show this help

Examples:
  node screenshot-tool.js
  node screenshot-tool.js --url http://localhost:8000/creator/puter.html
  node screenshot-tool.js --element "#chapter-tabs-container"
  node screenshot-tool.js --filename my-screenshot.png --delay 5000
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
  } finally {
    await tool.cleanup();
  }
}

// Export for use as module
export default ScreenshotTool;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}