@echo off
echo Starting a local web server...

:: Start the python server in a new window
start "Python HTTP Server" cmd /c "python -m http.server"

:: Give the server a moment to start
timeout /t 1 > nul

echo Opening http://localhost:8000/course-creator.html in your default browser...
start http://localhost:8000/course-creator.html

echo.
echo The server is running in a separate window. Close that window to stop the server.
