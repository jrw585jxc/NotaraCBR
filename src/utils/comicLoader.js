/**
 * Comic file loader — bridges the Electron IPC and PDF.js renderer-side loading.
 */

const api = window.electronAPI;

export async function loadComic(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();

  if (ext === 'cbz') {
    const result = await api.readCBZ(filePath);
    if (result.error) throw new Error(result.error);
    return { pages: result.pages, type: 'image', count: result.count };
  }

  if (ext === 'cbr') {
    const result = await api.readCBR(filePath);
    if (result.error) throw new Error(result.error);
    return { pages: result.pages, type: 'image', count: result.count };
  }

  if (ext === 'pdf') {
    // For PDF we return the path and let the component handle it via pdf.js
    return { filePath, type: 'pdf', count: 0 };
  }

  throw new Error(`Unsupported format: .${ext}`);
}

export async function getCover(filePath) {
  try {
    return await api.getCover(filePath);
  } catch {
    return null;
  }
}

export async function addFilesToLibrary({ addComic, setCover, setTotalPages }) {
  const filePaths = await api.openComics();
  const ids = [];
  for (const fp of filePaths) {
    const meta = await api.getMetadata(fp);
    const id = addComic(fp, meta || {});
    ids.push(id);
    // Load cover in background
    getCover(fp).then(cover => {
      if (cover) setCover(id, cover);
    });
  }
  return ids;
}

export async function addFolderToLibrary({ addComic, setCover }) {
  const folders = await api.openFolder();
  const ids = [];
  for (const folder of folders) {
    const filePaths = await api.scanFolder(folder);
    for (const fp of filePaths) {
      const meta = await api.getMetadata(fp);
      const id = addComic(fp, meta || {});
      ids.push(id);
      getCover(fp).then(cover => {
        if (cover) setCover(id, cover);
      });
    }
  }
  return ids;
}
