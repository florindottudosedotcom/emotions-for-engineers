#!/usr/bin/env node

/**
 * Screenshot Automation for Responsive Design Verification
 * Takes screenshots at different viewport sizes to debug layout issues
 */

// Use global Puppeteer installation
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Viewport configurations for testing
const viewports = [
    { name: 'mobile-portrait', width: 375, height: 667, deviceScaleFactor: 2 },
    { name: 'mobile-landscape', width: 667, height: 375, deviceScaleFactor: 2 },
    { name: 'tablet-portrait', width: 768, height: 1024, deviceScaleFactor: 2 },
    { name: 'tablet-landscape', width: 1024, height: 768, deviceScaleFactor: 2 },
    { name: 'desktop-small', width: 1280, height: 720, deviceScaleFactor: 1 },
    { name: 'desktop-large', width: 1920, height: 1080, deviceScaleFactor: 1 }
];

// Pages to test
const pages = [
    { name: 'course-selector', url: 'http://localhost:8000/creator/course.html' },
    { name: 'cloud-provider', url: 'http://localhost:8000/creator/cloud.html' },
    { name: 'webllm-provider', url: 'http://localhost:8000/creator/webllm.html' },
    { name: 'ollama-provider', url: 'http://localhost:8000/creator/ollama.html' },
    { name: 'puter-provider', url: 'http://localhost:8000/creator/puter.html' }
];

class ScreenshotTaker {
    constructor() {
        this.browser = null;
        this.outputDir = path.join(__dirname, 'screenshots');
        this.ensureOutputDir();
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async init() {
        console.log('🚀 Launching Puppeteer with system Chrome...');
        this.browser = await puppeteer.launch({
            headless: true,
            executablePath: '/usr/bin/google-chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        });
        console.log('✅ Browser launched successfully');
    }

    async takeScreenshot(page, viewport, pageConfig) {
        const filename = `${pageConfig.name}-${viewport.name}-${viewport.width}x${viewport.height}.png`;
        const filepath = path.join(this.outputDir, filename);

        try {
            await page.setViewport(viewport);

            // Wait a bit for any animations or layout shifts
            await page.waitForTimeout(500);

            // Wait for network to be mostly idle
            await page.waitForTimeout(2000);

            await page.screenshot({
                path: filepath,
                fullPage: true,
                quality: 90
            });

            console.log(`📸 Screenshot saved: ${filename}`);
            return filepath;
        } catch (error) {
            console.error(`❌ Failed to take screenshot for ${pageConfig.name} at ${viewport.name}:`, error.message);
            return null;
        }
    }

    async takePageScreenshots(pageConfig) {
        console.log(`\n📄 Taking screenshots for: ${pageConfig.name}`);
        console.log(`🔗 URL: ${pageConfig.url}`);

        const page = await this.browser.newPage();

        try {
            // Set common page settings
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            // Navigate to page
            await page.goto(pageConfig.url, {
                waitUntil: 'networkidle2',
                timeout: 10000
            });

            // Wait for page to be fully loaded
            await page.waitForTimeout(1000);

            // Take screenshots at different viewports
            const screenshots = [];
            for (const viewport of viewports) {
                const filepath = await this.takeScreenshot(page, viewport, pageConfig);
                if (filepath) {
                    screenshots.push({ viewport: viewport.name, file: filepath });
                }
            }

            return screenshots;
        } catch (error) {
            console.error(`❌ Failed to load page ${pageConfig.name}:`, error.message);
            return [];
        } finally {
            await page.close();
        }
    }

    async takeAllScreenshots() {
        console.log('📸 Starting responsive design screenshot capture...');
        console.log(`📁 Output directory: ${this.outputDir}`);

        const allScreenshots = {};

        for (const pageConfig of pages) {
            allScreenshots[pageConfig.name] = await this.takePageScreenshots(pageConfig);
        }

        return allScreenshots;
    }

    async analyzeContainerWidths(pageConfig) {
        console.log(`\n🔍 Analyzing container widths for: ${pageConfig.name}`);

        const page = await this.browser.newPage();

        try {
            await page.goto(pageConfig.url, { waitUntil: 'networkidle2' });

            // Set desktop viewport for analysis
            await page.setViewport({ width: 1920, height: 1080 });

            // Analyze container dimensions
            const containerInfo = await page.evaluate(() => {
                const containers = [
                    { selector: 'body', name: 'Body' },
                    { selector: '.main-container', name: 'Main Container' },
                    { selector: '.container', name: 'Container' },
                    { selector: '.content-container', name: 'Content Container' },
                    { selector: '.provider-row', name: 'Provider Row' },
                    { selector: '.provider-tabs', name: 'Provider Tabs' }
                ];

                const results = [];

                containers.forEach(({ selector, name }) => {
                    const element = document.querySelector(selector);
                    if (element) {
                        const rect = element.getBoundingClientRect();
                        const styles = window.getComputedStyle(element);

                        results.push({
                            name,
                            selector,
                            width: rect.width,
                            height: rect.height,
                            left: rect.left,
                            right: rect.right,
                            padding: {
                                left: styles.paddingLeft,
                                right: styles.paddingRight,
                                top: styles.paddingTop,
                                bottom: styles.paddingBottom
                            },
                            margin: {
                                left: styles.marginLeft,
                                right: styles.marginRight,
                                top: styles.marginTop,
                                bottom: styles.marginBottom
                            },
                            maxWidth: styles.maxWidth,
                            boxSizing: styles.boxSizing
                        });
                    }
                });

                return {
                    windowWidth: window.innerWidth,
                    documentWidth: document.documentElement.scrollWidth,
                    containers: results
                };
            });

            console.log(`📏 Window width: ${containerInfo.windowWidth}px`);
            console.log(`📄 Document width: ${containerInfo.documentWidth}px`);
            console.log('\n📦 Container Analysis:');

            containerInfo.containers.forEach(container => {
                console.log(`\n🔸 ${container.name} (${container.selector}):`);
                console.log(`   Width: ${container.width}px`);
                console.log(`   Position: left=${container.left}px, right=${container.right}px`);
                console.log(`   Padding: ${container.padding.left} ${container.padding.right}`);
                console.log(`   Margin: ${container.margin.left} ${container.margin.right}`);
                console.log(`   Max-width: ${container.maxWidth}`);
                console.log(`   Box-sizing: ${container.boxSizing}`);

                // Check if container is full width
                const isFullWidth = Math.abs(container.width - containerInfo.windowWidth) < 1;
                console.log(`   🎯 Full width: ${isFullWidth ? '✅ YES' : '❌ NO'}`);

                if (!isFullWidth) {
                    const difference = containerInfo.windowWidth - container.width;
                    console.log(`   📐 Missing width: ${difference}px`);
                }
            });

            return containerInfo;
        } catch (error) {
            console.error(`❌ Failed to analyze ${pageConfig.name}:`, error.message);
            return null;
        } finally {
            await page.close();
        }
    }

    async analyzeAllPages() {
        console.log('\n🔍 Starting container width analysis...');

        const analyses = {};
        for (const pageConfig of pages) {
            analyses[pageConfig.name] = await this.analyzeContainerWidths(pageConfig);
        }

        return analyses;
    }

    async generateReport(screenshots, analyses) {
        const reportPath = path.join(this.outputDir, 'analysis-report.json');
        const report = {
            timestamp: new Date().toISOString(),
            screenshots,
            analyses,
            summary: {
                totalScreenshots: Object.values(screenshots).flat().length,
                pagesAnalyzed: Object.keys(analyses).length,
                fullWidthIssues: []
            }
        };

        // Identify full width issues
        Object.entries(analyses).forEach(([pageName, analysis]) => {
            if (analysis && analysis.containers) {
                analysis.containers.forEach(container => {
                    const isFullWidth = Math.abs(container.width - analysis.windowWidth) < 1;
                    if (!isFullWidth) {
                        report.summary.fullWidthIssues.push({
                            page: pageName,
                            container: container.name,
                            selector: container.selector,
                            actualWidth: container.width,
                            expectedWidth: analysis.windowWidth,
                            difference: analysis.windowWidth - container.width
                        });
                    }
                });
            }
        });

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📊 Analysis report saved: ${reportPath}`);

        // Print summary
        console.log('\n📋 SUMMARY:');
        console.log(`📸 Screenshots taken: ${report.summary.totalScreenshots}`);
        console.log(`📄 Pages analyzed: ${report.summary.pagesAnalyzed}`);
        console.log(`⚠️  Full width issues found: ${report.summary.fullWidthIssues.length}`);

        if (report.summary.fullWidthIssues.length > 0) {
            console.log('\n🚨 FULL WIDTH ISSUES:');
            report.summary.fullWidthIssues.forEach(issue => {
                console.log(`   ${issue.page}: ${issue.container} is ${issue.difference}px too narrow`);
            });
        }

        return report;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser closed');
        }
    }
}

// Main execution
async function main() {
    const screenshotTaker = new ScreenshotTaker();

    try {
        await screenshotTaker.init();

        // Take screenshots at different viewports
        const screenshots = await screenshotTaker.takeAllScreenshots();

        // Analyze container widths
        const analyses = await screenshotTaker.analyzeAllPages();

        // Generate comprehensive report
        const report = await screenshotTaker.generateReport(screenshots, analyses);

        console.log('\n✅ Screenshot and analysis complete!');
        console.log(`📁 Check the screenshots directory: ${screenshotTaker.outputDir}`);

        // Exit with error code if issues found
        if (report.summary.fullWidthIssues.length > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Screenshot automation failed:', error);
        process.exit(1);
    } finally {
        await screenshotTaker.close();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { ScreenshotTaker };