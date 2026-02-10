const { contextBridge, ipcRenderer } = require('electron');

// Expose meeting detection and permission API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Meeting detection
  getMeetings: () => ipcRenderer.invoke('meetings:get'),
  onMeetingsUpdate: (callback) => {
    const handler = (_event, meetings) => callback(meetings);
    ipcRenderer.on('meetings:update', handler);
    return () => ipcRenderer.removeListener('meetings:update', handler);
  },
  onMeetingEnded: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('meeting:ended', handler);
    return () => ipcRenderer.removeListener('meeting:ended', handler);
  },

  // Monitoring controls
  startMonitoring: () => ipcRenderer.invoke('monitoring:start'),
  stopMonitoring: () => ipcRenderer.invoke('monitoring:stop'),
  restartMonitoring: () => ipcRenderer.invoke('monitoring:restart'),
  getMonitoringStatus: () => ipcRenderer.invoke('monitoring:status'),

  // Permissions
  checkPermissions: () => ipcRenderer.invoke('permissions:check'),
  grantPermissions: () => ipcRenderer.invoke('permissions:grant'),
  denyPermissions: () => ipcRenderer.invoke('permissions:deny'),
  resetPermissions: () => ipcRenderer.invoke('permissions:reset'),
});
