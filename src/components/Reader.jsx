import { useState, useEffect, useCallback, useRef } from 'react';
import { loadComic } from '../utils/comicLoader';
import PDFReader from './PDFReader';

const FIT_MODES   = ['height', 'width', 'original'];
const FIT_LABELS  = { height: 'Fit Height', width: 'Fit Width', original: 'Original' };

const TOP_ZONE    = 90;
const BOTTOM_ZONE = 90;
const HUD_LINGER  = 220;
const HUD_FADE    = 0.18;

const DRAG_THRESHOLD  = 6;     // px before a press becomes a drag
const SIDE_ZONE       = 0.18;  // fraction of width for click-to-flip zones
const SNAP_THRESHOLD  = 0.22;  // fraction of width to trigger page snap
const SNAP_DURATION   = 280;   // ms for snap / spring-back animation
const SWIPE_MAX_ZOOM  = 1.12;  // below this zoom level → swipe mode; above → pan mode

// ── Comic loader ─────────────────────────────────────────────────────────────
function ComicLoader({ comic }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: '#0e0e0e' }}
    >
      {/* Blurred cover backdrop */}
      {comic.cover && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:    `url(${comic.cover})`,
            backgroundSize:     'cover',
            backgroundPosition: 'center',
            filter:             'blur(40px) brightness(0.18) saturate(0.5)',
            transform:          'scale(1.1)',
          }}
        />
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 15%, rgba(0,0,0,0.88) 100%)' }}
      />

      {/* Content */}
      <div
        className="relative flex flex-col items-center"
        style={{ gap: 18, animation: 'loaderFadeIn 0.45s ease both' }}
      >
        {/* Cover — shown as a proper portrait card */}
        <div style={{ position: 'relative', width: 116, height: 174, flexShrink: 0 }}>
          {comic.cover ? (
            <img
              src={comic.cover}
              alt=""
              style={{
                width:        '100%',
                height:       '100%',
                objectFit:    'cover',
                borderRadius: 6,
                display:      'block',
                boxShadow:    '0 12px 48px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.6)',
              }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', borderRadius: 6,
              background: 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40,
            }}>
              📚
            </div>
          )}
          {/* Subtle page-edge highlight */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 6, pointerEvents: 'none',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, transparent 55%)',
          }} />
        </div>

        {/* Title */}
        <div className="flex flex-col items-center gap-0.5 text-center" style={{ maxWidth: 300, padding: '0 24px' }}>
          <p
            className="font-semibold text-white truncate w-full text-center"
            style={{ fontSize: 14, letterSpacing: '0.01em', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}
          >
            {comic.name}
          </p>
          {comic.series && (
            <p className="text-xs truncate w-full text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {comic.series}
            </p>
          )}
        </div>

        {/* Thin scanning loader bar */}
        <div style={{
          width: 116, height: 2, borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            width: '55%', borderRadius: 999,
            background: 'var(--accent)',
            animation: 'loaderScan 1.3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }} />
        </div>
      </div>
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ current, total, onScrub, onSeek }) {
  const barRef      = useRef(null);
  const rafRef      = useRef(null);
  const lastPageRef = useRef(null); // avoids redundant onScrub calls
  // dragPct drives the bar visually during drag — decoupled from the parent's
  // current prop so re-renders from page changes never cause the bar to jump
  const [dragPct, setDragPct] = useState(null);

  const pctFromEvent = (e) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const pageFromPct = (pct) => total >= 2 ? Math.round(pct * (total - 1)) : 0;

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const initPct = pctFromEvent(e);
    setDragPct(initPct * 100);
    lastPageRef.current = pageFromPct(initPct);
    onScrub(lastPageRef.current);

    const onMove = (ev) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const pct  = pctFromEvent(ev);
        // Bar always tracks cursor — purely local, zero parent-render cost
        setDragPct(pct * 100);
        // Page image only updates when you actually cross a page boundary
        const page = pageFromPct(pct);
        if (page !== lastPageRef.current) {
          lastPageRef.current = page;
          onScrub(page);
        }
      });
    };

    const onUp = (ev) => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      const finalPct = pctFromEvent(ev);
      setDragPct(null);
      lastPageRef.current = null;
      onSeek(pageFromPct(finalPct)); // saves progress to localStorage
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  // Bar position: local dragPct while dragging, derived from prop at rest
  const pct  = dragPct !== null ? dragPct : (total > 1 ? (current / (total - 1)) * 100 : 0);
  const page = dragPct !== null ? pageFromPct(dragPct / 100) + 1 : current + 1;
  const done = pct >= 100;

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs text-white/50 tabular-nums w-8 text-right">p.{page}</span>
      <div
        ref={barRef}
        className="flex-1 rounded-full bg-white/10 cursor-pointer relative group"
        style={{ height: dragPct !== null ? 6 : 4, transition: 'height 0.12s ease' }}
        onMouseDown={handleMouseDown}
      >
        {/* Fill — no transition so it tracks cursor with zero lag */}
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: done ? '#22c55e' : 'var(--accent)' }}
        />
        {/* Thumb — solid while dragging, fades in on hover at rest */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full -translate-x-1/2"
          style={{
            left:       `${pct}%`,
            width:      dragPct !== null ? 14 : 12,
            height:     dragPct !== null ? 14 : 12,
            background: done ? '#22c55e' : 'var(--accent)',
            opacity:    dragPct !== null ? 1 : 0,
            boxShadow:  dragPct !== null ? '0 0 0 3px rgba(0,0,0,0.4)' : 'none',
            transition: 'opacity 0.12s ease, width 0.12s ease, height 0.12s ease',
          }}
        />
        {dragPct === null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
            style={{ left: `${pct}%`, background: 'var(--accent)' }}
          />
        )}
      </div>
      <span className="text-xs text-white/50 tabular-nums w-8">{total}</span>
      <span className="text-xs font-semibold tabular-nums w-9" style={{ color: done ? '#22c55e' : 'var(--accent)' }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

// ── Side arrow ────────────────────────────────────────────────────────────────
function SideArrow({ side, onClick, show }) {
  if (!show) return null;
  return (
    <div
      className="absolute top-0 bottom-0 z-10 flex items-center group"
      style={{ [side]: 0, width: `${SIDE_ZONE * 100}%`, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: side === 'left' ? 'linear-gradient(to right, rgba(0,0,0,0.25), transparent)' : 'linear-gradient(to left, rgba(0,0,0,0.25), transparent)' }}
      />
      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center top-0 bottom-0" style={{ [side]: 14 }}>
        <span className="text-white/55 text-5xl select-none">{side === 'left' ? '‹' : '›'}</span>
      </div>
    </div>
  );
}

// ── Reader ────────────────────────────────────────────────────────────────────
export default function Reader({ comic, onClose, saveProgress }) {
  const [pages, setPages]             = useState([]);
  const [currentPage, setCurrentPage] = useState(comic.currentPage || 0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [fitMode, setFitMode]         = useState('height');
  const [isPDF, setIsPDF]             = useState(false);
  const [pdfPath, setPdfPath]         = useState(null);
  const [totalPages, setTotalPages]   = useState(comic.totalPages || 0);

  // Zoom + pan (for zoomed-in panning)
  const [zoom, setZoom] = useState(1);
  const [pan,  setPan]  = useState({ x: 0, y: 0 });

  // Swipe strip animation
  const [swipeOffset,     setSwipeOffset]     = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Stable refs
  const zoomRef          = useRef(zoom);
  const panRef           = useRef(pan);
  const pagesRef         = useRef(pages);
  const totalPagesRef    = useRef(totalPages);
  const currentPageRef   = useRef(currentPage);
  const swipeOffsetRef   = useRef(0);
  useEffect(() => { zoomRef.current        = zoom;        }, [zoom]);
  useEffect(() => { panRef.current         = pan;         }, [pan]);
  useEffect(() => { pagesRef.current       = pages;       }, [pages]);
  useEffect(() => { totalPagesRef.current  = totalPages;  }, [totalPages]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  // Drag state — refs only, no stale closures in global handlers
  const isDragging  = useRef(false);
  const isRealDrag  = useRef(false);
  const dragAxis    = useRef(null); // 'h' | 'v' | null
  const dragMode    = useRef('pan'); // 'pan' | 'swipe' — set on mousedown based on target
  const dragStart   = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [dragging, setDragging] = useState(false); // cursor style only

  // HUD
  const [showTopHUD,    setShowTopHUD]    = useState(false);
  const [showBottomHUD, setShowBottomHUD] = useState(false);
  const topTimer    = useRef(null);
  const bottomTimer = useRef(null);

  const containerRef = useRef(null);
  const snapTimer    = useRef(null); // so we can cancel mid-animation if needed

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    // Restore window state when reader closes (in case user entered fullscreen)
    return () => { api.setFullscreen(false); };
  }, []);

  const isFullscreenRef = useRef(isFullscreen);
  useEffect(() => { isFullscreenRef.current = isFullscreen; }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    const api = window.electronAPI;
    if (!api) return;
    const next = !isFullscreenRef.current;
    api.setFullscreen(next);
    setIsFullscreen(next);
  }, []);

  // F11 also toggles fullscreen while reading
  // (ESC already calls onClose via keyboard handler below)

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true); setError(null);
    loadComic(comic.filePath)
      .then(r => {
        if (r.type === 'pdf') { setIsPDF(true); setPdfPath(r.filePath); }
        else { setPages(r.pages); setTotalPages(r.count); saveProgress(currentPage, r.count); }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [comic.filePath]);

  // On page change: reset pan to center but keep zoom level
  useEffect(() => { setPan({ x: 0, y: 0 }); }, [currentPage]);
  // On fit mode change: reset everything
  useEffect(() => { setPan({ x: 0, y: 0 }); setZoom(1); }, [fitMode]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    const total = totalPagesRef.current || pagesRef.current.length;
    setCurrentPage(p => { const n = Math.min(p + 1, total - 1); saveProgress(n, total); return n; });
  }, [saveProgress]);

  const goPrev = useCallback(() => {
    const total = totalPagesRef.current || pagesRef.current.length;
    setCurrentPage(p => { const n = Math.max(p - 1, 0); saveProgress(n, total); return n; });
  }, [saveProgress]);

  const cycleFit = useCallback(() => setFitMode(m => FIT_MODES[(FIT_MODES.indexOf(m) + 1) % FIT_MODES.length]), []);

  const goNextRef = useRef(goNext); useEffect(() => { goNextRef.current = goNext; }, [goNext]);
  const goPrevRef = useRef(goPrev); useEffect(() => { goPrevRef.current = goPrev; }, [goPrev]);

  // ── Snap helpers ───────────────────────────────────────────────────────────
  const snapToPage = useCallback((direction) => {
    // direction: -1 = next page (swipe left), +1 = prev page (swipe right)
    const W = containerRef.current?.offsetWidth || window.innerWidth;
    const target = direction * W; // -W = continue left (next), +W = continue right (prev)

    setIsTransitioning(true);
    setSwipeOffset(target);
    swipeOffsetRef.current = target;

    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      // All updates batch in React 18 → single render, no flash or jitter
      setIsTransitioning(false);
      setSwipeOffset(0);
      swipeOffsetRef.current = 0;
      // Reset pan in the same batch as the page change so there's
      // never a render where the new center page has a stale pan offset
      setPan({ x: 0, y: 0 });
      panRef.current = { x: 0, y: 0 };
      if (direction === -1) goNextRef.current();
      else                  goPrevRef.current();
    }, SNAP_DURATION);
  }, []);

  const snapBack = useCallback(() => {
    setIsTransitioning(true);
    setSwipeOffset(0);
    swipeOffsetRef.current = 0;
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => setIsTransitioning(false), SNAP_DURATION);
  }, []);

  // ── Wheel → zoom toward cursor ─────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const rect    = el.getBoundingClientRect();
      const cx      = e.clientX - rect.left  - rect.width  / 2;
      const cy      = e.clientY - rect.top   - rect.height / 2;
      const curZoom = zoomRef.current;
      const curPan  = panRef.current;
      const factor  = Math.exp(-e.deltaY * 0.0008);
      const nz      = Math.max(0.2, Math.min(6, curZoom * factor));
      const ratio   = nz / curZoom;
      setZoom(nz);
      setPan({ x: cx * (1 - ratio) + curPan.x * ratio, y: cy * (1 - ratio) + curPan.y * ratio });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // ── Global mouse handlers ──────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      if (isDragging.current) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;

        // Determine axis once past drag threshold
        if (!isRealDrag.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          isRealDrag.current = true;
          dragAxis.current   = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
          setDragging(true);
        }

        if (isRealDrag.current) {
          // swipe mode: zoom≈1 always, OR background-click at any zoom
          const swipeMode = zoomRef.current < SWIPE_MAX_ZOOM || dragMode.current === 'swipe';

          if (swipeMode && dragAxis.current === 'h') {
            // Horizontal swipe: move the page strip
            const pg      = currentPageRef.current;
            const total   = pagesRef.current.length;
            const atStart = pg === 0;
            const atEnd   = pg >= total - 1;
            // Rubber-band resistance at boundaries
            let offset = dx;
            if ((dx > 0 && atStart) || (dx < 0 && atEnd)) offset = dx * 0.18;
            setSwipeOffset(offset);
            swipeOffsetRef.current = offset;
          } else if (!swipeMode) {
            // Zoomed in + clicked on image: pan the image
            setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
          }
          // vertical swipe: ignore (no-op)
        }
      }

      // HUD proximity
      if (e.clientY < TOP_ZONE) {
        setShowTopHUD(true); clearTimeout(topTimer.current);
      } else {
        clearTimeout(topTimer.current);
        topTimer.current = setTimeout(() => setShowTopHUD(false), HUD_LINGER);
      }
      if (e.clientY > window.innerHeight - BOTTOM_ZONE) {
        setShowBottomHUD(true); clearTimeout(bottomTimer.current);
      } else {
        clearTimeout(bottomTimer.current);
        bottomTimer.current = setTimeout(() => setShowBottomHUD(false), HUD_LINGER);
      }
    };

    const onUp = (e) => {
      if (e.button !== 0 || !isDragging.current) return;

      const dx         = e.clientX - dragStart.current.x;
      const dy         = e.clientY - dragStart.current.y;
      const wasReal    = isRealDrag.current;
      const axis       = dragAxis.current;
      const swipeMode  = zoomRef.current < SWIPE_MAX_ZOOM || dragMode.current === 'swipe';
      const W          = containerRef.current?.offsetWidth || window.innerWidth;

      isDragging.current = false;
      isRealDrag.current = false;
      dragAxis.current   = null;
      setDragging(false);

      if (!wasReal) {
        // Clean click — side zones flip page
        const xRatio = e.clientX / window.innerWidth;
        if (xRatio < SIDE_ZONE)           goPrevRef.current();
        else if (xRatio > 1 - SIDE_ZONE)  goNextRef.current();
        return;
      }

      if (swipeMode && axis === 'h') {
        // Was a horizontal swipe — snap or spring back
        const pg     = currentPageRef.current;
        const total  = pagesRef.current.length;
        const absDx  = Math.abs(dx);
        const pastThreshold = absDx > W * SNAP_THRESHOLD;
        const goingLeft  = dx < 0;
        const goingRight = dx > 0;

        if (pastThreshold && goingLeft  && pg < total - 1) snapToPage(-1); // next
        else if (pastThreshold && goingRight && pg > 0)    snapToPage(+1); // prev
        else                                               snapBack();      // bounce back
      }
      // zoom>1 pan: already applied live, nothing to do
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [snapToPage, snapBack]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, select')) return;
    // Cancel any in-progress snap so user can grab mid-animation
    clearTimeout(snapTimer.current);
    setIsTransitioning(false);
    isDragging.current = true;
    isRealDrag.current = false;
    dragAxis.current   = null;
    // If the click landed on the actual image → pan; anywhere else (black bg) → swipe
    dragMode.current   = e.target.tagName === 'IMG' ? 'pan' : 'swipe';
    dragStart.current  = { x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
  }, []);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
      else if (e.key === 'Escape') {
        // In fullscreen: first press exits fullscreen; second press (windowed) closes reader
        if (isFullscreenRef.current) toggleFullscreen();
        else onClose();
      }
      else if (e.key === 'F11')      toggleFullscreen();
      else if (e.key === 'f' || e.key === 'F') cycleFit();
      else if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z * 1.15, 6));
      else if (e.key === '-')                  setZoom(z => Math.max(z / 1.15, 0.2));
      else if (e.key === '0')                  { setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, cycleFit, onClose, toggleFullscreen]);

  const handleSeek = (page) => { setCurrentPage(page); saveProgress(page, totalPages || pages.length); };

  // ── Image style (applied to each page in the strip) ────────────────────────
  const getSlotStyle = (isCenter) => ({
    width: '33.333%',
    height: '100%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  });

  const getImgStyle = (isCenter) => {
    const base = {
      userSelect: 'none',
      display: 'block',
      flexShrink: 0,
      transformOrigin: 'center center',
    };
    if (isCenter) {
      // Center page: full zoom + pan — no transition so pan reset is instant on page flip
      base.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
    } else {
      // Adjacent pages: same format as center (translate(0,0) scale) so the
      // transform string is identical when an adjacent slot becomes center —
      // no animation jump when the page flips.
      base.transform = `translate(0px, 0px) scale(${zoom})`;
    }
    if (fitMode === 'height') return { ...base, height: '100%', width: 'auto',  maxWidth: 'none'   };
    if (fitMode === 'width')  return { ...base, width:  '100%', height: 'auto', maxHeight: 'none'  };
    return { ...base };
  };

  const hudStyle = (visible) => ({
    opacity:       visible ? 1 : 0,
    transition:    `opacity ${HUD_FADE}s ease`,
    pointerEvents: visible ? 'auto' : 'none',
  });

  const pageCount = totalPages || pages.length;
  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < pageCount - 1;

  // Strip: renders prev / current / next page slots
  const stripSlots = [-1, 0, 1].map(offset => {
    const idx  = currentPage + offset;
    const src  = pages[idx];
    const isCenter = offset === 0;
    return (
      <div key={offset} style={getSlotStyle(isCenter)}>
        {src ? (
          <img
            src={src}
            alt={`Page ${idx + 1}`}
            style={getImgStyle(isCenter)}
            draggable={false}
          />
        ) : (
          // Empty slot placeholder (boundary pages)
          <div style={{ width: '100%', height: '100%', background: '#111111' }} />
        )}
      </div>
    );
  });

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col overflow-hidden"
      style={{ zIndex: 50, cursor: dragging ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Top HUD ──────────────────────────────────────────────────────── */}
      <div
        className="draggable absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-5 py-3"
        style={{ ...hudStyle(showTopHUD), background: 'linear-gradient(to bottom, rgba(0,0,0,0.92), rgba(0,0,0,0.5) 70%, transparent)' }}
      >
        <button onClick={onClose} className="no-drag flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm">← Library</button>
        <div className="flex-1 text-center min-w-0 px-4 pointer-events-none select-none">
          <p className="font-medium text-white truncate">{comic.name}</p>
          {comic.series && <p className="text-xs text-white/40 truncate">{comic.series}</p>}
        </div>
        <button onClick={cycleFit} className="no-drag text-xs text-white/60 hover:text-white px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0">{FIT_LABELS[fitMode]}</button>
        <div className="no-drag flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setZoom(z => Math.max(z / 1.15, 0.2))} className="w-7 h-7 rounded bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors flex items-center justify-center text-lg">−</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="text-xs text-white/60 hover:text-white w-10 text-center tabular-nums transition-colors">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom(z => Math.min(z * 1.15, 6))} className="w-7 h-7 rounded bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors flex items-center justify-center text-lg">+</button>
        </div>
        {/* Window controls */}
        {typeof window !== 'undefined' && window.electronAPI && (
          <div className="no-drag flex items-center gap-1 flex-shrink-0 ml-2 pl-2" style={{ borderLeft: '1px solid rgba(255,255,255,0.12)' }}>
            <button onClick={() => window.electronAPI.minimize()} className="w-7 h-7 rounded bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition-colors flex items-center justify-center" style={{ fontSize: 11 }}>─</button>
            <button onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="w-7 h-7 rounded bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition-colors flex items-center justify-center" style={{ fontSize: 11 }}>{isFullscreen ? '⤡' : '⤢'}</button>
            <button onClick={() => window.electronAPI.close()} className="w-7 h-7 rounded bg-white/10 text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center" style={{ fontSize: 11 }}>✕</button>
          </div>
        )}
      </div>

      {/* ── Page strip ───────────────────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 overflow-hidden" style={{ position: 'relative' }}>
        {loading ? (
          <ComicLoader comic={comic} />
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 h-full">
            <p className="text-red-400 text-sm">Failed to load: {error}</p>
            <button onClick={onClose} className="text-white/60 hover:text-white text-sm">← Back to Library</button>
          </div>
        ) : isPDF ? (
          <PDFReader filePath={pdfPath} currentPage={currentPage}
            onPageChange={(page, total) => { setCurrentPage(page); setTotalPages(total); saveProgress(page, total); }}
            fitMode={fitMode} zoom={zoom} />
        ) : pages.length > 0 ? (
          <div
            style={{
              display:    'flex',
              width:      '300%',
              height:     '100%',
              transform:  `translateX(calc(-33.333% + ${swipeOffset}px))`,
              transition: isTransitioning
                ? `transform ${SNAP_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
                : 'none',
              willChange: 'transform',
            }}
          >
            {stripSlots}
          </div>
        ) : null}

        {/* Side click zones */}
        {!isPDF && !loading && !error && (
          <>
            <SideArrow side="left"  onClick={goPrev} show={canGoPrev} />
            <SideArrow side="right" onClick={goNext} show={canGoNext} />
          </>
        )}
      </div>

      {/* ── Bottom HUD ───────────────────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-30 px-6 py-4 flex flex-col gap-2.5"
        style={{ ...hudStyle(showBottomHUD), background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.5) 70%, transparent)' }}
      >
        <ProgressBar
          current={currentPage}
          total={pageCount}
          onScrub={(page) => setCurrentPage(page)}
          onSeek={handleSeek}
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button onClick={goPrev} disabled={!canGoPrev} className="px-4 py-1.5 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/20 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed">← Prev</button>
            <button onClick={goNext} disabled={!canGoNext} className="px-4 py-1.5 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/20 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed">Next →</button>
          </div>
          <p className="text-xs text-white/25">Swipe or click sides to flip · Drag to pan · Scroll to zoom</p>
        </div>
      </div>
    </div>
  );
}
