import { useRef, memo, useState, useEffect, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const STATUS_COLORS = {
  unread:    '#6b7280',
  reading:   '#3b82f6',
  completed: '#22c55e',
  'on-hold': '#e8943a',
  dropped:   '#ef4444',
};

const STATUS_LABELS = {
  unread:    'Unread',
  reading:   'Reading',
  completed: 'Done',
  'on-hold': 'On Hold',
  dropped:   'Dropped',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressRing({ percent, size = 32, stroke = 3 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2c2c2c" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={percent >= 100 ? '#22c55e' : '#e8943a'}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}

const ComicCard = memo(function ComicCard({ comic, selected, onOpen, onSelect }) {
  const isDblClick = useRef(false);

  const handleClick = () => {
    if (isDblClick.current) return;
    onSelect(comic.id);
  };

  const handleDblClick = () => {
    isDblClick.current = true;
    onOpen(comic.id);
    setTimeout(() => { isDblClick.current = false; }, 300);
  };

  const showProgress = comic.status === 'reading' || comic.status === 'completed';

  return (
    <div
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-[box-shadow,outline] duration-200 ${
        selected ? 'ring-2 ring-accent shadow-glow-amber' : 'hover:ring-1 hover:ring-border-bright'
      }`}
      onClick={handleClick}
      onDoubleClick={handleDblClick}
    >
      <div className="relative overflow-hidden" style={{ paddingTop: '150%', background: '#1c1c1c' }}>
        {comic.cover ? (
          <img
            src={comic.cover}
            alt={comic.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            draggable={false}
            decoding="async"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-bg-elevated to-bg-base">
            <span className="text-4xl opacity-30">{comic.ext === 'pdf' ? '📄' : '📚'}</span>
            <span className="text-xs text-text-muted text-center px-2 line-clamp-2">{comic.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: 72, background: 'linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)', pointerEvents: 'none' }}
        />
        <div className="absolute top-2 left-2">
          <span
            className="px-1.5 py-0.5 rounded text-xs font-medium"
            style={{
              background: `${STATUS_COLORS[comic.status]}22`,
              color: STATUS_COLORS[comic.status],
              border: `1px solid ${STATUS_COLORS[comic.status]}44`,
            }}
          >
            {STATUS_LABELS[comic.status]}
          </span>
        </div>
        {showProgress && (
          <div className="absolute top-2 right-2">
            <div className="relative">
              <ProgressRing percent={comic.percentComplete} />
              <span
                className="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
                style={{ color: comic.percentComplete >= 100 ? '#22c55e' : '#e8943a' }}
              >
                {comic.percentComplete}%
              </span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(comic.id); }}
            className="px-4 py-1.5 rounded-lg bg-accent text-bg-base text-xs font-bold shadow-lg hover:bg-accent-text transition-colors"
          >
            Read
          </button>
        </div>
      </div>
      <div className="p-2.5 bg-bg-surface">
        <p className="text-sm font-medium text-text-primary truncate leading-tight">{comic.name}</p>
        {comic.series && <p className="text-xs text-text-muted truncate mt-0.5">{comic.series}</p>}
        {comic.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {comic.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-overlay text-text-muted">#{tag}</span>
            ))}
            {comic.tags.length > 2 && <span className="text-[10px] text-text-muted">+{comic.tags.length - 2}</span>}
          </div>
        )}
      </div>
    </div>
  );
});

const ComicListItem = memo(function ComicListItem({ comic, selected, onOpen, onSelect }) {
  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
        selected ? 'bg-accent/10' : 'hover:bg-bg-elevated'
      }`}
      onClick={() => onSelect(comic.id)}
      onDoubleClick={() => onOpen(comic.id)}
    >
      <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-bg-elevated">
        {comic.cover
          ? <img src={comic.cover} alt="" className="w-full h-full object-cover" draggable={false} loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-xl opacity-30">📚</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-primary truncate">{comic.name}</p>
        <p className="text-xs text-text-muted truncate">
          {[comic.series, comic.publisher].filter(Boolean).join(' · ') || comic.ext?.toUpperCase()}
        </p>
        {comic.tags.length > 0 && (
          <div className="flex gap-1 mt-1">
            {comic.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-overlay text-text-muted">#{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {(comic.status === 'reading' || comic.status === 'completed') && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-bg-overlay overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${comic.percentComplete}%`, background: comic.percentComplete >= 100 ? '#22c55e' : '#e8943a' }}
              />
            </div>
            <span className="text-xs text-text-muted w-8 tabular-nums">{comic.percentComplete}%</span>
          </div>
        )}
        <span
          className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
          style={{ background: `${STATUS_COLORS[comic.status]}22`, color: STATUS_COLORS[comic.status] }}
        >
          {STATUS_LABELS[comic.status]}
        </span>
      </div>
    </div>
  );
});

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8 animate-fade-in">
      <div className="text-6xl opacity-20 select-none">📚</div>
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Your library is empty</h2>
        <p className="text-text-muted text-sm max-w-xs">
          Add CBZ, CBR, or PDF comic files to get started. Your reading progress is saved automatically.
        </p>
      </div>
    </div>
  );
}

// ─── Folder navigation components ────────────────────────────────────────────

/** Breadcrumb shown when inside a subfolder */
function FolderBreadcrumb({ folderPath, onNavigate }) {
  return (
    <div className="flex items-center gap-1 px-5 pt-4 pb-2 flex-wrap">
      <button
        onClick={() => onNavigate([])}
        className="text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        All Comics
      </button>
      {folderPath.map((segment, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-xs text-text-muted opacity-40">/</span>
          <button
            onClick={() => onNavigate(folderPath.slice(0, i + 1))}
            className={`text-xs transition-colors ${
              i === folderPath.length - 1
                ? 'text-text-primary font-medium'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {segment}
          </button>
        </span>
      ))}
    </div>
  );
}

/** 2×2 cover collage for folder cards */
function FolderCoverCollage({ covers }) {
  if (covers.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#1c1c1c' }}>
        <span style={{ fontSize: 52, lineHeight: 1 }}>📁</span>
      </div>
    );
  }
  if (covers.length === 1) {
    return (
      <>
        <img src={covers[0]} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 40%, rgba(0,0,0,0.65) 100%)' }} />
      </>
    );
  }
  // 2x2 grid for 2–4 covers
  const slots = [covers[0], covers[1], covers[2] ?? null, covers[3] ?? null];
  return (
    <div className="absolute inset-0" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, background: '#111' }}>
      {slots.map((src, i) => (
        <div key={i} style={{ overflow: 'hidden', background: '#1c1c1c' }}>
          {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />}
        </div>
      ))}
      {/* Scrim so name text reads clearly */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.75) 100%)' }} />
    </div>
  );
}

/** Folder card for grid view */
function FolderCard({ name, count, covers = [], onClick }) {
  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-border-bright"
    >
      <div style={{ paddingTop: '150%', position: 'relative', background: '#1c1c1c' }}>
        <FolderCoverCollage covers={covers} />
        {/* Bottom label */}
        <div className="absolute inset-x-0 bottom-0 p-2.5" style={{ zIndex: 1 }}>
          <p className="text-sm font-semibold text-white truncate leading-tight drop-shadow">{name}</p>
          <p className="text-xs mt-0.5 drop-shadow" style={{ color: 'rgba(255,255,255,0.6)' }}>{count} {count === 1 ? 'item' : 'items'}</p>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ zIndex: 2 }} />
      </div>
    </div>
  );
}

/** Folder row for list view */
function FolderListItem({ name, count, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-bg-elevated transition-colors"
    >
      <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-bg-elevated flex items-center justify-center text-2xl">
        📁
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-primary truncate">{name}</p>
        <p className="text-xs text-text-muted">{count} {count === 1 ? 'item' : 'items'}</p>
      </div>
      <svg className="w-4 h-4 text-text-muted opacity-40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Tracks the pixel width of a DOM element via ResizeObserver. */
function useContainerWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

// ─── Virtual grid ─────────────────────────────────────────────────────────────

const CARD_MIN   = 160;
const CARD_GAP   = 16;
const CARD_H     = 300;
const PADDING    = 20;

function VirtualGrid({ comics, selectedId, onOpen, onSelect }) {
  const parentRef = useRef(null);
  const width = useContainerWidth(parentRef);

  const cols = useMemo(() => {
    if (!width) return 1;
    const available = width - PADDING * 2;
    return Math.max(1, Math.floor((available + CARD_GAP) / (CARD_MIN + CARD_GAP)));
  }, [width]);

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < comics.length; i += cols) {
      result.push(comics.slice(i, i + cols));
    }
    return result;
  }, [comics, cols]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_H + CARD_GAP,
    overscan: 3,
  });

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto" style={{ padding: PADDING, willChange: 'scroll-position' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(vRow => (
          <div
            key={vRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${vRow.start}px)`,
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: CARD_GAP,
              paddingBottom: CARD_GAP,
            }}
          >
            {rows[vRow.index].map(comic => (
              <ComicCard
                key={comic.id}
                comic={comic}
                selected={comic.id === selectedId}
                onOpen={onOpen}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Virtual list ─────────────────────────────────────────────────────────────

const LIST_ITEM_H = 68;

function VirtualList({ comics, selectedId, onOpen, onSelect }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: comics.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => LIST_ITEM_H,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto" style={{ willChange: 'scroll-position' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(vItem => (
          <div
            key={vItem.index}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${vItem.start}px)` }}
          >
            <ComicListItem
              comic={comics[vItem.index]}
              selected={comics[vItem.index].id === selectedId}
              onOpen={onOpen}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Folder-navigation view ───────────────────────────────────────────────────
// Shows folders as a non-virtualized grid/list section, then comics below.

function FolderGridView({ folderContents, selectedId, onOpen, onSelect }) {
  const { subfolders, comics, folderPath, onNavigate } = folderContents;
  const containerRef = useRef(null);
  const width = useContainerWidth(containerRef);

  const cols = useMemo(() => {
    if (!width) return 1;
    const available = width - PADDING * 2;
    return Math.max(1, Math.floor((available + CARD_GAP) / (CARD_MIN + CARD_GAP)));
  }, [width]);

  const handleFolderClick = (folderName) => {
    onNavigate([...folderPath, folderName]);
  };

  const isEmpty = subfolders.length === 0 && comics.length === 0;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto flex flex-col" style={{ padding: PADDING }}>
      {/* Breadcrumb */}
      {folderPath.length > 0 && (
        <div className="mb-4 -mt-1">
          <FolderBreadcrumb folderPath={folderPath} onNavigate={onNavigate} />
        </div>
      )}

      {isEmpty && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState />
        </div>
      )}

      {/* Folders section */}
      {subfolders.length > 0 && (
        <div className="mb-6">
          {comics.length > 0 && (
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">Folders</span>
              <div className="flex-1 h-px bg-border opacity-30" />
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: CARD_GAP,
            }}
          >
            {subfolders.map(({ name, count, covers }) => (
              <FolderCard
                key={name}
                name={name}
                count={count}
                covers={covers}
                onClick={() => handleFolderClick(name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Comics section */}
      {comics.length > 0 && (
        <div>
          {subfolders.length > 0 && (
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">Comics</span>
              <div className="flex-1 h-px bg-border opacity-30" />
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: CARD_GAP,
            }}
          >
            {comics.map(comic => (
              <ComicCard
                key={comic.id}
                comic={comic}
                selected={comic.id === selectedId}
                onOpen={onOpen}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FolderListView({ folderContents, selectedId, onOpen, onSelect }) {
  const { subfolders, comics, folderPath, onNavigate } = folderContents;

  const handleFolderClick = (folderName) => {
    onNavigate([...folderPath, folderName]);
  };

  const isEmpty = subfolders.length === 0 && comics.length === 0;

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Breadcrumb */}
      {folderPath.length > 0 && (
        <FolderBreadcrumb folderPath={folderPath} onNavigate={onNavigate} />
      )}

      {isEmpty && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState />
        </div>
      )}

      {/* Folders */}
      {subfolders.length > 0 && (
        <div>
          {comics.length > 0 && (
            <div className="flex items-center gap-3 px-4 pt-4 pb-1">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">Folders</span>
            </div>
          )}
          {subfolders.map(({ name, count }) => (
            <FolderListItem
              key={name}
              name={name}
              count={count}
              onClick={() => handleFolderClick(name)}
            />
          ))}
        </div>
      )}

      {/* Divider */}
      {subfolders.length > 0 && comics.length > 0 && (
        <div className="flex items-center gap-3 px-4 pt-4 pb-1">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">Comics</span>
        </div>
      )}

      {/* Comics */}
      {comics.map(comic => (
        <ComicListItem
          key={comic.id}
          comic={comic}
          selected={comic.id === selectedId}
          onOpen={onOpen}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function ComicGrid({ comics, folderContents, viewMode, onOpen, onSelect, selectedId }) {
  if (!folderContents && comics.length === 0) {
    return <div className="flex-1 overflow-y-auto flex"><EmptyState /></div>;
  }

  // Folder navigation mode
  if (folderContents) {
    return viewMode === 'list'
      ? <FolderListView folderContents={folderContents} selectedId={selectedId} onOpen={onOpen} onSelect={onSelect} />
      : <FolderGridView folderContents={folderContents} selectedId={selectedId} onOpen={onOpen} onSelect={onSelect} />;
  }

  // Flat mode (status filter, tag, collection, search, etc.)
  return viewMode === 'list'
    ? <VirtualList  comics={comics} selectedId={selectedId} onOpen={onOpen} onSelect={onSelect} />
    : <VirtualGrid  comics={comics} selectedId={selectedId} onOpen={onOpen} onSelect={onSelect} />;
}
