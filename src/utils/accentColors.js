// ── Accent colour palette ─────────────────────────────────────────────────────

export const ACCENT_PALETTE = [
  {
    id: 'orange', label: 'Ember', swatch: '#F97316',
    accent: '#F97316', hover: '#FB923C', light: 'rgba(249,115,22,0.14)',
  },
  {
    id: 'red', label: 'Ruby', swatch: '#EF4444',
    accent: '#EF4444', hover: '#F87171', light: 'rgba(239,68,68,0.14)',
  },
  {
    id: 'amber', label: 'Gold', swatch: '#EAB308',
    accent: '#EAB308', hover: '#FACC15', light: 'rgba(234,179,8,0.14)',
  },
  {
    id: 'green', label: 'Jade', swatch: '#22C55E',
    accent: '#22C55E', hover: '#4ADE80', light: 'rgba(34,197,94,0.14)',
  },
  {
    id: 'teal', label: 'Cyan', swatch: '#06B6D4',
    accent: '#06B6D4', hover: '#22D3EE', light: 'rgba(6,182,212,0.14)',
  },
  {
    id: 'blue', label: 'Sapphire', swatch: '#3B82F6',
    accent: '#3B82F6', hover: '#60A5FA', light: 'rgba(59,130,246,0.14)',
  },
  {
    id: 'purple', label: 'Violet', swatch: '#8B5CF6',
    accent: '#8B5CF6', hover: '#A78BFA', light: 'rgba(139,92,246,0.14)',
  },
  {
    id: 'pink', label: 'Fuchsia', swatch: '#EC4899',
    accent: '#EC4899', hover: '#F472B6', light: 'rgba(236,72,153,0.14)',
  },
];

export function applyAccentColor(colorId) {
  const color = ACCENT_PALETTE.find(c => c.id === colorId) ?? ACCENT_PALETTE[0];
  const root  = document.documentElement;
  root.style.setProperty('--accent',       color.accent);
  root.style.setProperty('--accent-hover', color.hover);
  root.style.setProperty('--accent-light', color.light);
}
