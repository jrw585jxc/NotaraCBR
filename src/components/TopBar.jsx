import { useState, useRef, useEffect } from 'react';
import { ACCENT_PALETTE } from '../utils/accentColors';

const SORT_OPTIONS = [
  { value: 'dateAdded', label: 'Date Added' },
  { value: 'name', label: 'Name' },
  { value: 'lastRead', label: 'Last Read' },
  { value: 'percentComplete', label: 'Progress' },
  { value: 'series', label: 'Series' },
];

function WinButton({ onClick, children, danger }) {
  return (
    <button
      onClick={onClick}
      className={`no-drag flex items-center justify-center w-[42px] h-full transition-colors text-text-muted text-xs ${
        danger
          ? 'hover:bg-red-600 hover:text-white'
          : 'hover:bg-bg-elevated hover:text-text-primary'
      }`}
      style={{ fontSize: 11 }}
    >
      {children}
    </button>
  );
}

function AccentPicker({ accentColor, onAccentColor }) {
  const [open, setOpen]   = useState(false);
  const wrapRef           = useRef(null);
  const current           = ACCENT_PALETTE.find(c => c.id === accentColor) ?? ACCENT_PALETTE[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative flex items-center">
      <button
        onClick={() => setOpen(o => !o)}
        title="Accent colour"
        className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-bg-elevated"
      >
        {/* Small muted ring — quiet at rest, gains opacity on hover/open */}
        <span
          className="w-2 h-2 rounded-full transition-opacity"
          style={{
            background: current.swatch,
            opacity: open ? 0.9 : 0.45,
          }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 flex gap-1 p-1.5 rounded-lg z-50"
          style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-md)' }}
        >
          {ACCENT_PALETTE.map(c => (
            <button
              key={c.id}
              title={c.label}
              onClick={() => { onAccentColor(c.id); setOpen(false); }}
              className="w-4 h-4 rounded-full transition-transform hover:scale-125"
              style={{
                background: c.swatch,
                opacity: c.id === accentColor ? 1 : 0.55,
                outline: c.id === accentColor ? `1.5px solid ${c.swatch}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopBar({ title, count, search, onSearch, sortBy, sortDir, onSort, viewMode, onViewMode, accentColor, onAccentColor, comicsDirectory, onRefresh, isRefreshing }) {
  const hasElectron = typeof window !== 'undefined' && window.electronAPI;

  return (
    <div
      className="draggable flex items-center flex-shrink-0"
      style={{ height: 44, background: 'var(--bg-app)' }}
    >
      {/* Title */}
      <div className="no-drag flex items-baseline gap-2 pl-5 min-w-0">
        <h1 className="font-semibold text-base text-text-primary truncate">{title}</h1>
        {count > 0 && (
          <span className="text-xs text-text-muted tabular-nums flex-shrink-0">{count}</span>
        )}
      </div>

      <div className="flex-1" />

      {/* Controls group */}
      <div className="no-drag flex items-center gap-1 pr-2">
        {/* Search */}
        <div className="relative mr-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" style={{ fontSize: 13 }}>⌕</span>
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search…"
            className="pl-7 pr-3 py-1 w-40 rounded-md text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              style={{ fontSize: 10 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={e => onSort(e.target.value)}
          className="text-xs text-text-secondary rounded-md px-2 py-1 focus:outline-none focus:border-accent transition-colors cursor-pointer"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Sort direction */}
        <button
          onClick={() => onSort(sortBy)}
          className="flex items-center justify-center w-7 h-7 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors text-xs"
          title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortDir === 'asc' ? '↑' : '↓'}
        </button>

        {/* Refresh — only shown when a comics directory is set */}
        {comicsDirectory && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors text-sm ${
              isRefreshing
                ? 'text-text-muted cursor-not-allowed'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
            }`}
            title={isRefreshing ? 'Scanning…' : `Refresh library (${comicsDirectory})`}
            style={{ transformOrigin: 'center' }}
          >
            <span
              style={{
                display: 'inline-block',
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            >
              ↻
            </span>
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-4 mx-1" style={{ background: 'var(--border-subtle)' }} />

        {/* View mode */}
        <button
          onClick={() => onViewMode('grid')}
          className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors text-sm ${
            viewMode === 'grid' ? 'text-accent bg-bg-elevated' : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
          }`}
          title="Grid view"
        >
          ⊞
        </button>
        <button
          onClick={() => onViewMode('list')}
          className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors text-sm ${
            viewMode === 'list' ? 'text-accent bg-bg-elevated' : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
          }`}
          title="List view"
        >
          ☰
        </button>

        {/* Divider */}
        <div className="w-px h-4 mx-1" style={{ background: 'var(--border-subtle)' }} />

        {/* Accent colour picker */}
        <AccentPicker accentColor={accentColor || 'orange'} onAccentColor={onAccentColor} />
      </div>

      {/* Window controls — far right */}
      {hasElectron && (
        <div className="flex items-stretch h-full ml-2 flex-shrink-0" style={{ borderLeft: '1px solid var(--border-subtle)' }}>
          <WinButton onClick={() => window.electronAPI.minimize()}>─</WinButton>
          <WinButton onClick={() => window.electronAPI.maximize()}>□</WinButton>
          <WinButton onClick={() => window.electronAPI.close()} danger>✕</WinButton>
        </div>
      )}
    </div>
  );
}
