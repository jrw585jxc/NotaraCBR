/**
 * Comic file loader — bridges the Electron IPC and PDF.js renderer-side loading.
 */

import { libraryStore } from '../store/libraryStore';

const api = window.electronAPI;

// ─── Comic page cache ─────────────────────────────────────────────────────
// filePath → loaded result. Pages are data-URIs; cache is session-only.
const _comicCache = new Map();

export async function loadComic(filePath) {
  if (_comicCache.has(filePath)) return _comicCache.get(filePath);

  const ext = filePath.split('.').pop().toLowerCase();
  let result;

  if (ext === 'cbz') {
    const r = await api.readCBZ(filePath);
    if (r.error) throw new Error(r.error);
    result = { pages: r.pages, type: 'image', count: r.count };
  } else if (ext === 'cbr') {
    const r = await api.readCBR(filePath);
    if (r.error) throw new Error(r.error);
    result = { pages: r.pages, type: 'image', count: r.count };
  } else if (ext === 'pdf') {
    result = { filePath, type: 'pdf', count: 0 };
  } else {
    throw new Error(`Unsupported format: .${ext}`);
  }

  _comicCache.set(filePath, result);
  return result;
}

export function evictComicCache(filePath) { _comicCache.delete(filePath); }
export function clearComicCache()         { _comicCache.clear(); }

// ─── Cover ────────────────────────────────────────────────────────────────
// Covers are cached on disk (userData/covers/) keyed by fingerprint.
// On startup they load from disk (fast) rather than re-extracting from archives.

export async function getCover(filePath, fingerprint) {
  // 1. Try disk cache
  if (fingerprint) {
    const cached = await api.readCover(fingerprint);
    if (cached) return cached;
  }
  // 2. Extract from archive
  try {
    const cover = await api.getCover(filePath);
    if (cover && fingerprint) api.writeCover(fingerprint, cover); // persist for next time
    return cover;
  } catch { return null; }
}

// ─── Progress file helpers ────────────────────────────────────────────────
//
// Progress is stored in <comicsDirectory>/.notara-progress.json so it travels
// with the comics folder on Proton Drive (or any synced storage) and is
// automatically available on every machine connected to the same folder.
//
// Each entry is keyed by the comic's *fingerprint* (file-size + hash of
// first 64 KB) rather than its path, so progress survives renames and moves.

async function readProgressFile(dir) {
  try {
    return await api.readProgress(dir);
  } catch {
    return { version: 1, entries: {} };
  }
}

async function writeProgressFile(dir, data) {
  try { await api.writeProgress(dir, data); } catch {}
}

/**
 * Persists reading progress both to localStorage (via the store) and to the
 * shared progress file so other machines pick it up.
 */
export async function saveProgressToFile(comicId, currentPage, totalPages) {
  // Update in-memory store + localStorage first (synchronous)
  libraryStore.saveProgress(comicId, currentPage, totalPages);

  const dir = libraryStore.getState().settings.comicsDirectory;
  if (!dir) return;

  const comic = libraryStore.getState().comics[comicId];
  if (!comic?.fingerprint) return;

  const progressData = await readProgressFile(dir);
  if (!progressData.entries) progressData.entries = {};
  progressData.entries[comic.fingerprint] = {
    name:            comic.name,
    currentPage:     comic.currentPage,
    totalPages:      comic.totalPages,
    percentComplete: comic.percentComplete,
    status:          comic.status,
    dateAdded:       comic.dateAdded,
    lastRead:        comic.lastRead,
  };
  await writeProgressFile(dir, progressData);
}

// ─── Internal: add one file, restoring saved progress if available ────────

async function _addOneComic(fp, progressData, { addComic, setCover }) {
  // Fast path: path already known → nothing to do.
  // This is the common case on every startup and requires no disk I/O.
  if (libraryStore.getComicByPath(fp)) return null;

  // Slow path: path is unknown — either a new file or a file that was moved.
  // Compute fingerprint (reads first 64 KB) to tell them apart.
  const fingerprint = await api.fingerprint(fp);

  // Moved file: fingerprint matches an existing entry → just update the path.
  const existingByFp = libraryStore.getComicByFingerprint(fingerprint);
  if (existingByFp) {
    libraryStore.updateComic(existingByFp.id, { filePath: fp });
    return null;
  }

  const meta = await api.getMetadata(fp);
  const id = addComic(fp, { ...(meta || {}), fingerprint });

  // Restore saved progress from the file if this comic was tracked before
  const saved = fingerprint && progressData?.entries?.[fingerprint];
  if (saved) {
    libraryStore.updateComic(id, {
      currentPage:     saved.currentPage     ?? 0,
      totalPages:      saved.totalPages      ?? 0,
      percentComplete: saved.percentComplete ?? 0,
      status:          saved.status          ?? 'unread',
      lastRead:        saved.lastRead        ?? null,
      // Keep dateAdded from the saved record so "added" date is stable
      dateAdded:       saved.dateAdded       ?? new Date().toISOString(),
    });
  }

  getCover(fp, fingerprint).then(cover => { if (cover) setCover(id, cover); });
  return id;
}

// ─── Public: add individual files ────────────────────────────────────────

export async function addFilesToLibrary({ addComic, setCover, setTotalPages }) {
  const filePaths = await api.openComics();
  const dir = libraryStore.getState().settings.comicsDirectory;
  const progressData = dir ? await readProgressFile(dir) : { version: 1, entries: {} };

  const ids = [];
  for (const fp of filePaths) {
    const id = await _addOneComic(fp, progressData, { addComic, setCover });
    if (id) ids.push(id);
  }
  return ids;
}

// ─── Public: add folder ───────────────────────────────────────────────────

export async function addFolderToLibrary({ addComic, setCover, setComicsDirectory }) {
  const folders = await api.openFolder();
  if (!folders.length) return [];

  const chosenFolder = folders[0];
  if (setComicsDirectory) setComicsDirectory(chosenFolder);

  const progressData = await readProgressFile(chosenFolder);

  const ids = [];
  for (const folder of folders) {
    const filePaths = await api.scanFolder(folder);
    for (const fp of filePaths) {
      const id = await _addOneComic(fp, progressData, { addComic, setCover });
      if (id) ids.push(id);
    }
  }
  return ids;
}

// ─── Public: sync directory on startup / refresh ─────────────────────────

/**
 * Scans the persisted comicsDirectory and:
 *  - Updates file paths for comics that were moved (matched by fingerprint)
 *  - Adds new comics, restoring progress from the progress file
 *  - Loads covers for all comics (from disk cache or archive) in one batch
 *    so the grid only re-renders once instead of once per comic
 *  - Returns the count of newly added comics
 */
export async function syncComicsDirectory({ addComic, setCover }) {
  const dir = libraryStore.getState().settings.comicsDirectory;
  if (!dir) return 0;

  const [filePaths, progressData] = await Promise.all([
    api.scanFolder(dir),
    readProgressFile(dir),
  ]);

  // ── Phase 1: catalog — add new comics, detect moves ──────────────────────
  let added = 0;
  for (const fp of filePaths) {
    const id = await _addOneComic(fp, progressData, { addComic, setCover: () => {} });
    if (id) added++;
  }

  // ── Phase 2: covers — load all in parallel, apply in one batch update ─────
  // Because covers are stripped from localStorage on save, every comic needs
  // its cover loaded on each launch. Loading in parallel and applying at once
  // means the grid only re-renders once rather than N times.
  const state = libraryStore.getState();
  const allComics = Object.values(state.comics);

  const coverResults = await Promise.all(
    allComics.map(async (comic) => {
      const cover = await getCover(comic.filePath, comic.fingerprint);
      return [comic.id, cover];
    })
  );

  const coversMap = Object.fromEntries(coverResults.filter(([, cover]) => cover));
  libraryStore.setCovers(coversMap); // single store mutation → one React re-render

  return added;
}
