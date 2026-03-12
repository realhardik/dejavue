const { contextBridge, ipcRenderer } = require('electron');

// Expose meeting detection, permission, and audio API to renderer process
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

  // Audio recording + local Whisper transcription
  transcribeAudio: (meetingId, chunkIndex, buffer) =>
    ipcRenderer.invoke('audio:transcribe', meetingId, chunkIndex, buffer),
  getRecordingsPath: () => ipcRenderer.invoke('audio:get-recordings-path'),

  // Save meeting summary as .txt
  saveSummary: (meetingId, summaryText, meetingTitle) =>
    ipcRenderer.invoke('summary:save', meetingId, summaryText, meetingTitle),

  // Desktop capturer (for system audio)
  getDesktopSources: () => ipcRenderer.invoke('desktop-capturer:get-sources'),

  // Overlay click-through: pass true to let clicks fall through transparent areas
  setIgnoreMouseEvents: (ignore) => ipcRenderer.invoke('overlay:ignore-mouse-events', ignore),

  // Register the active meeting's DB _id so main process can finalize it on quit
  registerMeetingDbId: (dbId) => ipcRenderer.invoke('meeting:register-db-id', dbId),

  // Hand off background finalization (summary + title + tasks) to main process
  // so the overlay can close immediately without waiting for Gemini calls.
  finalizeMeeting: (payload) => ipcRenderer.invoke('meeting:finalize', payload),


  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
});
