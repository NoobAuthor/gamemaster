import { app, BrowserWindow, ipcMain, shell } from 'electron'
import pkg from 'electron-updater'
const { autoUpdater } = pkg
import os from 'os'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { execSync } from 'child_process'

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
  const port = process.env.PORT || '3001'
  // Ensure writable DB location for packaged apps
  if (!process.env.GAMEMASTER_DB_PATH) {
    const dbPath = path.join(app.getPath('userData'), 'gamemaster.db')
    process.env.GAMEMASTER_DB_PATH = dbPath
  }
  process.env.NODE_ENV = 'production'

  const serverEntry = path.resolve(__dirname, '../server/index.js')
  await import(pathToFileURL(serverEntry).href)
  const healthy = await waitForServer(`http://127.0.0.1:${port}/api/health`, 15000)
  if (!healthy) {
    // Continue anyway; UI will still show URLs
    // eslint-disable-next-line no-console
    console.error('Server did not report healthy within timeout')
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

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify = false // We'll handle this manually
autoUpdater.autoDownload = false // Don't auto-download, let user choose

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
    try {
      const result = await autoUpdater.checkForUpdates()
      return { 
        available: result?.updateInfo ? true : false,
        version: result?.updateInfo?.version || null,
        error: null
      }
    } catch (e) {
      return { available: false, version: null, error: e.message }
    }
  })
  
  ipcMain.handle('download-update', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true, error: null }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
  
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall()
    return { success: true }
  })
} catch {}

app.whenReady().then(async () => {
  const port = process.env.PORT || '3001'
  // Start server first
  await startServer()
  // Create UI window
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})


