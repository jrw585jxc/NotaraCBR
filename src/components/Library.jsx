import { useState, useMemo } from 'react';
import Sidebar from './Sidebar';
import ComicGrid from './ComicGrid';
import TopBar from './TopBar';
import ComicDetail from './ComicDetail';
import { addFilesToLibrary, addFolderToLibrary } from '../utils/comicLoader';

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

  const { comics, collections, tags, state } = library;

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
      });
    } finally {
      setIsAdding(false);
    }
  };

  const selectedComic = selectedComicId ? state.comics[selectedComicId] : null;

  const headerTitle = useMemo(() => {
    if (search) return `Search: "${search}"`;
    const { type, value } = sidebarSection;
    if (type === 'status') return STATUS_LABELS[value] || 'All Comics';
    if (type === 'collection') return collections.find(c => c.id === value)?.name || 'Collection';
    if (type === 'tag') return `#${value}`;
    if (type === 'series') return value;
    return 'All Comics';
  }, [sidebarSection, search, collections]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        library={library}
        activeSection={sidebarSection}
        onSelectSection={setSidebarSection}
        onAddFiles={handleAddFiles}
        onAddFolder={handleAddFolder}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          title={headerTitle}
          count={filteredComics.length}
          search={search}
          onSearch={setSearch}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={(field) => {
            if (field === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
            else { setSortBy(field); setSortDir('desc'); }
          }}
          viewMode={viewMode}
          onViewMode={setViewMode}
          accentColor={library.settings?.accentColor || 'orange'}
          onAccentColor={(id) => library.updateSettings({ accentColor: id })}
        />

        <div className="flex flex-1 overflow-hidden">
          <ComicGrid
            comics={filteredComics}
            viewMode={viewMode}
            onOpen={(id) => onOpenComic(id)}
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
