# NotaraCBR

A clean, minimal comic book reader for desktop. Supports CBZ, CBR, and PDF with a distraction-free reading experience and automatic progress tracking.

Built with Electron + React.

---

## Features

**Library**
- CBZ, CBR, and PDF support
- Organize by reading status, series, tags, and collections
- Automatic progress saving — resumes exactly where you left off
- Cover art, star ratings, and reading statistics

**Reader**
- Immersive fullscreen mode (toggle with button or F11)
- Auto-hiding HUD — controls disappear while reading, reappear on hover
- Smooth swipe navigation with snap animation
- Seekable progress bar with live page preview while scrubbing
- Fit Height / Fit Width / Original size modes
- Zoom and pan at any zoom level

**UI**
- 8 accent colors — swap them from the toolbar
- Draggable titlebar in both library and reader
- Dark, typographically clean design

---

## Getting Started

### Requirements

- Node.js 18+
- npm 9+

### Install & run (development)

```bash
git clone https://github.com/your-username/notara-cbr.git
cd notara-cbr
npm install
npm run dev
```

This starts the Vite dev server and Electron simultaneously.

### Build for distribution

```bash
npm run build
```

Output goes to `dist-electron/`.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` / `Space` | Next page |
| `←` | Previous page |
| `F` | Cycle fit mode |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom |
| `F11` | Toggle fullscreen |
| `Esc` | Back to library |

---

## Tech Stack

- [Electron](https://www.electronjs.org/)
- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [JSZip](https://stuk.github.io/jszip/) — CBZ parsing
- [node-unrar-js](https://github.com/YuJianrong/node-unrar-js) — CBR parsing
- [PDF.js](https://mozilla.github.io/pdf.js/) — PDF rendering

---

## CBR Support Notes

CBR uses RAR compression. On some systems you may need build tools installed before `node-unrar-js` will compile:

```bash
# macOS
xcode-select --install

# Windows
npm install --global windows-build-tools
```

CBZ and PDF work regardless. If a CBR file fails to load the app shows an error without crashing.

---

## License

MIT © 2026 Notara
