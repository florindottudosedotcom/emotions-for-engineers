#!/usr/bin/env node

/**
 * Puppeteer MCP Server for Automated Screenshots
 * Provides screenshot capabilities to Claude Code
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import puppeteer from 'puppeteer-core';
import { writeFile } from 'fs/promises';
import { join } from 'path';

class PuppeteerMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'emotions-for-engineers-puppeteer',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.browser = null;
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'screenshot_page',
          description: 'Take a screenshot of a web page',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL of the page to screenshot',
              },
              filename: {
                type: 'string',
                description: 'Filename for the screenshot (optional)',
                default: 'screenshot.png',
              },
              fullPage: {
                type: 'boolean',
                description: 'Take a full page screenshot',
                default: true,
              },
              width: {
                type: 'number',
                description: 'Viewport width',
                default: 1920,
              },
              height: {
                type: 'number',
                description: 'Viewport height',
                default: 1080,
              },
              waitFor: {
                type: 'string',
                description: 'CSS selector to wait for before taking screenshot',
              },
              delay: {
                type: 'number',
                description: 'Delay in milliseconds before taking screenshot',
                default: 1000,
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'screenshot_element',
          description: 'Take a screenshot of a specific element',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL of the page',
              },
              selector: {
                type: 'string',
                description: 'CSS selector of the element to screenshot',
              },
              filename: {
                type: 'string',
                description: 'Filename for the screenshot (optional)',
                default: 'element-screenshot.png',
              },
              padding: {
                type: 'number',
                description: 'Padding around the element in pixels',
                default: 10,
              },
            },
            required: ['url', 'selector'],
          },
        },
        {
          name: 'screenshot_local',
          description: 'Take a screenshot of a local development server',
          inputSchema: {
            type: 'object',
            properties: {
              port: {
                type: 'number',
                description: 'Local server port',
                default: 8000,
              },
              path: {
                type: 'string',
                description: 'Path to screenshot (e.g., /creator/cloud.html)',
                default: '/',
              },
              filename: {
                type: 'string',
                description: 'Filename for the screenshot',
                default: 'local-screenshot.png',
              },
              fullPage: {
                type: 'boolean',
                description: 'Take a full page screenshot',
                default: true,
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'screenshot_page':
            return await this.screenshotPage(args);
          case 'screenshot_element':
            return await this.screenshotElement(args);
          case 'screenshot_local':
            return await this.screenshotLocal(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async ensureBrowser() {
    if (!this.browser) {
      // Use the global Chrome from Puppeteer installation
      const executablePath = process.env.HOME + '/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome';

      this.browser = await puppeteer.launch({
        headless: 'new',
        executablePath,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });
    }
    return this.browser;
  }

  async screenshotPage(args) {
    const {
      url,
      filename = 'screenshot.png',
      fullPage = true,
      width = 1920,
      height = 1080,
      waitFor,
      delay = 1000,
    } = args;

    const browser = await this.ensureBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width, height });
      await page.goto(url, { waitUntil: 'networkidle2' });

      if (waitFor) {
        await page.waitForSelector(waitFor, { timeout: 10000 });
      }

      if (delay > 0) {
        await page.waitForTimeout(delay);
      }

      const screenshotPath = join(process.cwd(), 'screenshots', filename);
      await page.screenshot({
        path: screenshotPath,
        fullPage,
      });

      await page.close();

      return {
        content: [
          {
            type: 'text',
            text: `Screenshot saved to: ${screenshotPath}`,
          },
          {
            type: 'image',
            data: screenshotPath,
            mimeType: 'image/png',
          },
        ],
      };
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async screenshotElement(args) {
    const { url, selector, filename = 'element-screenshot.png', padding = 10 } = args;

    const browser = await this.ensureBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector(selector, { timeout: 10000 });

      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      const screenshotPath = join(process.cwd(), 'screenshots', filename);
      await element.screenshot({
        path: screenshotPath,
        padding,
      });

      await page.close();

      return {
        content: [
          {
            type: 'text',
            text: `Element screenshot saved to: ${screenshotPath}`,
          },
          {
            type: 'image',
            data: screenshotPath,
            mimeType: 'image/png',
          },
        ],
      };
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async screenshotLocal(args) {
    const { port = 8000, path = '/', filename = 'local-screenshot.png', fullPage = true } = args;

    const url = `http://localhost:${port}${path}`;
    return await this.screenshotPage({
      url,
      filename,
      fullPage,
    });
  }

  async run() {
    // Create screenshots directory
    try {
      await import('fs').then(fs => fs.mkdirSync('screenshots', { recursive: true }));
    } catch (error) {
      // Directory might already exist
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Puppeteer MCP Server running on stdio');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

const server = new PuppeteerMCPServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await server.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.cleanup();
  process.exit(0);
});

server.run().catch(console.error);