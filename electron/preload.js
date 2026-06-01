const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize:      () => ipcRenderer.send('window:minimize'),
  maximize:      () => ipcRenderer.send('window:maximize'),
  close:         () => ipcRenderer.send('window:close'),
  setFullscreen: (enter) => ipcRenderer.send('window:fullscreen', enter),
  isFullscreen:  () => ipcRenderer.invoke('window:isFullscreen'),

  // File dialogs
  openComics: () => ipcRenderer.invoke('dialog:openComics'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

  // Comic reading
  getMetadata: (filePath) => ipcRenderer.invoke('comic:getMetadata', filePath),
  readCBZ: (filePath) => ipcRenderer.invoke('comic:readCBZ', filePath),
  readCBR: (filePath) => ipcRenderer.invoke('comic:readCBR', filePath),
  readPDF: (filePath) => ipcRenderer.invoke('comic:readPDF', filePath),
  getCover: (filePath) => ipcRenderer.invoke('comic:getCover', filePath),

  // Library
  scanFolder: (folderPath) => ipcRenderer.invoke('library:scanFolder', folderPath),

  // Fingerprinting & progress file
  fingerprint:   (filePath)         => ipcRenderer.invoke('comic:fingerprint', filePath),
  readProgress:  (folderPath)       => ipcRenderer.invoke('progress:read', folderPath),
  writeProgress: (folderPath, data) => ipcRenderer.invoke('progress:write', folderPath, data),

  // Cover disk cache
  readCover:  (fingerprint)          => ipcRenderer.invoke('cover:read', fingerprint),
  writeCover: (fingerprint, dataUrl) => ipcRenderer.invoke('cover:write', fingerprint, dataUrl),
});
