/* ═══════════════════════════════════════════════════
   TRPG Crossing Terminal - Electron Main Process
   ═══════════════════════════════════════════════════ */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

/* ──── Logging ─────────────────────────────────────── */
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('CrossingTRPG starting...');

/* ──── Updater configuration ──────────────────────── */
autoUpdater.autoDownload = false;           // user must consent to download
autoUpdater.autoInstallOnAppQuit = true;    // install when app quits (if downloaded)

/* ──── Window reference ───────────────────────────── */
let mainWindow = null;

/* ──── Helper: push update status to renderer ─────── */
function sendUpdateStatus(status, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', status, data);
  }
}

/* ──── Auto-updater event listeners ───────────────── */

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
  sendUpdateStatus('checking');
});

autoUpdater.on('update-available', (info) => {
  log.info(`Update available: v${info.version}`);
  sendUpdateStatus('available', { version: info.version });
});

autoUpdater.on('update-not-available', (info) => {
  log.info(`No update available (current: v${app.getVersion()})`);
  sendUpdateStatus('not-available');
});

autoUpdater.on('download-progress', (progress) => {
  log.info(`Download: ${Math.round(progress.percent)}%`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log.info(`Update downloaded: v${info.version}`);
  sendUpdateStatus('downloaded', { version: info.version });
});

autoUpdater.on('error', (err) => {
  log.error('Updater error:', err.message);
  sendUpdateStatus('error', { message: err.message || 'Unknown error' });
});

/* ──── IPC handlers (called from renderer via preload) */

ipcMain.on('check-for-updates', () => {
  log.info('IPC: check-for-updates');
  autoUpdater.checkForUpdates().catch((err) => {
    log.error('checkForUpdates failed:', err.message);
    sendUpdateStatus('error', { message: err.message });
  });
});

ipcMain.on('start-download', () => {
  log.info('IPC: start-download');
  autoUpdater.downloadUpdate().catch((err) => {
    log.error('downloadUpdate failed:', err.message);
    sendUpdateStatus('error', { message: err.message });
  });
});

ipcMain.on('quit-and-install', () => {
  log.info('IPC: quit-and-install');
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

/* ──── Main window ────────────────────────────────── */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    title: '穿越团 · 主神空间终端',
    backgroundColor: '#111122',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => { mainWindow = null; });

  // Auto-check for updates (production only, 3s after launch)
  if (app.isPackaged) {
    setTimeout(() => {
      log.info('Launch check: looking for updates...');
      autoUpdater.checkForUpdates().catch((err) => {
        log.error('Launch check failed:', err.message);
      });
    }, 3000);
  }
}

/* ──── App lifecycle ──────────────────────────────── */
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
