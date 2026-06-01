/**
 * NotaraCBR Library Store
 * Persists to localStorage (dev) or electron-store (production).
 * Shape:
 *   comics: { [id]: ComicEntry }
 *   collections: { [id]: Collection }
 *   tags: string[]
 *   settings: Settings
 */

const STORAGE_KEY = 'notara-cbr-library';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let _saveTimer = null;
function save(state) {
  // Debounce: many rapid updates (e.g. cover loads on startup) collapse into one write.
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      // Strip covers before saving — they're large base64 strings that push
      // localStorage over its ~5 MB limit, silently wiping the whole store.
      // Covers are cached on disk in Electron's userData instead.
      const stripped = {
        ...state,
        comics: Object.fromEntries(
          Object.entries(state.comics).map(([id, c]) => [id, { ...c, cover: null }])
        ),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
    } catch {}
  }, 400);
}

const DEFAULT_STATE = {
  comics: {},
  collections: {},
  tags: [],
  settings: {
    defaultView: 'grid',
    gridSize: 'medium',
    sortBy: 'dateAdded',
    sortDir: 'desc',
    theme: 'dark',
    accentColor: 'orange',
    comicsDirectory: null,
  },
};

class LibraryStore {
  constructor() {
    const saved = load();
    this._state = saved || { ...DEFAULT_STATE };
    this._listeners = new Set();
  }

  getState() {
    return this._state;
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify() {
    save(this._state);
    this._listeners.forEach(fn => fn(this._state));
  }

  // ─── Comics ───────────────────────────────────────────────────────────────

  addComic(filePath, meta = {}) {
    const id = generateId();
    const comic = {
      id,
      filePath,
      fingerprint: meta.fingerprint || null,
      name: meta.name || filePath.split(/[\\/]/).pop().replace(/\.\w+$/, ''),
      ext: meta.ext || filePath.split('.').pop().toLowerCase(),
      size: meta.size || 0,
      cover: null,
      totalPages: 0,
      currentPage: 0,
      percentComplete: 0,
      status: 'unread', // unread | reading | completed | on-hold | dropped
      tags: [],
      series: meta.series || '',
      publisher: meta.publisher || '',
      issue: meta.issue || '',
      rating: 0, // 0-5
      notes: '',
      collectionIds: [],
      dateAdded: new Date().toISOString(),
      lastRead: null,
    };
    this._state = {
      ...this._state,
      comics: { ...this._state.comics, [id]: comic },
    };
    this._notify();
    return id;
  }

  updateComic(id, updates) {
    if (!this._state.comics[id]) return;
    this._state = {
      ...this._state,
      comics: {
        ...this._state.comics,
        [id]: { ...this._state.comics[id], ...updates },
      },
    };
    this._notify();
  }

  removeComic(id) {
    const { [id]: _, ...rest } = this._state.comics;
    // Remove from all collections
    const collections = { ...this._state.collections };
    Object.keys(collections).forEach(cid => {
      collections[cid] = {
        ...collections[cid],
        comicIds: collections[cid].comicIds.filter(cid2 => cid2 !== id),
      };
    });
    this._state = { ...this._state, comics: rest, collections };
    this._notify();
  }

  saveProgress(id, currentPage, totalPages) {
    if (!this._state.comics[id]) return;
    const percent = totalPages > 0 ? Math.round((currentPage / (totalPages - 1)) * 100) : 0;
    const status = percent >= 100 ? 'completed' : currentPage > 0 ? 'reading' : 'unread';
    this.updateComic(id, {
      currentPage,
      totalPages,
      percentComplete: Math.min(percent, 100),
      status,
      lastRead: new Date().toISOString(),
    });
  }

  setCover(id, coverDataUrl) {
    this.updateComic(id, { cover: coverDataUrl });
  }

  /** Apply covers for many comics in one store mutation → one React re-render. */
  setCovers(coversMap) {
    // coversMap: { [comicId]: dataUrl }
    const entries = Object.entries(coversMap).filter(([id]) => this._state.comics[id]);
    if (!entries.length) return;
    const comics = { ...this._state.comics };
    for (const [id, cover] of entries) {
      comics[id] = { ...comics[id], cover };
    }
    this._state = { ...this._state, comics };
    this._notify();
  }

  setTotalPages(id, count) {
    this.updateComic(id, { totalPages: count });
  }

  // ─── Collections ─────────────────────────────────────────────────────────

  addCollection(name, color = '#e8943a') {
    const id = generateId();
    const collection = { id, name, color, comicIds: [], dateCreated: new Date().toISOString() };
    this._state = {
      ...this._state,
      collections: { ...this._state.collections, [id]: collection },
    };
    this._notify();
    return id;
  }

  updateCollection(id, updates) {
    if (!this._state.collections[id]) return;
    this._state = {
      ...this._state,
      collections: { ...this._state.collections, [id]: { ...this._state.collections[id], ...updates } },
    };
    this._notify();
  }

  removeCollection(id) {
    const { [id]: _, ...rest } = this._state.collections;
    // Remove from comics
    const comics = { ...this._state.comics };
    Object.keys(comics).forEach(cid => {
      comics[cid] = {
        ...comics[cid],
        collectionIds: comics[cid].collectionIds.filter(c => c !== id),
      };
    });
    this._state = { ...this._state, collections: rest, comics };
    this._notify();
  }

  addToCollection(collectionId, comicId) {
    const col = this._state.collections[collectionId];
    if (!col || col.comicIds.includes(comicId)) return;
    this.updateCollection(collectionId, { comicIds: [...col.comicIds, comicId] });
    const comic = this._state.comics[comicId];
    if (comic && !comic.collectionIds.includes(collectionId)) {
      this.updateComic(comicId, { collectionIds: [...comic.collectionIds, collectionId] });
    }
  }

  removeFromCollection(collectionId, comicId) {
    const col = this._state.collections[collectionId];
    if (!col) return;
    this.updateCollection(collectionId, { comicIds: col.comicIds.filter(id => id !== comicId) });
    const comic = this._state.comics[comicId];
    if (comic) {
      this.updateComic(comicId, { collectionIds: comic.collectionIds.filter(id => id !== collectionId) });
    }
  }

  // ─── Tags ─────────────────────────────────────────────────────────────────

  addTag(tag) {
    if (this._state.tags.includes(tag)) return;
    this._state = { ...this._state, tags: [...this._state.tags, tag].sort() };
    this._notify();
  }

  removeTag(tag) {
    this._state = { ...this._state, tags: this._state.tags.filter(t => t !== tag) };
    // Remove from all comics
    const comics = { ...this._state.comics };
    Object.keys(comics).forEach(id => {
      comics[id] = { ...comics[id], tags: comics[id].tags.filter(t => t !== tag) };
    });
    this._state = { ...this._state, comics };
    this._notify();
  }

  addTagToComic(comicId, tag) {
    this.addTag(tag);
    const comic = this._state.comics[comicId];
    if (comic && !comic.tags.includes(tag)) {
      this.updateComic(comicId, { tags: [...comic.tags, tag] });
    }
  }

  removeTagFromComic(comicId, tag) {
    const comic = this._state.comics[comicId];
    if (comic) {
      this.updateComic(comicId, { tags: comic.tags.filter(t => t !== tag) });
    }
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  updateSettings(updates) {
    this._state = { ...this._state, settings: { ...this._state.settings, ...updates } };
    this._notify();
  }

  setComicsDirectory(dirPath) {
    this.updateSettings({ comicsDirectory: dirPath });
  }

  // ─── Dedup helper ─────────────────────────────────────────────────────────

  /** Returns the existing comic entry for a given file path, or null if not present. */
  getComicByPath(filePath) {
    return Object.values(this._state.comics).find(c => c.filePath === filePath) || null;
  }

  /** Returns the existing comic entry for a given fingerprint, or null if not present. */
  getComicByFingerprint(fingerprint) {
    if (!fingerprint) return null;
    return Object.values(this._state.comics).find(c => c.fingerprint === fingerprint) || null;
  }

  // ─── Computed views ───────────────────────────────────────────────────────

  getComicsByStatus(status) {
    return Object.values(this._state.comics).filter(c => c.status === status);
  }

  getComicsBySeries() {
    const groups = {};
    Object.values(this._state.comics).forEach(c => {
      const key = c.series || '(No Series)';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }

  getComicsByTag(tag) {
    return Object.values(this._state.comics).filter(c => c.tags.includes(tag));
  }

  getComicsInCollection(collectionId) {
    const col = this._state.collections[collectionId];
    if (!col) return [];
    return col.comicIds.map(id => this._state.comics[id]).filter(Boolean);
  }

  searchComics(query) {
    const q = query.toLowerCase();
    return Object.values(this._state.comics).filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.series.toLowerCase().includes(q) ||
      c.publisher.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q))
    );
  }
}

export const libraryStore = new LibraryStore();
