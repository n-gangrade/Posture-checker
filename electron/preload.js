const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendNotification: (data) => ipcRenderer.send('send-notification', data),
  sendSystemNotification: (data) => ipcRenderer.send('send-system-notification', data), // 👈 add
  onNotificationData: (callback) => ipcRenderer.on('notification-data', (event, data) => callback(data)),
  focusMainWindow: () => ipcRenderer.send('focus-main-window'),
});