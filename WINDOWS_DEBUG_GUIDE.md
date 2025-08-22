# Windows Debugging Guide for Game Master

## Issue: Cannot Send Hints or Messages

If you're experiencing issues with sending hints or messages on Windows, follow these debugging steps:

## Step 1: Check Application Logs

1. **Open the Game Master application**
2. **Press F12** (or right-click and select "Inspect Element")
3. **Go to the Console tab**
4. **Look for any error messages** related to:
   - Database connection
   - API calls
   - Hint creation
   - Message sending

## Step 2: Check Database Health

1. **Open your web browser**
2. **Navigate to:** `http://localhost:3001/api/health`
3. **Check the response** - it should show:
   ```json
   {
     "status": "healthy",
     "database": {
       "connected": true,
       "test": {"test": 1},
       "rooms": 0,
       "hints": 0
     }
   }
   ```

## Step 3: Test Hint Creation

1. **Open your web browser**
2. **Navigate to:** `http://localhost:3001/api/rooms/1/hints`
3. **Use a tool like Postman or curl to send a POST request:**
   ```json
   {
     "text": "Test hint",
     "category": "General"
   }
   ```

## Step 4: Common Windows Issues

### Database Path Issues
- The database should be created in: `%APPDATA%\Game Master\gamemaster.db`
- Check if this directory exists and is writable

### Permission Issues
- Run the application as Administrator if needed
- Check Windows Defender/Firewall settings

### Port Conflicts
- Ensure port 3001 is not blocked by Windows Firewall
- Check if another application is using port 3001

## Step 5: Manual Database Test

1. **Download SQLite Browser** (https://sqlitebrowser.org/)
2. **Open the database file** from `%APPDATA%\Game Master\gamemaster.db`
3. **Check if tables exist:**
   - `rooms`
   - `hints`
   - `room_messages`
   - `hint_categories`

## Step 6: Reset Application

If all else fails:
1. **Close the Game Master application**
2. **Delete the database file** from `%APPDATA%\Game Master\gamemaster.db`
3. **Restart the application** - it will create a fresh database

## Step 7: Contact Support

If the issue persists, please provide:
1. **Windows version** (Windows 10, 11, etc.)
2. **Error messages** from the console
3. **Health check response** from step 2
4. **Screenshots** of any error dialogs

## Technical Details

The application uses:
- **SQLite database** with better-sqlite3
- **Express.js server** on port 3001
- **Socket.IO** for real-time communication
- **Electron** for the desktop application

## File Locations

- **Application:** `C:\Users\[YourUsername]\AppData\Local\Programs\Game Master\`
- **Database:** `C:\Users\[YourUsername]\AppData\Roaming\Game Master\gamemaster.db`
- **Logs:** Check the console output in the application


