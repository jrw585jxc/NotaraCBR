import { useState, useMemo, useCallback, useRef, startTransition } from 'react';
import Sidebar from './Sidebar';
import ComicGrid from './ComicGrid';
import TopBar from './TopBar';
import ComicDetail from './ComicDetail';
import { addFilesToLibrary, addFolderToLibrary, syncComicsDirectory } from '../utils/comicLoader';

const STATUS_LABELS = {
  all: 'All Comics',
  unread: 'Unread',
  reading: 'Currently Reading',
  completed: 'Completed',
  'on-hold': 'On Hold',
  dropped: 'Dropped',
};

export default function Library({ library, onOpenComic }) {
  const [sidebarSection, setSidebarSection] = useState({ type: 'status', value: 'all' });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('dateAdded');
  const [sortDir, setSortDir] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [selectedComicId, setSelectedComicId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Current folder path for nested folder navigation (array of folder name segments)
  const [folderPath, setFolderPath] = useState([]);

  const { comics, collections, tags, state } = library;

  // Reset folder path when section changes
  const handleSectionChange = useCallback((section) => {
    setFolderPath([]);
    startTransition(() => setSidebarSection(section));
  }, []);

  // Reset folder path when search is used
  const handleSearch = useCallback((v) => {
    if (v) setFolderPath([]);
    setSearch(v);
  }, []);

  // Filter comics based on sidebar selection + search
  const filteredComics = useMemo(() => {
    let list = comics;

    if (search.trim()) {
      list = library.searchComics(search.trim());
    } else {
      const { type, value } = sidebarSection;
      if (type === 'status' && value !== 'all') {
        list = list.filter(c => c.status === value);
      } else if (type === 'collection') {
        list = library.getComicsInCollection(value);
      } else if (type === 'tag') {
        list = list.filter(c => c.tags.includes(value));
      } else if (type === 'series') {
        list = list.filter(c => (c.series || '(No Series)') === value);
      }
    }

    // Sort
    list = [...list].sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [comics, sidebarSection, search, sortBy, sortDir]);

  // Folder navigation contents — only active for "All Comics" + a comics directory is set + not searching.
  // Returns { subfolders: [{name, count}], comics: Comic[], folderPath, onNavigate } or null for flat view.
  const folderContents = useMemo(() => {
    const dir = library.settings?.comicsDirectory;
    if (!dir || search.trim() || sidebarSection.type !== 'status' || sidebarSection.value !== 'all') {
      return null;
    }

    const normalize = p => p.replace(/\\/g, '/');
    const normDir = normalize(dir).replace(/\/$/, '');
    const currentPrefix = folderPath.join('/');

    const subfolderCounts = {};
    const subfolderCovers = {};
    const directComics = [];
    let hasAnySubfolder = false;

    for (const comic of filteredComics) {
      const normPath = normalize(comic.filePath);
      const rel = normPath.startsWith(normDir + '/')
        ? normPath.slice(normDir.length + 1)
        : normPath;

      // If navigated into a subfolder, only consider comics under that path
      if (currentPrefix && !rel.startsWith(currentPrefix + '/')) continue;

      const relFromCurrent = currentPrefix ? rel.slice(currentPrefix.length + 1) : rel;
      const parts = relFromCurrent.split('/');

      if (parts.length === 1) {
        directComics.push(comic);
      } else {
        hasAnySubfolder = true;
        const sub = parts[0];
        subfolderCounts[sub] = (subfolderCounts[sub] || 0) + 1;
        if (!subfolderCovers[sub]) subfolderCovers[sub] = [];
        if (subfolderCovers[sub].length < 4 && comic.cover) subfolderCovers[sub].push(comic.cover);
      }
    }

    // No subfolders at all at root level → fall through to plain flat view
    if (folderPath.length === 0 && !hasAnySubfolder) return null;

    const subfolders = Object.entries(subfolderCounts)
      .map(([name, count]) => ({ name, count, covers: subfolderCovers[name] || [] }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    return {
      subfolders,
      comics: directComics,
      folderPath,
      onNavigate: setFolderPath,
    };
  }, [filteredComics, library.settings?.comicsDirectory, folderPath, search, sidebarSection]);

  const handleAddFiles = async () => {
    if (isAdding) return;
    setIsAdding(true);
    try {
      await addFilesToLibrary({
        addComic: library.addComic,
        setCover: library.setCover,
        setTotalPages: library.setTotalPages,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddFolder = async () => {
    if (isAdding) return;
    setIsAdding(true);
    try {
      await addFolderToLibrary({
        addComic: library.addComic,
        setCover: library.setCover,
        setComicsDirectory: library.setComicsDirectory,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing || isAdding) return;
    setIsRefreshing(true);
    try {
      await syncComicsDirectory({
        addComic: library.addComic,
        setCover: library.setCover,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const selectedComic = selectedComicId ? state.comics[selectedComicId] : null;

  const headerTitle = useMemo(() => {
    if (search) return `Search: "${search}"`;
    if (folderContents && folderPath.length > 0) return folderPath[folderPath.length - 1];
    const { type, value } = sidebarSection;
    if (type === 'status') return STATUS_LABELS[value] || 'All Comics';
    if (type === 'collection') return collections.find(c => c.id === value)?.name || 'Collection';
    if (type === 'tag') return `#${value}`;
    if (type === 'series') return value;
    return 'All Comics';
  }, [sidebarSection, search, collections, folderContents, folderPath]);

  // Count shown in TopBar: current folder items when navigating, otherwise total filtered
  const displayCount = folderContents
    ? folderContents.subfolders.length + folderContents.comics.length
    : filteredComics.length;

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        comics={comics}
        collections={collections}
        tags={tags}
        activeSection={sidebarSection}
        onSelectSection={handleSectionChange}
        onAddFiles={handleAddFiles}
        onAddFolder={handleAddFolder}
        onAddCollection={library.addCollection}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          title={headerTitle}
          count={displayCount}
          search={search}
          onSearch={handleSearch}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={(field) => {
            startTransition(() => {
              if (field === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
              else { setSortBy(field); setSortDir('desc'); }
            });
          }}
          viewMode={viewMode}
          onViewMode={setViewMode}
          accentColor={library.settings?.accentColor || 'orange'}
          onAccentColor={(id) => library.updateSettings({ accentColor: id })}
          comicsDirectory={library.settings?.comicsDirectory}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <div className="flex flex-1 overflow-hidden">
          <ComicGrid
            comics={filteredComics}
            folderContents={folderContents}
            viewMode={viewMode}
            onOpen={onOpenComic}
            onSelect={setSelectedComicId}
            selectedId={selectedComicId}
          />

          {selectedComic && (
            <ComicDetail
              comic={selectedComic}
              library={library}
              onOpen={() => onOpenComic(selectedComicId)}
              onClose={() => setSelectedComicId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
