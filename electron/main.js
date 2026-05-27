const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Handle Squirrel install/update/uninstall events — must be before anything else.
// This creates/removes Start Menu shortcuts so the app appears in Windows Search.
if (require('electron-squirrel-startup')) app.quit();

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#111111',
    frame: false,          // frameless on all platforms — custom chrome in React
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // allow local file:// for images
    },
    icon: path.join(__dirname, process.platform === 'win32' ? '../public/icon.ico' : '../public/icon.png'),
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Window controls ──────────────────────────────────────────────────
ipcMain.on('window:minimize',    () => mainWindow?.minimize());
ipcMain.on('window:maximize',    () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window:close',       () => mainWindow?.close());
ipcMain.on('window:fullscreen',  (_, enter) => {
  if (!mainWindow) return;
  mainWindow.setFullScreen(enter);
});
ipcMain.handle('window:isFullscreen', () => mainWindow?.isFullScreen() ?? false);

// ─── IPC: Open file dialog ─────────────────────────────────────────────────
ipcMain.handle('dialog:openComics', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Add Comics to Library',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Comic Books', extensions: ['cbz', 'cbr', 'pdf'] },
      { name: 'CBZ', extensions: ['cbz'] },
      { name: 'CBR', extensions: ['cbr'] },
      { name: 'PDF', extensions: ['pdf'] },
    ],
  });
  return filePaths || [];
});

ipcMain.handle('dialog:openFolder', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Add Comics Folder',
    properties: ['openDirectory'],
  });
  return filePaths || [];
});

// ─── IPC: Read file metadata ────────────────────────────────────────────────
ipcMain.handle('comic:getMetadata', async (_, filePath) => {
  try {
    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);
    return {
      path: filePath,
      name: path.basename(filePath, path.extname(filePath)),
      ext,
      size: stat.size,
      modified: stat.mtime.toISOString(),
    };
  } catch (e) {
    return null;
  }
});

// ─── IPC: Read CBZ pages ────────────────────────────────────────────────────
ipcMain.handle('comic:readCBZ', async (_, filePath) => {
  try {
    const JSZip = require('jszip');
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const entries = Object.keys(zip.files)
      .filter(name => {
        const lower = name.toLowerCase();
        return imageExts.some(ext => lower.endsWith(ext)) && !zip.files[name].dir;
      })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const pages = await Promise.all(
      entries.map(async name => {
        const blob = await zip.files[name].async('base64');
        const ext = path.extname(name).toLowerCase().slice(1);
        const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
        return `data:${mime};base64,${blob}`;
      })
    );
    return { pages, count: pages.length };
  } catch (e) {
    return { error: e.message };
  }
});

// ─── IPC: Read CBR pages ────────────────────────────────────────────────────
ipcMain.handle('comic:readCBR', async (_, filePath) => {
  try {
    // Try unrar approach
    const unrar = require('node-unrar-js');
    const buf = fs.readFileSync(filePath);
    const extractor = await unrar.createExtractorFromData({ data: buf });
    const list = extractor.getFileList();
    const fileHeaders = [...list.fileHeaders];
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const imageFiles = fileHeaders
      .filter(h => !h.flags.directory && imageExts.some(e => h.name.toLowerCase().endsWith(e)))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const extracted = extractor.extract({ files: imageFiles.map(f => f.name) });
    const pages = [];
    for (const file of extracted.files) {
      if (file.extraction) {
        const base64 = Buffer.from(file.extraction).toString('base64');
        const ext = path.extname(file.fileHeader.name).toLowerCase().slice(1);
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        pages.push(`data:${mime};base64,${base64}`);
      }
    }
    return { pages, count: pages.length };
  } catch (e) {
    return { error: e.message, pages: [], count: 0 };
  }
});

// ─── IPC: Read PDF pages ────────────────────────────────────────────────────
ipcMain.handle('comic:readPDF', async (_, filePath) => {
  try {
    // Return file path; PDF.js will render in renderer
    return { filePath, type: 'pdf' };
  } catch (e) {
    return { error: e.message };
  }
});

// ─── IPC: Scan folder for comics ───────────────────────────────────────────
ipcMain.handle('library:scanFolder', async (_, folderPath) => {
  const extensions = ['.cbz', '.cbr', '.pdf'];
  const results = [];
  function scan(dir) {
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scan(fullPath);
          } else if (extensions.includes(path.extname(entry).toLowerCase())) {
            results.push(fullPath);
          }
        } catch {}
      }
    } catch {}
  }
  scan(folderPath);
  return results;
});

// ─── IPC: Get cover image (first page) ─────────────────────────────────────
ipcMain.handle('comic:getCover', async (_, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === '.cbz') {
      const JSZip = require('jszip');
      const data = fs.readFileSync(filePath);
      const zip = await JSZip.loadAsync(data);
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const first = Object.keys(zip.files)
        .filter(n => imageExts.some(e => n.toLowerCase().endsWith(e)) && !zip.files[n].dir)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
      if (first) {
        const blob = await zip.files[first].async('base64');
        const imgExt = path.extname(first).toLowerCase().slice(1);
        const mime = imgExt === 'png' ? 'image/png' : 'image/jpeg';
        return `data:${mime};base64,${blob}`;
      }
    } else if (ext === '.cbr') {
      const unrar = require('node-unrar-js');
      const buf = fs.readFileSync(filePath);
      const extractor = await unrar.createExtractorFromData({ data: buf });
      const list = extractor.getFileList();
      const fileHeaders = [...list.fileHeaders];
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif'];
      const first = fileHeaders
        .filter(h => !h.flags.directory && imageExts.some(e => h.name.toLowerCase().endsWith(e)))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))[0];
      if (first) {
        const extracted = extractor.extract({ files: [first.name] });
        for (const file of extracted.files) {
          if (file.extraction) {
            const base64 = Buffer.from(file.extraction).toString('base64');
            return `data:image/jpeg;base64,${base64}`;
          }
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
});
