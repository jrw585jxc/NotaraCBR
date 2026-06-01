const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Handle Squirrel install/update/uninstall events — must be before anything else.
// This creates/removes Start Menu shortcuts so the app appears in Windows Search.
if (require('electron-squirrel-startup')) app.quit();

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let coversDir; // initialised in app.whenReady so app.getPath() is available

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
  coversDir = path.join(app.getPath('userData'), 'covers');
  fs.mkdirSync(coversDir, { recursive: true });
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
  // createExtractorFromFile avoids loading the whole archive into a Node Buffer
  // (required for files >~2 GB). It writes extracted content to a temp dir on
  // disk; we read those files back and build the data-URI array, then clean up.
  const tmpDir = path.join(os.tmpdir(), `notara-cbr-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    const unrar = require('node-unrar-js');
    fs.mkdirSync(tmpDir, { recursive: true });

    const extractor = await unrar.createExtractorFromFile({ filepath: filePath, targetPath: tmpDir });
    const list = extractor.getFileList();
    const fileHeaders = [...list.fileHeaders];
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const imageFiles = fileHeaders
      .filter(h => !h.flags.directory && imageExts.some(e => h.name.toLowerCase().endsWith(e)))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    // Consume the iterator to trigger disk extraction
    const extracted = extractor.extract({ files: imageFiles.map(f => f.name) });
    for (const _ of extracted.files) { /* extraction side-effect */ }

    // Read extracted files from temp dir and build data URIs
    const pages = [];
    for (const imgFile of imageFiles) {
      try {
        const extractedPath = path.join(tmpDir, imgFile.name);
        const data = fs.readFileSync(extractedPath);
        const base64 = data.toString('base64');
        const ext = path.extname(imgFile.name).toLowerCase().slice(1);
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        pages.push(`data:${mime};base64,${base64}`);
      } catch { /* skip unreadable pages */ }
    }
    return { pages, count: pages.length };
  } catch (e) {
    return { error: e.message, pages: [], count: 0 };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
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

// ─── IPC: Cover disk cache (userData/covers/<fingerprint>.b64) ────────────
// Covers are large base64 strings — keeping them out of localStorage prevents
// the 5 MB limit from being hit, which was silently wiping the whole library.
ipcMain.handle('cover:read', (_, fingerprint) => {
  try {
    return fs.readFileSync(path.join(coversDir, `${fingerprint}.b64`), 'utf8');
  } catch { return null; }
});

ipcMain.handle('cover:write', (_, fingerprint, dataUrl) => {
  try {
    fs.writeFileSync(path.join(coversDir, `${fingerprint}.b64`), dataUrl, 'utf8');
    return true;
  } catch { return false; }
});

// ─── IPC: File fingerprint (size + SHA-256 of first 64 KB) ────────────────
// Stable across renames/moves. Used to key progress so it survives path changes.
ipcMain.handle('comic:fingerprint', async (_, filePath) => {
  try {
    const stat = fs.statSync(filePath);
    const chunkSize = Math.min(stat.size, 65536);
    const buf = Buffer.alloc(chunkSize);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, chunkSize, 0);
    fs.closeSync(fd);
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    return `${stat.size}:${hash}`;
  } catch {
    return null;
  }
});

// ─── IPC: Progress file (stored alongside comics for cross-machine sync) ───
const PROGRESS_FILE = '.notara-progress.json';

ipcMain.handle('progress:read', async (_, folderPath) => {
  try {
    const raw = fs.readFileSync(path.join(folderPath, PROGRESS_FILE), 'utf8');
    return JSON.parse(raw);
  } catch {
    return { version: 1, entries: {} };
  }
});

ipcMain.handle('progress:write', async (_, folderPath, data) => {
  try {
    fs.writeFileSync(
      path.join(folderPath, PROGRESS_FILE),
      JSON.stringify(data, null, 2),
      'utf8'
    );
    return true;
  } catch {
    return false;
  }
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
      const coverTmp = path.join(os.tmpdir(), `notara-cover-${Date.now()}`);
      fs.mkdirSync(coverTmp, { recursive: true });
      try {
        const extractor = await unrar.createExtractorFromFile({ filepath: filePath, targetPath: coverTmp });
        const list = extractor.getFileList();
        const fileHeaders = [...list.fileHeaders];
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif'];
        const first = fileHeaders
          .filter(h => !h.flags.directory && imageExts.some(e => h.name.toLowerCase().endsWith(e)))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))[0];
        if (first) {
          const extracted = extractor.extract({ files: [first.name] });
          for (const _ of extracted.files) { /* extraction side-effect */ }
          const data = fs.readFileSync(path.join(coverTmp, first.name));
          return `data:image/jpeg;base64,${data.toString('base64')}`;
        }
      } finally {
        try { fs.rmSync(coverTmp, { recursive: true, force: true }); } catch {}
      }
    }
    return null;
  } catch (e) {
    return null;
  }
});
