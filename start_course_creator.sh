#!/bin/bash
echo "Starting a local web server..."

# Start the python server in the background
python3 -m http.server &
SERVER_PID=$!

# Give the server a moment to start
sleep 1

URL="http://localhost:8000/docs/course-creator.html"
echo "Opening $URL in your default browser..."

# Open the URL in the default browser based on OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "$URL"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    open "$URL"
else
    echo "Could not detect OS to open browser automatically. Please open the URL manually."
fi

echo "Server is running in the background (PID: $SERVER_PID)."
echo "To stop the server, run: kill $SERVER_PID"
