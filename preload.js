const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron:    true,
  getAppPaths:   ()              => ipcRenderer.invoke('get-app-paths'),
  openFiles:     ()              => ipcRenderer.invoke('open-file-dialog'),
  parsePdf:      (path)          => ipcRenderer.invoke('parse-pdf', path),
  ocrImage:      (base64)        => ipcRenderer.invoke('ocr-image', base64),
  readTextFile:  (path)          => ipcRenderer.invoke('read-text-file', path),
  readFileB64:   (path)          => ipcRenderer.invoke('read-file-base64', path),
})
