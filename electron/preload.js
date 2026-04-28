const { contextBridge, ipcRenderer } = require('electron');

// Expose a small, safe API to the renderer for notifications and session data.
contextBridge.exposeInMainWorld('electronAPI', {
  sendNotification: (data) => ipcRenderer.send('send-notification', data),
  sendSystemNotification: (data) => ipcRenderer.send('send-system-notification', data),
  onNotificationData: (callback) => ipcRenderer.on('notification-data', (event, data) => callback(data)),
  focusMainWindow: () => ipcRenderer.send('focus-main-window'),
  getSessionStats: () => ipcRenderer.invoke('get-session-stats'),
  exportSessionData: () => ipcRenderer.invoke('export-session-data'),
});