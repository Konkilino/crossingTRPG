/* ═══════════════════════════════════════════════════
   TRPG Crossing Terminal - Electron Main Process
   ═══════════════════════════════════════════════════ */
const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    title: '穿越团 · 主神空间终端',
    backgroundColor: '#111122',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadFile('index.html');
  win.setMenuBarVisibility(false);
});

app.on('window-all-closed', () => app.quit());
