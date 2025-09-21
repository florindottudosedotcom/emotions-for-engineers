# Screenshot Automation for Emotions for Engineers

This tool provides automated screenshot capabilities using a **system-wide Puppeteer installation** without local dependencies.

## ✅ System Requirements

- **Node.js** 18+ (for running the scripts)
- **Puppeteer** installed globally: `npm install -g puppeteer`
- **Chrome browser** (installed automatically with Puppeteer)

## 🚀 Quick Start

### 1. Basic Screenshots

```bash
# Take a screenshot of the default page (cloud.html)
node screenshot-simple.js

# Take a screenshot of a specific page
node screenshot-simple.js --url http://localhost:8000/creator/puter.html

# Custom filename and viewport
node screenshot-simple.js --filename my-screenshot.png --width 1440 --height 900
```

### 2. Element Screenshots

```bash
# Screenshot a specific element
node screenshot-simple.js --element "#language-selector" --filename lang-selector.png

# Element with custom padding
node screenshot-simple.js --element ".course-creator-form" --filename form.png
```

### 3. NPM Scripts

```bash
# Single screenshot
npm run screenshot

# All creator pages at once
npm run screenshot-all
```

## 📋 Available Commands

### screenshot-simple.js Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url <url>` | URL to screenshot | `http://localhost:8000/creator/cloud.html` |
| `--filename <name>` | Output filename | `screenshot-{timestamp}.png` |
| `--element <selector>` | CSS selector for element screenshot | N/A |
| `--width <pixels>` | Viewport width | `1920` |
| `--height <pixels>` | Viewport height | `1080` |
| `--delay <ms>` | Delay before screenshot | `2000` |
| `--help, -h` | Show help | N/A |

## 🎯 Summary

✅ **Working Solution**: `screenshot-simple.js` uses your global Puppeteer installation without any local dependencies

✅ **No Repository Bloat**: Only minimal dependencies needed (@modelcontextprotocol/sdk)

✅ **Full Functionality**: Supports both full-page and element screenshots

✅ **Easy to Use**: Simple command-line interface with sensible defaults

You can now take automated screenshots using:
```bash
node screenshot-simple.js --filename my-screenshot.png
```

The system is ready for your development workflow!