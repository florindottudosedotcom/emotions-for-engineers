#!/usr/bin/env node

/**
 * Canvas Regression Test Framework
 * Tests for slide creator canvas functionality and visual regression
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CanvasRegressionTester {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:8000/creator';
        this.screenshotDir = options.screenshotDir || './regression-screenshots';
        this.timeout = options.timeout || 30000;
        this.browser = null;
        this.page = null;

        // Ensure screenshot directory exists
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }
    }

    async initialize() {
        console.log('🚀 Initializing Canvas Regression Tester...');

        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();

        // Set viewport for consistent screenshots
        await this.page.setViewport({ width: 1920, height: 1080 });

        // Listen for console messages and errors
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Console Error:', msg.text());
            }
        });

        this.page.on('pageerror', error => {
            console.log('❌ Page Error:', error.message);
        });

        console.log('✅ Browser initialized successfully');
    }

    async testSlideCreatorPage(providerPage = 'slides_openrouter.html') {
        console.log(`🎯 Testing ${providerPage}...`);

        const testResults = {
            page: providerPage,
            timestamp: new Date().toISOString(),
            tests: []
        };

        try {
            // Navigate to the slide creator page
            await this.page.goto(`${this.baseUrl}/${providerPage}`, {
                waitUntil: 'networkidle0',
                timeout: this.timeout
            });

            // Test 1: Page loads without JavaScript errors
            const jsErrors = [];
            this.page.on('pageerror', error => jsErrors.push(error.message));

            // Wait for slide system to initialize
            await new Promise(resolve => setTimeout(resolve, 5000));

            testResults.tests.push({
                name: 'Page Load',
                passed: jsErrors.length === 0,
                details: jsErrors.length === 0 ? 'No JavaScript errors' : `Errors: ${jsErrors.join(', ')}`
            });

            // Test 2: Canvas container exists and has proper dimensions
            const canvasTest = await this.page.evaluate(() => {
                const container = document.querySelector('.konva-canvas-container');
                if (!container) return { exists: false };

                const canvas = container.querySelector('canvas');
                if (!canvas) return { exists: true, hasCanvas: false };

                return {
                    exists: true,
                    hasCanvas: true,
                    width: canvas.width,
                    height: canvas.height,
                    clientWidth: canvas.clientWidth,
                    clientHeight: canvas.clientHeight
                };
            });

            testResults.tests.push({
                name: 'Canvas Initialization',
                passed: canvasTest.exists && canvasTest.hasCanvas && canvasTest.width > 0 && canvasTest.height > 0,
                details: `Canvas: ${canvasTest.width}x${canvasTest.height}, Client: ${canvasTest.clientWidth}x${canvasTest.clientHeight}`
            });

            // Test 3: Form elements are present and functional
            const formTest = await this.page.evaluate(() => {
                const topicField = document.querySelector('#presentation-topic, [name="presentation-topic"]');
                const numSlidesSelect = document.querySelector('#num-slides, [name="num-slides"]');
                const generateBtn = document.querySelector('#generate-slides-btn, .generate-btn');

                return {
                    hasTopic: !!topicField,
                    hasNumSlides: !!numSlidesSelect,
                    hasGenerateBtn: !!generateBtn,
                    generateBtnEnabled: generateBtn ? !generateBtn.disabled : false
                };
            });

            testResults.tests.push({
                name: 'Form Elements',
                passed: formTest.hasTopic && formTest.hasNumSlides && formTest.hasGenerateBtn,
                details: `Topic: ${formTest.hasTopic}, NumSlides: ${formTest.hasNumSlides}, Generate: ${formTest.hasGenerateBtn}`
            });

            // Test 4: Slide navigation is present
            const navigationTest = await this.page.evaluate(() => {
                const navigation = document.querySelector('.konva-slide-navigation');
                const prevBtn = document.querySelector('.prev-btn, .nav-btn[onclick*="previous"]');
                const nextBtn = document.querySelector('.next-btn, .nav-btn[onclick*="next"]');
                const slideCounter = document.querySelector('.slide-counter, .current-slide');

                return {
                    hasNavigation: !!navigation,
                    hasPrevBtn: !!prevBtn,
                    hasNextBtn: !!nextBtn,
                    hasCounter: !!slideCounter
                };
            });

            testResults.tests.push({
                name: 'Slide Navigation',
                passed: navigationTest.hasNavigation && navigationTest.hasPrevBtn && navigationTest.hasNextBtn,
                details: `Nav: ${navigationTest.hasNavigation}, Prev: ${navigationTest.hasPrevBtn}, Next: ${navigationTest.hasNextBtn}`
            });

            // Test 5: Test slide transition (if slides are available)
            const transitionTest = await this.page.evaluate(() => {
                const konvaSystem = window.konvaSlideSystem;
                if (!konvaSystem) return { hasSystem: false };

                try {
                    // Check if validateCanvasDimensions method exists
                    const hasValidation = typeof konvaSystem.validateCanvasDimensions === 'function';

                    // Try to validate dimensions
                    let validationResult = false;
                    if (hasValidation) {
                        validationResult = konvaSystem.validateCanvasDimensions();
                    }

                    return {
                        hasSystem: true,
                        hasValidation,
                        validationPassed: validationResult,
                        currentSlide: konvaSystem.currentSlideIndex,
                        totalSlides: konvaSystem.slideObjects ? konvaSystem.slideObjects.length : 0
                    };
                } catch (error) {
                    return {
                        hasSystem: true,
                        error: error.message
                    };
                }
            });

            testResults.tests.push({
                name: 'Canvas Validation System',
                passed: transitionTest.hasSystem && transitionTest.hasValidation,
                details: transitionTest.error || `Slides: ${transitionTest.totalSlides}, Current: ${transitionTest.currentSlide}, Validation: ${transitionTest.validationPassed}`
            });

            // Take screenshot for visual regression
            const screenshotPath = path.join(this.screenshotDir, `${providerPage.replace('.html', '')}-regression-${Date.now()}.png`);
            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true
            });

            testResults.screenshot = screenshotPath;
            console.log(`📸 Screenshot saved: ${screenshotPath}`);

        } catch (error) {
            console.log('❌ Test failed:', error.message);
            testResults.tests.push({
                name: 'Overall Test',
                passed: false,
                details: error.message
            });
        }

        return testResults;
    }

    async testAllProviders() {
        const providers = [
            'slides_openrouter.html',
            'slides_webllm.html',
            'slides_ollama.html'
        ];

        const allResults = [];

        for (const provider of providers) {
            console.log(`\n🔄 Testing ${provider}...`);
            const result = await this.testSlideCreatorPage(provider);
            allResults.push(result);

            // Brief pause between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return allResults;
    }

    generateReport(results) {
        console.log('\n📊 REGRESSION TEST REPORT');
        console.log('=' .repeat(50));

        let totalTests = 0;
        let passedTests = 0;

        results.forEach(pageResult => {
            console.log(`\n📄 ${pageResult.page}`);
            console.log(`🕐 ${pageResult.timestamp}`);

            pageResult.tests.forEach(test => {
                totalTests++;
                if (test.passed) passedTests++;

                const status = test.passed ? '✅' : '❌';
                console.log(`  ${status} ${test.name}: ${test.details}`);
            });

            if (pageResult.screenshot) {
                console.log(`  📸 Screenshot: ${pageResult.screenshot}`);
            }
        });

        console.log('\n' + '=' .repeat(50));
        console.log(`📈 SUMMARY: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);

        // Save detailed report
        const reportPath = path.join(this.screenshotDir, `regression-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        console.log(`💾 Detailed report saved: ${reportPath}`);

        return { totalTests, passedTests, reportPath };
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('🧹 Browser closed');
        }
    }
}

// CLI usage
async function main() {
    const tester = new CanvasRegressionTester();

    try {
        await tester.initialize();
        const results = await tester.testAllProviders();
        const summary = tester.generateReport(results);

        // Exit with error code if tests failed
        process.exit(summary.passedTests === summary.totalTests ? 0 : 1);

    } catch (error) {
        console.error('❌ Regression test failed:', error);
        process.exit(1);
    } finally {
        await tester.cleanup();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default CanvasRegressionTester;