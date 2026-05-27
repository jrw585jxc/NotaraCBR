import { useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'unread', label: 'Unread', color: '#6b7280' },
  { value: 'reading', label: 'Reading', color: '#3b82f6' },
  { value: 'completed', label: 'Completed', color: '#22c55e' },
  { value: 'on-hold', label: 'On Hold', color: '#e8943a' },
  { value: 'dropped', label: 'Dropped', color: '#ef4444' },
];

function StarRating({ rating, onChange }) {
  const [hover, setHover] = useState(null);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(star === rating ? 0 : star)}
          className="text-lg transition-transform hover:scale-110"
        >
          <span style={{ color: star <= (hover ?? rating) ? '#e8943a' : '#2c2c2c' }}>★</span>
        </button>
      ))}
    </div>
  );
}

export default function ComicDetail({ comic, library, onOpen, onClose }) {
  const [newTag, setNewTag] = useState('');
  const [editField, setEditField] = useState(null);
  const [fieldValue, setFieldValue] = useState('');

  const startEdit = (field) => {
    setEditField(field);
    setFieldValue(comic[field] || '');
  };

  const saveField = () => {
    if (editField) {
      library.updateComic(comic.id, { [editField]: fieldValue });
      setEditField(null);
    }
  };

  const handleTagAdd = (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    library.addTagToComic(comic.id, newTag.trim().toLowerCase().replace(/\s+/g, '-'));
    setNewTag('');
  };

  const handleAddToCollection = (colId) => {
    if (comic.collectionIds.includes(colId)) {
      library.removeFromCollection(colId, comic.id);
    } else {
      library.addToCollection(colId, comic.id);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    return `${(bytes / 1e3).toFixed(0)} KB`;
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto animate-slide-up"
      style={{ width: 280, minWidth: 280, borderLeft: '1px solid var(--border-subtle)', background: 'var(--bg-sidebar)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="font-semibold text-sm text-text-primary truncate flex-1 pr-2">{comic.name}</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors text-lg leading-none flex-shrink-0">✕</button>
      </div>

      {/* Cover */}
      <div className="px-4 pb-3">
        <div className="rounded-xl overflow-hidden shadow-cover" style={{ background: '#1c1c1c' }}>
          {comic.cover ? (
            <img src={comic.cover} alt={comic.name} className="w-full object-cover" draggable={false} />
          ) : (
            <div className="flex items-center justify-center h-48 text-5xl opacity-20">📚</div>
          )}
        </div>
      </div>

      {/* Open button */}
      <div className="px-4 pb-3">
        <button
          onClick={onOpen}
          className="w-full py-2 rounded-xl bg-accent text-bg-base font-semibold text-sm hover:bg-accent-text transition-colors shadow-glow-amber"
        >
          {comic.currentPage > 0 && comic.status !== 'completed'
            ? `Continue — p.${comic.currentPage + 1}`
            : comic.status === 'completed'
            ? 'Read Again'
            : 'Start Reading'}
        </button>
      </div>

      {/* Progress */}
      {comic.totalPages > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
            <span>Progress</span>
            <span className="tabular-nums font-medium" style={{ color: comic.percentComplete >= 100 ? '#22c55e' : '#e8943a' }}>
              {comic.percentComplete}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-bg-overlay overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${comic.percentComplete}%`,
                background: comic.percentComplete >= 100 ? '#22c55e' : '#e8943a'
              }}
            />
          </div>
          <p className="text-xs text-text-muted mt-1">
            Page {comic.currentPage + 1} of {comic.totalPages}
          </p>
        </div>
      )}

      <div className="mx-4 border-t border-border mb-3" />

      {/* Status */}
      <div className="px-4 pb-3">
        <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Status</label>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => library.updateComic(comic.id, { status: opt.value })}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background: comic.status === opt.value ? `${opt.color}22` : '#1e1e1e',
                color: comic.status === opt.value ? opt.color : '#8b8a96',
                border: `1px solid ${comic.status === opt.value ? opt.color + '44' : '#2c2c2c'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="px-4 pb-3">
        <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Rating</label>
        <StarRating
          rating={comic.rating}
          onChange={(r) => library.updateComic(comic.id, { rating: r })}
        />
      </div>

      <div className="mx-4 border-t border-border mb-3" />

      {/* Editable metadata */}
      {['series', 'publisher', 'issue'].map(field => (
        <div key={field} className="px-4 pb-2">
          <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block capitalize">{field}</label>
          {editField === field ? (
            <input
              autoFocus
              value={fieldValue}
              onChange={e => setFieldValue(e.target.value)}
              onBlur={saveField}
              onKeyDown={e => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') setEditField(null); }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-bg-overlay border border-accent text-sm text-text-primary focus:outline-none"
            />
          ) : (
            <button
              onClick={() => startEdit(field)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-bg-elevated text-sm transition-colors"
            >
              <span className={comic[field] ? 'text-text-primary' : 'text-text-muted'}>
                {comic[field] || `Add ${field}…`}
              </span>
            </button>
          )}
        </div>
      ))}

      <div className="mx-4 border-t border-border my-3" />

      {/* Tags */}
      <div className="px-4 pb-3">
        <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Tags</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {comic.tags.map(tag => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-bg-overlay text-xs text-text-secondary cursor-pointer hover:text-red-400 hover:bg-red-400/10 transition-colors"
              onClick={() => library.removeTagFromComic(comic.id, tag)}
              title="Click to remove"
            >
              #{tag} <span className="text-[10px]">✕</span>
            </span>
          ))}
        </div>
        <form onSubmit={handleTagAdd} className="flex gap-1.5">
          <input
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            placeholder="Add tag…"
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-border text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <button type="submit" className="px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-border text-xs text-text-secondary hover:text-accent hover:border-accent transition-colors">
            +
          </button>
        </form>
      </div>

      {/* Collections */}
      {library.collections.length > 0 && (
        <>
          <div className="mx-4 border-t border-border mb-3" />
          <div className="px-4 pb-3">
            <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Collections</label>
            <div className="flex flex-col gap-1">
              {library.collections.map(col => {
                const inCol = comic.collectionIds.includes(col.id);
                return (
                  <button
                    key={col.id}
                    onClick={() => handleAddToCollection(col.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      inCol ? 'bg-accent/10 text-accent-text' : 'hover:bg-bg-elevated text-text-secondary'
                    }`}
                  >
                    <span style={{ color: col.color }}>●</span>
                    <span className="flex-1 text-left">{col.name}</span>
                    {inCol && <span className="text-accent">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="mx-4 border-t border-border mb-3" />

      {/* Meta info */}
      <div className="px-4 pb-4">
        <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Info</label>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-text-muted">Format</span>
            <span className="text-text-secondary uppercase">{comic.ext}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Size</span>
            <span className="text-text-secondary">{formatSize(comic.size)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Added</span>
            <span className="text-text-secondary">{formatDate(comic.dateAdded)}</span>
          </div>
          {comic.lastRead && (
            <div className="flex justify-between">
              <span className="text-text-muted">Last read</span>
              <span className="text-text-secondary">{formatDate(comic.lastRead)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className="px-4 pb-5 mt-auto">
        <button
          onClick={() => library.removeComic(comic.id)}
          className="w-full py-2 rounded-xl text-xs text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors border border-transparent hover:border-red-400/20"
        >
          Remove from Library
        </button>
      </div>
    </div>
  );
}
