import { useRef } from 'react';

const STATUS_COLORS = {
  unread: '#6b7280',
  reading: '#3b82f6',
  completed: '#22c55e',
  'on-hold': '#e8943a',
  dropped: '#ef4444',
};

const STATUS_LABELS = {
  unread: 'Unread',
  reading: 'Reading',
  completed: 'Done',
  'on-hold': 'On Hold',
  dropped: 'Dropped',
};

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

function ComicCard({ comic, selected, onOpen, onSelect }) {
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
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 animate-scale-in ${
        selected
          ? 'ring-2 ring-accent shadow-glow-amber'
          : 'hover:ring-1 hover:ring-border-bright'
      }`}
      style={{ boxShadow: selected ? undefined : undefined }}
      onClick={handleClick}
      onDoubleClick={handleDblClick}
    >
      {/* Cover art */}
      <div
        className="relative overflow-hidden"
        style={{ paddingTop: '150%', background: '#1c1c1c' }}
      >
        {comic.cover ? (
          <img
            src={comic.cover}
            alt={comic.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-bg-elevated to-bg-base">
            <span className="text-4xl opacity-30">
              {comic.ext === 'pdf' ? '📄' : '📚'}
            </span>
            <span className="text-xs text-text-muted text-center px-2 line-clamp-2">{comic.name}</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span
            className="px-1.5 py-0.5 rounded text-xs font-medium"
            style={{
              background: `${STATUS_COLORS[comic.status]}22`,
              color: STATUS_COLORS[comic.status],
              border: `1px solid ${STATUS_COLORS[comic.status]}44`
            }}
          >
            {STATUS_LABELS[comic.status]}
          </span>
        </div>

        {/* Progress ring */}
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

        {/* Open button on hover */}
        <div className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onDoubleClick={handleDblClick}
            onClick={(e) => { e.stopPropagation(); onOpen(comic.id); }}
            className="px-4 py-1.5 rounded-lg bg-accent text-bg-base text-xs font-bold shadow-lg hover:bg-accent-text transition-colors"
          >
            Read
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 bg-bg-surface">
        <p className="text-sm font-medium text-text-primary truncate leading-tight">{comic.name}</p>
        {comic.series && (
          <p className="text-xs text-text-muted truncate mt-0.5">{comic.series}</p>
        )}
        {comic.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {comic.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-overlay text-text-muted">
                #{tag}
              </span>
            ))}
            {comic.tags.length > 2 && (
              <span className="text-[10px] text-text-muted">+{comic.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ComicListItem({ comic, selected, onOpen, onSelect }) {
  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
        selected ? 'bg-accent/10' : 'hover:bg-bg-elevated'
      }`}
      onClick={() => onSelect(comic.id)}
      onDoubleClick={() => onOpen(comic.id)}
    >
      {/* Tiny cover */}
      <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-bg-elevated">
        {comic.cover ? (
          <img src={comic.cover} alt="" className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl opacity-30">📚</div>
        )}
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

      {/* Progress bar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {(comic.status === 'reading' || comic.status === 'completed') && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-bg-overlay overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${comic.percentComplete}%`,
                  background: comic.percentComplete >= 100 ? '#22c55e' : '#e8943a'
                }}
              />
            </div>
            <span className="text-xs text-text-muted w-8 tabular-nums">{comic.percentComplete}%</span>
          </div>
        )}
        <span
          className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
          style={{
            background: `${STATUS_COLORS[comic.status]}22`,
            color: STATUS_COLORS[comic.status],
          }}
        >
          {STATUS_LABELS[comic.status]}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ onAddFiles }) {
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

export default function ComicGrid({ comics, viewMode, onOpen, onSelect, selectedId }) {
  if (comics.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex">
        <EmptyState />
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
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

  return (
    <div
      className="flex-1 overflow-y-auto p-5"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gridAutoRows: 'max-content',
        gap: '16px',
        alignContent: 'start',
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
  );
}
