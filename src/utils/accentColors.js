// ── Accent colour palette ─────────────────────────────────────────────────────
// Matches the Notara notes app palette exactly (dark-mode values only for CBR).

export const ACCENT_PALETTE = [
  {
    id: 'orange', label: 'Orange', swatch: '#e8943a',
    accent: '#e8943a', hover: '#f5a84d', light: 'rgba(232,148,58,0.14)',
  },
  {
    id: 'red', label: 'Red', swatch: '#e85a42',
    accent: '#e85a42', hover: '#f07060', light: 'rgba(232,90,66,0.14)',
  },
  {
    id: 'amber', label: 'Amber', swatch: '#d4a830',
    accent: '#d4a830', hover: '#e8c048', light: 'rgba(212,168,48,0.14)',
  },
  {
    id: 'green', label: 'Green', swatch: '#4ab870',
    accent: '#4ab870', hover: '#60d088', light: 'rgba(74,184,112,0.14)',
  },
  {
    id: 'teal', label: 'Teal', swatch: '#30c0c0',
    accent: '#30c0c0', hover: '#48d8d8', light: 'rgba(48,192,192,0.14)',
  },
  {
    id: 'blue', label: 'Blue', swatch: '#4a8ae0',
    accent: '#4a8ae0', hover: '#60a0f0', light: 'rgba(74,138,224,0.14)',
  },
  {
    id: 'purple', label: 'Purple', swatch: '#a855f0',
    accent: '#a855f0', hover: '#c070ff', light: 'rgba(168,85,240,0.14)',
  },
  {
    id: 'pink', label: 'Pink', swatch: '#e855a0',
    accent: '#e855a0', hover: '#f070b8', light: 'rgba(232,85,160,0.14)',
  },
];

export function applyAccentColor(colorId) {
  const color = ACCENT_PALETTE.find(c => c.id === colorId) ?? ACCENT_PALETTE[0];
  const root  = document.documentElement;
  root.style.setProperty('--accent',       color.accent);
  root.style.setProperty('--accent-hover', color.hover);
  root.style.setProperty('--accent-light', color.light);
}
