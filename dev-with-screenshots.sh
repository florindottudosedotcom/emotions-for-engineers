#!/bin/bash

# Development Script with Automatic Screenshots
# This script starts the course creator and provides screenshot utilities

echo "🚀 Starting Emotions for Engineers Development Environment with Screenshots"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Create screenshots directory
mkdir -p screenshots

# Function to take screenshot
take_screenshot() {
    local url="${1:-http://localhost:8000/creator/cloud.html}"
    local filename="${2:-auto-screenshot-$(date +%s).png}"
    echo "📸 Taking screenshot of $url..."
    (cd tools/screenshot-automation && node screenshot-simple.js --url "$url" --filename "$filename")
}

# Function to take element screenshot
take_element_screenshot() {
    local selector="$1"
    local url="${2:-http://localhost:8000/creator/cloud.html}"
    local filename="${3:-element-$(date +%s).png}"
    echo "📸 Taking element screenshot: $selector"
    (cd tools/screenshot-automation && node screenshot-simple.js --url "$url" --element "$selector" --filename "$filename")
}

# Export functions for use in terminal
export -f take_screenshot
export -f take_element_screenshot

echo ""
echo "📋 Available Screenshot Commands:"
echo "  take_screenshot [url] [filename]           - Take full page screenshot"
echo "  take_element_screenshot <selector> [url] [filename] - Take element screenshot"
echo ""
echo "📋 Example Commands:"
echo "  take_screenshot http://localhost:8000/creator/cloud.html current-ui.png"
echo "  take_element_screenshot '#chapter-tabs-container'"
echo "  take_element_screenshot '.lang-grid' http://localhost:8000/creator/puter.html"
echo ""
echo "🔧 Quick Screenshots for Your Project:"
echo "  All Creator Pages:"
echo "    take_screenshot http://localhost:8000/creator/cloud.html cloud-ui.png"
echo "    take_screenshot http://localhost:8000/creator/webllm.html webllm-ui.png"
echo "    take_screenshot http://localhost:8000/creator/ollama.html ollama-ui.png"
echo "    take_screenshot http://localhost:8000/creator/puter.html puter-ui.png"
echo ""
echo "  UI Components:"
echo "    take_element_screenshot '#chapter-tabs-container' '' tabs.png"
echo "    take_element_screenshot '.lang-grid' '' language-buttons.png"
echo "    take_element_screenshot '.editor-container' '' editor.png"
echo ""
echo "💡 Pro Tip: Run 'source dev-with-screenshots.sh' to enable these commands in your current shell"
echo ""

# Check if we should start the development server
if [[ "$1" == "--start-server" ]]; then
    echo "🌐 Starting development server..."
    if [[ -f "start_course_creator.sh" ]]; then
        ./start_course_creator.sh
    else
        echo "📁 Starting Python HTTP server..."
        python3 -m http.server 8000
    fi
else
    echo "🔧 To start the development server, run: $0 --start-server"
    echo "🔧 Or manually start with: ./start_course_creator.sh"
fi