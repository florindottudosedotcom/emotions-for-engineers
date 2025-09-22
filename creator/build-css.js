#!/usr/bin/env node

/**
 * CSS Bundle Builder - Following CLAUDE.md Guidelines
 * Consolidates multiple CSS files into a single optimized bundle
 */

const fs = require('fs');
const path = require('path');

// CSS files in dependency order (same as main.css imports)
const cssFiles = [
    'assets/css/core/variables.css',
    'assets/css/core/reset.css',
    'assets/css/core/typography.css',
    'assets/css/layouts/containers.css',
    'assets/css/layouts/grid.css',
    'assets/css/components/buttons.css',
    'assets/css/components/forms.css',
    'assets/css/components/cards.css',
    'assets/css/components/modals.css',
    'assets/css/components/status.css',
    'assets/css/components/launcher.css',
    'assets/css/components/puter.css',
    'assets/css/responsive/mobile.css',
    'assets/css/themes/light.css',
    'assets/css/themes/dark.css'
];

function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.warn(`Warning: Could not read ${filePath}:`, error.message);
        return `/* Warning: Could not load ${filePath} */\n`;
    }
}

function minifyCSS(css) {
    return css
        // Remove comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove unnecessary semicolons
        .replace(/;\s*}/g, '}')
        // Remove spaces around certain characters
        .replace(/\s*([{}:;,>~+])\s*/g, '$1')
        // Remove trailing semicolon before closing brace
        .replace(/;}/g, '}')
        .trim();
}

function buildBundle() {
    console.log('Building CSS bundle...');

    let bundleContent = `/**
 * CSS Bundle - Auto-generated ${new Date().toISOString()}
 * Consolidated from ${cssFiles.length} CSS files for optimal performance
 * DO NOT EDIT MANUALLY - regenerate using build-css.js
 */\n\n`;

    cssFiles.forEach((filePath, index) => {
        console.log(`Processing ${filePath}...`);

        const content = readFile(filePath);

        bundleContent += `/* ===== ${path.basename(filePath)} ===== */\n`;
        bundleContent += content;
        bundleContent += '\n\n';
    });

    // Write development bundle (unminified)
    const devBundle = 'assets/css/bundle.css';
    fs.writeFileSync(devBundle, bundleContent);
    console.log(`✓ Development bundle written to ${devBundle}`);

    // Write production bundle (minified)
    const minifiedContent = minifyCSS(bundleContent);
    const prodBundle = 'assets/css/bundle.min.css';
    fs.writeFileSync(prodBundle, minifiedContent);
    console.log(`✓ Production bundle written to ${prodBundle}`);

    // Stats
    const originalSize = bundleContent.length;
    const minifiedSize = minifiedContent.length;
    const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);

    console.log(`\nBundle stats:`);
    console.log(`- Development: ${(originalSize / 1024).toFixed(1)}KB`);
    console.log(`- Production: ${(minifiedSize / 1024).toFixed(1)}KB`);
    console.log(`- Compression: ${savings}% reduction`);
    console.log(`- Files combined: ${cssFiles.length}`);
}

if (require.main === module) {
    buildBundle();
}

module.exports = { buildBundle };