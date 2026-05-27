import { useState, useEffect, useCallback } from 'react';
import { libraryStore } from '../store/libraryStore';

export function useLibrary() {
  const [state, setState] = useState(() => libraryStore.getState());

  useEffect(() => {
    return libraryStore.subscribe(setState);
  }, []);

  const comics = Object.values(state.comics);

  return {
    state,
    comics,
    collections: Object.values(state.collections),
    tags: state.tags,
    settings: state.settings,

    // Comics
    addComic: useCallback((...args) => libraryStore.addComic(...args), []),
    updateComic: useCallback((...args) => libraryStore.updateComic(...args), []),
    removeComic: useCallback((...args) => libraryStore.removeComic(...args), []),
    saveProgress: useCallback((...args) => libraryStore.saveProgress(...args), []),
    setCover: useCallback((...args) => libraryStore.setCover(...args), []),
    setTotalPages: useCallback((...args) => libraryStore.setTotalPages(...args), []),

    // Collections
    addCollection: useCallback((...args) => libraryStore.addCollection(...args), []),
    updateCollection: useCallback((...args) => libraryStore.updateCollection(...args), []),
    removeCollection: useCallback((...args) => libraryStore.removeCollection(...args), []),
    addToCollection: useCallback((...args) => libraryStore.addToCollection(...args), []),
    removeFromCollection: useCallback((...args) => libraryStore.removeFromCollection(...args), []),

    // Tags
    addTagToComic: useCallback((...args) => libraryStore.addTagToComic(...args), []),
    removeTagFromComic: useCallback((...args) => libraryStore.removeTagFromComic(...args), []),

    // Settings
    updateSettings: useCallback((...args) => libraryStore.updateSettings(...args), []),

    // Computed
    getComicsByStatus: useCallback((...args) => libraryStore.getComicsByStatus(...args), []),
    getComicsBySeries: useCallback(() => libraryStore.getComicsBySeries(), []),
    searchComics: useCallback((...args) => libraryStore.searchComics(...args), []),
    getComicsInCollection: useCallback((...args) => libraryStore.getComicsInCollection(...args), []),
  };
}
