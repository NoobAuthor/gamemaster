const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('gm', {
  getLanAddresses: () => ipcRenderer.invoke('lan-addresses'),
  openControlPanel: (url) => ipcRenderer.invoke('open-control-panel', url),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update')
})


