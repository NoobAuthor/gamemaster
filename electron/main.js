import { app, BrowserWindow, ipcMain, shell } from 'electron'
import os from 'os'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { execSync } from 'child_process'

// Import electron-updater with error handling
let autoUpdater = null
async function initAutoUpdater() {
  try {
    // Try CommonJS require first (more reliable in Electron)
    const { autoUpdater: updater } = require('electron-updater')
    autoUpdater = updater
    
    // Configure auto-updater if available
    if (autoUpdater) {
      autoUpdater.checkForUpdatesAndNotify = false // We'll handle this manually
      autoUpdater.autoDownload = false // Don't auto-download, let user choose
      
      // Configure to only check main branch releases
      autoUpdater.allowPrerelease = false // Only stable releases from main branch
      autoUpdater.allowDowngrade = false // Don't allow downgrades
      
      console.log('✅ Auto-updater loaded and configured for GitHub repository: NoobAuthor/gamemaster')
      console.log('📋 Auto-updater will only check for releases from the main branch')
    }
  } catch (requireError) {
    console.log('CommonJS require failed, trying ES6 import...', requireError.message)
    try {
      // Fallback to ES6 import
      const { autoUpdater: updater } = await import('electron-updater')
      autoUpdater = updater
      
      // Configure auto-updater if available
      if (autoUpdater) {
        autoUpdater.checkForUpdatesAndNotify = false
        autoUpdater.autoDownload = false
        console.log('✅ Auto-updater loaded via ES6 import and configured successfully')
      }
    } catch (importError) {
      console.warn('⚠️ electron-updater not available via require or import:', importError.message)
      autoUpdater = null
    }
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getLanAddresses(port) {
  const lan = []
  
  // Method 1: Try using ifconfig on macOS/Linux
  try {
    const output = execSync('ifconfig | grep "inet " | grep -v 127.0.0.1', { encoding: 'utf8' })
    const lines = output.trim().split('\n')
    for (const line of lines) {
      const match = line.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/)
      if (match) {
        const ip = match[1]
        lan.push({ 
          name: `Wi-Fi (${ip})`, 
          address: `http://${ip}:${port}`,
          priority: 0
        })
      }
    }
  } catch (e) {
    console.log('ifconfig method failed:', e.message)
  }
  
  // Method 2: Fallback to Node.js os.networkInterfaces()
  if (lan.length === 0) {
    const nets = os.networkInterfaces()
    console.log('🔍 Network interfaces:', Object.keys(nets))
    
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        console.log(`Interface ${name}:`, net.address, net.family, net.internal)
        if (net.family === 'IPv4' && !net.internal) {
          // Prioritize common Wi-Fi interface names
          const priority = name.includes('en') || name.includes('wlan') || name.includes('wifi') ? 0 : 1
          lan.push({ 
            name: `${name} (${net.address})`, 
            address: `http://${net.address}:${port}`,
            priority 
          })
        }
      }
    }
  }
  
  // Sort by priority (Wi-Fi interfaces first)
  lan.sort((a, b) => (a.priority || 1) - (b.priority || 1))
  
  // Append localhost last as a fallback
  lan.push({ name: 'localhost', address: `http://127.0.0.1:${port}`, priority: 999 })
  
  console.log('📡 Found addresses:', lan)
  return lan
}

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) return true
    } catch (_) {}
    await new Promise(r => setTimeout(r, 250))
  }
  return false
}

async function startServer() {
  try {
    const port = process.env.PORT || '3001'
    
    // Ensure writable DB location for packaged apps
    if (!process.env.GAMEMASTER_DB_PATH) {
      const userDataPath = app.getPath('userData')
      const dbPath = path.join(userDataPath, 'gamemaster.db')
      
      console.log('🗄️ Database path:', dbPath)
      console.log('📁 User data path:', userDataPath)
      
      // Ensure user data directory exists
      const fs = await import('fs')
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true })
        console.log('📁 Created user data directory')
      }
      
      process.env.GAMEMASTER_DB_PATH = dbPath
    }
    
    process.env.NODE_ENV = 'production'
    console.log('🚀 Starting server on port', port)

    const serverEntry = path.resolve(__dirname, '../server/index.js')
    await import(pathToFileURL(serverEntry).href)
    
    const healthy = await waitForServer(`http://127.0.0.1:${port}/api/health`, 15000)
    if (!healthy) {
      // Continue anyway; UI will still show URLs
      console.warn('⚠️ Server did not report healthy within timeout, but continuing...')
    } else {
      console.log('✅ Server is healthy and ready')
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    throw error
  }
}

function createWindow() {
  const port = process.env.PORT || '3001'
  const win = new BrowserWindow({
    width: 520,
    height: 380,
    resizable: true,
    title: 'Game Master Launcher',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Uncomment to debug: win.webContents.openDevTools()

  win.loadFile(path.join(__dirname, 'ui.html'))
}



// Register IPC handlers once
const port = process.env.PORT || '3001'
try {
  ipcMain.handle('lan-addresses', () => getLanAddresses(port))
  ipcMain.handle('open-control-panel', async (event, url) => {
    try {
      await shell.openExternal(url)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })
  
  // Update handlers
  ipcMain.handle('check-for-updates', async () => {
    if (!autoUpdater) {
      return { available: false, version: null, error: 'Auto-updater not available - please configure GitHub repository in package.json' }
    }
    try {
      const result = await autoUpdater.checkForUpdates()
      return { 
        available: result?.updateInfo ? true : false,
        version: result?.updateInfo?.version || null,
        error: null
      }
    } catch (e) {
      console.error('❌ Update check failed:', e.message)
      return { available: false, version: null, error: `Update check failed: ${e.message}` }
    }
  })
  
  ipcMain.handle('download-update', async () => {
    if (!autoUpdater) {
      return { success: false, error: 'Auto-updater not available - please configure GitHub repository in package.json' }
    }
    try {
      await autoUpdater.downloadUpdate()
      return { success: true, error: null }
    } catch (e) {
      console.error('❌ Update download failed:', e.message)
      return { success: false, error: `Download failed: ${e.message}` }
    }
  })
  
  ipcMain.handle('install-update', () => {
    if (!autoUpdater) {
      return { success: false, error: 'Auto-updater not available - please configure GitHub repository in package.json' }
    }
    try {
      autoUpdater.quitAndInstall()
      return { success: true }
    } catch (e) {
      console.error('❌ Update install failed:', e.message)
      return { success: false, error: `Install failed: ${e.message}` }
    }
  })
} catch {}

// Add process error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  // Don't exit immediately, try to handle gracefully
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
})

app.whenReady().then(async () => {
  try {
    // Initialize auto-updater
    await initAutoUpdater()
    
    const port = process.env.PORT || '3001'
    // Start server first
    await startServer()
    // Create UI window
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (error) {
    console.error('❌ Failed to start application:', error)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})


