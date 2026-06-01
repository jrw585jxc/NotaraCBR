import { useState, useEffect, useCallback } from 'react';
import Library from './components/Library';
import Reader from './components/Reader';
import { useLibrary } from './hooks/useLibrary';
import { applyAccentColor } from './utils/accentColors';
import { syncComicsDirectory } from './utils/comicLoader';

export default function App() {
  const [activeComicId, setActiveComicId] = useState(null);
  const library = useLibrary();

  // Keep CSS accent vars in sync with the persisted setting
  useEffect(() => {
    applyAccentColor(library.settings?.accentColor || 'orange');
  }, [library.settings?.accentColor]);

  // On startup, rescan the saved comics directory for new files
  useEffect(() => {
    if (library.settings?.comicsDirectory) {
      syncComicsDirectory({
        addComic: library.addComic,
        setCover: library.setCover,
      });
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openComic  = useCallback((id) => setActiveComicId(id), []);
  const closeReader = useCallback(() => setActiveComicId(null), []);

  const activeComic = activeComicId ? library.state.comics[activeComicId] : null;

  return (
    <div className="w-full h-full overflow-hidden bg-bg-base text-text-primary select-none">
      {activeComic ? (
        <Reader
          comic={activeComic}
          onClose={closeReader}
          saveProgress={(page, total) => library.saveProgress(activeComicId, page, total)}
        />
      ) : (
        <Library
          library={library}
          onOpenComic={openComic}
        />
      )}
    </div>
  );
}
