const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendNotification: (data) => ipcRenderer.send('send-notification', data),
});