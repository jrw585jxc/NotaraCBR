import { useState, useMemo } from 'react';
import { libraryStore } from '../store/libraryStore';

const STATUS_ITEMS = [
  { value: 'all',       label: 'All Comics',  icon: '◈' },
  { value: 'reading',   label: 'Reading',     icon: '▷' },
  { value: 'unread',    label: 'Unread',      icon: '○' },
  { value: 'completed', label: 'Completed',   icon: '✓' },
  { value: 'on-hold',   label: 'On Hold',     icon: '‖' },
  { value: 'dropped',   label: 'Dropped',     icon: '✕' },
];

function SidebarSection({ title, children, collapsible = true }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1">
      {collapsible ? (
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted hover:text-text-secondary transition-colors"
        >
          <span>{title}</span>
          <span className="text-text-muted" style={{ fontSize: 10 }}>{open ? '▾' : '▸'}</span>
        </button>
      ) : (
        <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted">{title}</div>
      )}
      {open && <div>{children}</div>}
    </div>
  );
}

function SidebarItem({ label, icon, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-all text-sm mx-1 ${
        active
          ? 'bg-accent/10 text-accent font-medium'
          : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
      }`}
      style={{ width: 'calc(100% - 8px)' }}
    >
      {icon && (
        <span
          className="flex-shrink-0 tabular-nums"
          style={{ fontSize: 11, width: 14, textAlign: 'center', opacity: active ? 1 : 0.55 }}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && (
        <span className={`text-xs tabular-nums ${active ? 'text-accent/60' : 'text-text-muted'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({ library, activeSection, onSelectSection, onAddFiles, onAddFolder }) {
  const { comics, collections, tags } = library;
  const [newColName, setNewColName] = useState('');
  const [showNewCol, setShowNewCol] = useState(false);

  const statusCounts = useMemo(() => {
    const counts = { all: comics.length };
    comics.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return counts;
  }, [comics]);

  const seriesGroups = useMemo(() => libraryStore.getComicsBySeries(), [comics]);

  const handleCreateCollection = (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    library.addCollection(newColName.trim());
    setNewColName('');
    setShowNewCol(false);
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ width: 220, minWidth: 220, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-subtle)' }}
    >
      {/* App title — draggable titlebar area */}
      <div className="draggable px-4 flex items-center gap-1.5" style={{ height: 44 }}>
        <span className="font-semibold text-base tracking-tight" style={{ color: '#ffffff' }}>Notara</span>
        <span className="font-semibold text-base tracking-tight" style={{ color: 'var(--accent)' }}>CBR</span>
      </div>

      {/* Add buttons */}
      <div className="no-drag px-3 mb-3 flex gap-1.5">
        <button
          onClick={onAddFiles}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md text-text-secondary hover:text-text-primary transition-colors"
          style={{
            height: 28,
            fontSize: 12,
            background: 'transparent',
            border: '1px solid var(--border-default)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>+</span>
          <span>Add Files</span>
        </button>
        <button
          onClick={onAddFolder}
          className="flex items-center justify-center rounded-md text-text-muted hover:text-text-primary transition-colors"
          style={{
            width: 28,
            height: 28,
            fontSize: 13,
            background: 'transparent',
            border: '1px solid var(--border-default)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
          title="Add Folder"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 3.5C1.5 2.95 1.95 2.5 2.5 2.5H6.086C6.351 2.5 6.605 2.605 6.793 2.793L7.707 3.707C7.895 3.895 8.149 4 8.414 4H13.5C14.052 4 14.5 4.448 14.5 5V12.5C14.5 13.052 14.052 13.5 13.5 13.5H2.5C1.948 13.5 1.5 13.052 1.5 12.5V3.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Scrollable nav */}
      <div className="no-drag flex-1 overflow-y-auto py-1">

        <SidebarSection title="Library">
          {STATUS_ITEMS.map(item => (
            <SidebarItem
              key={item.value}
              label={item.label}
              icon={item.icon}
              active={activeSection.type === 'status' && activeSection.value === item.value}
              count={statusCounts[item.value] || 0}
              onClick={() => onSelectSection({ type: 'status', value: item.value })}
            />
          ))}
        </SidebarSection>

        <div className="my-2 mx-3 border-t border-border" />

        {/* Collections */}
        <SidebarSection title="Collections">
          {collections.map(col => (
            <SidebarItem
              key={col.id}
              label={col.name}
              icon={<span style={{ color: col.color, fontSize: 8 }}>●</span>}
              active={activeSection.type === 'collection' && activeSection.value === col.id}
              count={col.comicIds.length}
              onClick={() => onSelectSection({ type: 'collection', value: col.id })}
            />
          ))}
          {showNewCol ? (
            <form onSubmit={handleCreateCollection} className="mx-1 mt-1 mb-1">
              <input
                autoFocus
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                onBlur={() => { if (!newColName.trim()) setShowNewCol(false); }}
                placeholder="Collection name…"
                className="w-full px-3 py-1.5 rounded-md text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)' }}
              />
            </form>
          ) : (
            <button
              onClick={() => setShowNewCol(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted hover:text-accent transition-colors mx-1"
              style={{ width: 'calc(100% - 8px)' }}
            >
              <span>+ New Collection</span>
            </button>
          )}
        </SidebarSection>

        {/* Tags */}
        {tags.length > 0 && (
          <>
            <div className="my-2 mx-3 border-t border-border" />
            <SidebarSection title="Tags">
              {tags.map(tag => (
                <SidebarItem
                  key={tag}
                  label={`#${tag}`}
                  icon="⋯"
                  active={activeSection.type === 'tag' && activeSection.value === tag}
                  onClick={() => onSelectSection({ type: 'tag', value: tag })}
                />
              ))}
            </SidebarSection>
          </>
        )}

        {/* Series */}
        {Object.keys(seriesGroups).filter(s => s !== '(No Series)').length > 0 && (
          <>
            <div className="my-2 mx-3 border-t border-border" />
            <SidebarSection title="Series">
              {Object.entries(seriesGroups)
                .filter(([name]) => name !== '(No Series)')
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([name, items]) => (
                  <SidebarItem
                    key={name}
                    label={name}
                    icon="◫"
                    active={activeSection.type === 'series' && activeSection.value === name}
                    count={items.length}
                    onClick={() => onSelectSection({ type: 'series', value: name })}
                  />
                ))}
            </SidebarSection>
          </>
        )}
      </div>

      {/* Footer stats */}
      <div className="no-drag px-4 py-3 border-t border-border">
        <p className="text-xs text-text-muted">
          {comics.length} comic{comics.length !== 1 ? 's' : ''} · {collections.length} list{collections.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
