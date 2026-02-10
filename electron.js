const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

// Detect dev mode
const isDev = !fs.existsSync(path.join(__dirname, 'out', 'index.html'));

let mainWindow;
let chatWindow = null;
let monitoringInterval = null;
let currentMeetings = [];

// ──────────────────────────────────────────────
// Permission Management
// ──────────────────────────────────────────────

const PERM_FILE = path.join(app.getPath('userData'), 'detection-permissions.json');
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function loadPermissions() {
  try {
    if (fs.existsSync(PERM_FILE)) {
      return JSON.parse(fs.readFileSync(PERM_FILE, 'utf-8'));
    }
  } catch { }
  return null;
}

function savePermissions(granted) {
  const data = {
    granted,
    grantedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SEVEN_DAYS).toISOString(),
  };
  fs.writeFileSync(PERM_FILE, JSON.stringify(data, null, 2));
  return data;
}

function isPermissionValid() {
  const perm = loadPermissions();
  if (!perm) return null; // never asked
  if (new Date(perm.expiresAt) < new Date()) return null; // expired
  return perm.granted;
}

// ──────────────────────────────────────────────
// Cross-Platform Meeting Detection
// ──────────────────────────────────────────────

// --- Zoom Detection (all platforms) ---
// On macOS: Two-step check:
//   1. CptHost process running = Zoom has meeting component loaded
//   2. Window title contains "Zoom Meeting" = meeting is actively in progress
// Both must be true. When user leaves meeting but keeps Zoom open,
// CptHost may persist but the "Zoom Meeting" window disappears.
function detectZoom() {
  const platform = process.platform;

  if (platform === 'darwin') {
    return detectZoomMac();
  } else if (platform === 'win32') {
    return detectZoomWin();
  } else {
    return detectZoomLinux();
  }
}

function detectZoomMac() {
  return new Promise((resolve) => {
    // Check for both CptHost AND aomhost processes.
    // CptHost = Zoom's meeting component (may persist after leaving)
    // aomhost = Zoom's audio/video host (stops when you leave the meeting)
    // Both must be running for an active meeting.
    exec(`ps aux | grep -E 'CptHost|aomhost' | grep -v grep`, (error, stdout) => {
      const out = (stdout || '');
      const hasCptHost = out.includes('CptHost');
      const hasAomhost = out.includes('aomhost');

      if (hasCptHost && hasAomhost) {
        resolve({
          id: 'zoom-active',
          platform: 'zoom',
          title: 'Zoom Meeting',
          status: 'active',
          detectedAt: new Date().toISOString(),
        });
      } else {
        resolve(null);
      }
    });
  });
}

function detectZoomWin() {
  return new Promise((resolve) => {
    // Windows: PowerShell can read window titles without accessibility restrictions.
    // Check if Zoom has a window with "Zoom Meeting" in the title.
    const cmd = `powershell -Command "Get-Process -Name 'Zoom' -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -like '*Zoom Meeting*'} | Select-Object -First 1 -ExpandProperty MainWindowTitle"`;
    exec(cmd, { timeout: 5000 }, (error, stdout) => {
      const result = (stdout || '').trim();
      if (result) {
        resolve({
          id: 'zoom-active',
          platform: 'zoom',
          title: 'Zoom Meeting',
          status: 'active',
          detectedAt: new Date().toISOString(),
        });
      } else {
        // Fallback: check CptHost.exe + aomhost.exe processes
        exec(`tasklist /FO CSV /NH`, (err2, stdout2) => {
          const out = (stdout2 || '');
          const hasCptHost = out.includes('CptHost');
          const hasAomhost = out.includes('aomhost');
          if (hasCptHost && hasAomhost) {
            resolve({
              id: 'zoom-active',
              platform: 'zoom',
              title: 'Zoom Meeting',
              status: 'active',
              detectedAt: new Date().toISOString(),
            });
          } else {
            resolve(null);
          }
        });
      }
    });
  });
}

function detectZoomLinux() {
  return new Promise((resolve) => {
    // Linux: Check for both CptHost and aomhost (same as macOS)
    exec(`ps aux | grep -E 'CptHost|aomhost' | grep -v grep`, (error, stdout) => {
      const out = (stdout || '');
      const hasCptHost = out.includes('CptHost');
      const hasAomhost = out.includes('aomhost');
      if (hasCptHost && hasAomhost) {
        resolve({
          id: 'zoom-active',
          platform: 'zoom',
          title: 'Zoom Meeting',
          status: 'active',
          detectedAt: new Date().toISOString(),
        });
      } else {
        resolve(null);
      }
    });
  });
}

function detectGoogleMeet() {
  const platform = process.platform;
  if (platform === 'darwin') return detectGoogleMeetMac();
  if (platform === 'win32') return detectGoogleMeetWin();
  return detectGoogleMeetLinux();
}

// Active Google Meet URLs have a meeting code: meet.google.com/abc-defg-hij
// The landing page (meet.google.com or meet.google.com/landing) should NOT trigger detection.
const MEET_ACTIVE_REGEX = /meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/;

function detectGoogleMeetMac() {
  return new Promise((resolve) => {
    const browsers = ['Brave Browser', 'Google Chrome', 'Microsoft Edge', 'Arc', 'Vivaldi'];
    const chromiumChecks = browsers.map(b => `
      try
        tell application "System Events"
          if exists (process "${b}") then
            tell application "${b}"
              repeat with w in windows
                repeat with t in tabs of w
                  set tabUrl to URL of t
                  if tabUrl contains "meet.google.com/" then
                    return tabUrl & "|||" & title of t
                  end if
                end repeat
              end repeat
            end tell
          end if
        end tell
      end try
    `).join('\n');

    const script = `
      ${chromiumChecks}
      try
        tell application "System Events"
          if exists (process "Safari") then
            tell application "Safari"
              repeat with w in windows
                repeat with t in tabs of w
                  set tabUrl to URL of t
                  if tabUrl contains "meet.google.com/" then
                    return tabUrl & "|||" & name of t
                  end if
                end repeat
              end repeat
            end tell
          end if
        end tell
      end try
      return "NONE"
    `;

    exec(`osascript -e '${script}'`, { timeout: 5000 }, (error, stdout) => {
      const result = (stdout || '').trim();
      if (result && result !== 'NONE') {
        const [url, title] = result.split('|||');
        const titleLower = (title || '').toLowerCase();
        const isEnded = titleLower.includes('you left') || titleLower.includes('meeting ended') || titleLower.includes('call ended');
        if (MEET_ACTIVE_REGEX.test(url) && !isEnded) {
          resolve({
            id: 'gmeet-active',
            platform: 'google-meet',
            title: (title || 'Google Meet').trim(),
            status: 'active',
            detectedAt: new Date().toISOString(),
          });
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

function detectGoogleMeetWin() {
  return new Promise((resolve) => {
    const cmd = `powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -match 'meet\\.google\\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}'} | Select-Object -ExpandProperty MainWindowTitle -First 1"`;
    exec(cmd, { timeout: 5000 }, (error, stdout) => {
      const result = (stdout || '').trim();
      if (result) {
        resolve({
          id: 'gmeet-active',
          platform: 'google-meet',
          title: result,
          status: 'active',
          detectedAt: new Date().toISOString(),
        });
      } else {
        resolve(null);
      }
    });
  });
}

function detectGoogleMeetLinux() {
  return new Promise((resolve) => {
    exec(`wmctrl -l 2>/dev/null || xdotool search --name "meet.google.com" getwindowname 2>/dev/null`, { timeout: 5000 }, (error, stdout) => {
      const out = (stdout || '');
      const lines = out.trim().split('\n');
      const meetLine = lines.find(l => MEET_ACTIVE_REGEX.test(l));
      if (meetLine) {
        resolve({
          id: 'gmeet-active',
          platform: 'google-meet',
          title: meetLine.trim(),
          status: 'active',
          detectedAt: new Date().toISOString(),
        });
      } else {
        resolve(null);
      }
    });
  });
}

// ──────────────────────────────────────────────
// Detection Loop (non-overlapping async, no debounce)
// ──────────────────────────────────────────────
let isDetecting = false;
let chatOpenedForPlatform = null;

async function detectMeetings() {
  if (isDetecting) return;
  isDetecting = true;

  try {
    const [zoom, gmeet] = await Promise.all([detectZoom(), detectGoogleMeet()]);
    const meetings = [zoom, gmeet].filter(Boolean);

    const prevPlatforms = currentMeetings.map(m => m.platform);
    const newMeetings = meetings.filter(m => !prevPlatforms.includes(m.platform));

    currentMeetings = meetings;

    // Notify renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('meetings:update', meetings);
    }

    // Open AI Chatbot window for newly detected meetings
    for (const meeting of newMeetings) {
      console.log(`[Dejavue] New meeting detected: ${meeting.platform} - ${meeting.title}`);
      chatOpenedForPlatform = meeting.platform;
      openChatWindow(meeting);
    }

    // Check if the meeting the chatbot was opened for has ended
    // No debounce — fire immediately when meeting is no longer detected
    if (chatOpenedForPlatform && chatWindow && !chatWindow.isDestroyed()) {
      const stillActive = meetings.some(m => m.platform === chatOpenedForPlatform);
      if (!stillActive) {
        console.log(`[Dejavue] Meeting ended: ${chatOpenedForPlatform}`);
        chatWindow.webContents.send('meeting:ended');
        chatOpenedForPlatform = null;
      }
    }

  } catch (err) {
    console.error('[Dejavue] Detection error:', err);
  } finally {
    isDetecting = false;
  }
}

function openChatWindow(meeting) {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.focus();
    return;
  }

  chatWindow = new BrowserWindow({
    width: 480,
    height: 650,
    minWidth: 380,
    minHeight: 500,
    title: 'AI Chatbot',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const chatUrl = isDev
    ? `http://localhost:3000/dashboard/ai-chat?platform=${meeting.platform}&title=${encodeURIComponent(meeting.title)}`
    : `file://${path.join(__dirname, 'out/dashboard/ai-chat.html')}?platform=${meeting.platform}&title=${encodeURIComponent(meeting.title)}`;

  chatWindow.loadURL(chatUrl);
  chatWindow.on('closed', () => { chatWindow = null; });
}

// Self-scheduling loop: waits for each detection to finish before scheduling the next
let monitoringActive = false;

async function monitoringLoop() {
  while (monitoringActive) {
    await detectMeetings();
    // Wait 3 seconds between each COMPLETED detection
    await new Promise(r => setTimeout(r, 3000));
  }
}

function startMonitoring() {
  if (monitoringActive) return;
  monitoringActive = true;
  monitoringInterval = true; // keep for IPC status check
  console.log('[Dejavue] Meeting monitoring started');
  monitoringLoop();
}

function stopMonitoring() {
  monitoringActive = false;
  monitoringInterval = null;
  console.log('[Dejavue] Meeting monitoring stopped');
}

function restartMonitoring() {
  stopMonitoring();
  currentMeetings = [];
  chatOpenedForPlatform = null;
  setTimeout(() => startMonitoring(), 100);
}

// ──────────────────────────────────────────────
// Window
// ──────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'out/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ──────────────────────────────────────────────
// IPC Handlers
// ──────────────────────────────────────────────
ipcMain.handle('meetings:get', () => currentMeetings);
ipcMain.handle('monitoring:start', () => { startMonitoring(); return true; });
ipcMain.handle('monitoring:stop', () => { stopMonitoring(); return true; });
ipcMain.handle('monitoring:restart', () => { restartMonitoring(); return true; });
ipcMain.handle('monitoring:status', () => !!monitoringInterval);

// Permission IPC
ipcMain.handle('permissions:check', () => {
  const status = isPermissionValid();
  return { granted: status, needsPrompt: status === null };
});

ipcMain.handle('permissions:grant', () => {
  savePermissions(true);
  startMonitoring();
  return true;
});

ipcMain.handle('permissions:deny', () => {
  savePermissions(false);
  stopMonitoring();
  return false;
});

ipcMain.handle('permissions:reset', () => {
  if (fs.existsSync(PERM_FILE)) fs.unlinkSync(PERM_FILE);
  return true;
});

// ──────────────────────────────────────────────
// App Lifecycle
// ──────────────────────────────────────────────
app.on('ready', () => {
  createWindow();

  // Auto-start monitoring if permission was previously granted
  // Delay slightly to let the window finish loading
  const perm = isPermissionValid();
  if (perm === true) {
    setTimeout(() => startMonitoring(), 2000);
  }
  // If perm is null (never asked or expired), the renderer will show the prompt
  // If perm is false (denied), don't start monitoring
});

app.on('window-all-closed', () => {
  stopMonitoring();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
