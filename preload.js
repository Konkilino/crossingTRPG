/* ═══════════════════════════════════════════════════
   TRPG Crossing Terminal - Preload (IPC Bridge)
   ═══════════════════════════════════════════════════
   Exposes secure, wrapped Electron IPC methods to the
   renderer process via contextBridge.
   
   NEVER expose raw ipcRenderer — Electron 29+ returns
   empty objects for it over contextBridge. Always wrap
   each method individually.
   ═══════════════════════════════════════════════════ */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ──────────── Renderer → Main (fire-and-forget) ────────────

  /** Trigger update check against GitHub Releases */
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),

  /** Start downloading the available update */
  startDownload: () => ipcRenderer.send('start-download'),

  /** Quit the app and install the downloaded update */
  quitAndInstall: () => ipcRenderer.send('quit-and-install'),

  // ──────────── Renderer → Main (invoke/handle) ────────────

  /** Get the current app version string (e.g. "2.2.0") */
  getVersion: () => ipcRenderer.invoke('get-app-version'),

  // ──────────── Main → Renderer (push events) ────────────

  /**
   * Listen for update status from main process.
   * @param {function} callback - receives (status, data)
   *   status: 'checking' | 'available' | 'not-available' | 'downloaded' | 'error'
   * @returns {function} cleanup — call to remove listener
   */
  onUpdateStatus: (callback) => {
    const handler = (_event, status, data) => callback(status, data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },

  /**
   * Listen for download progress from main process.
   * @param {function} callback - receives { percent, transferred, total, bytesPerSecond }
   * @returns {function} cleanup — call to remove listener
   */
  onDownloadProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
});
