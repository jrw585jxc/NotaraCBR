const { createWindowsInstaller } = require('electron-winstaller');
const path = require('path');

const root = path.join(__dirname, '..');

createWindowsInstaller({
  appDirectory:    path.join(root, 'dist-electron', 'NotaraCBR-win32-x64'),
  outputDirectory: path.join(root, 'dist-electron', 'installer'),
  authors:         'Notara',
  description:     'A clean, minimal comic book reader for desktop.',
  exe:             'NotaraCBR.exe',
  setupExe:        'NotaraCBR-Setup.exe',
  setupIcon:       path.join(root, 'public', 'icon.ico'),
  iconUrl:         'file://' + path.join(root, 'public', 'icon.ico'),
  loadingGif:      path.join(root, 'public', 'installer-loading.gif'),
  noMsi:           true,
  createDesktopShortcut: true,
})
.then(() => {
  console.log('');
  console.log(' ================================================');
  console.log('  Installer ready!');
  console.log('  dist-electron\\installer\\NotaraCBR-Setup.exe');
  console.log(' ================================================');
  console.log('');
})
.catch((err) => {
  console.error('[ERROR] Installer creation failed:', err.message);
  process.exit(1);
});
