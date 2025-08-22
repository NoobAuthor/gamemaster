@echo off
echo ========================================
echo Game Master Windows Database Test
echo ========================================
echo.

echo Testing database health...
echo.

REM Test the health endpoint
curl -s "http://localhost:3001/api/health" > health_response.json
if %errorlevel% equ 0 (
    echo ✅ Health check successful
    echo Response saved to health_response.json
    type health_response.json
) else (
    echo ❌ Health check failed
    echo Make sure Game Master is running and port 3001 is accessible
)

echo.
echo ========================================
echo Testing hint creation...
echo.

REM Test hint creation
curl -s -X POST "http://localhost:3001/api/rooms/1/hints" ^
     -H "Content-Type: application/json" ^
     -d "{\"text\": \"Test hint from Windows\", \"category\": \"Test\"}" > hint_response.json

if %errorlevel% equ 0 (
    echo ✅ Hint creation test completed
    echo Response saved to hint_response.json
    type hint_response.json
) else (
    echo ❌ Hint creation test failed
)

echo.
echo ========================================
echo Testing message creation...
echo.

REM Test message creation
curl -s -X POST "http://localhost:3001/api/rooms/1/messages" ^
     -H "Content-Type: application/json" ^
     -d "{\"language\": \"es\", \"message\": \"Test message from Windows\"}" > message_response.json

if %errorlevel% equ 0 (
    echo ✅ Message creation test completed
    echo Response saved to message_response.json
    type message_response.json
) else (
    echo ❌ Message creation test failed
)

echo.
echo ========================================
echo Test completed!
echo.
echo If you see any errors, please:
echo 1. Make sure Game Master is running
echo 2. Check the console for error messages
echo 3. Try running as Administrator
echo 4. Check Windows Firewall settings
echo.
echo Press any key to exit...
pause > nul


