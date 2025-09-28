#!/bin/bash

# Screenshot Automation Setup Script
# Verifies system-wide installation for Emotions for Engineers project

echo "🔧 Verifying Screenshot Automation Setup..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check for global Puppeteer installation
echo "📦 Checking global Puppeteer installation..."
if node -e "import('puppeteer').then(() => console.log('✅ Global Puppeteer found')).catch(() => process.exit(1))" 2>/dev/null; then
    echo "✅ Global Puppeteer installation verified"
else
    echo "❌ Global Puppeteer not found."
    echo "   Please install globally with: npm install -g puppeteer"
    echo "   Or follow the manual installation steps in README.md"
    exit 1
fi

# Check for Chrome/Chromium
echo "🌐 Checking for Chrome browser..."
CHROME_FOUND=false

if command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome found: $(google-chrome --version)"
    CHROME_FOUND=true
elif command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium found: $(chromium-browser --version)"
    CHROME_FOUND=true
elif [ -f "$HOME/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome" ]; then
    echo "✅ Puppeteer Chrome found in cache"
    CHROME_FOUND=true
fi

if [ "$CHROME_FOUND" = false ]; then
    echo "⚠️  No Chrome browser found."
    echo "   The screenshot tool will attempt to use available browsers."
fi

# Install minimal local dependencies (MCP SDK only)
if [ -f "package.json" ]; then
    echo "📦 Installing minimal local dependencies..."
    npm install --production
fi

# Create screenshots directory in main project
mkdir -p ../../screenshots

echo ""
echo "🎉 Setup verification complete!"
echo ""
echo "📋 Available Commands:"
echo "  node screenshot-tool.js --help                    - Show help"
echo "  node screenshot-tool.js --url http://localhost:8000/creator/cloud.html"
echo "  node screenshot-tool.js --element '.lang-grid'"
echo ""
echo "🚀 Quick Start:"
echo "  1. Start your development server: cd ../.. && ./start_course_creator.sh"
echo "  2. Take a screenshot: cd tools/screenshot-automation && node screenshot-tool.js"
echo ""
echo "💡 Pro Tip: Add 'alias screenshot=\"cd $(pwd) && node screenshot-tool.js\"' to your shell profile"