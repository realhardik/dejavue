const { app, BrowserWindow, ipcMain, dialog, session, desktopCapturer } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

// Detect dev mode
const isDev = !fs.existsSync(path.join(__dirname, 'out', 'index.html'));

let mainWindow;
let chatWindow = null;
let monitoringInterval = null;
let currentMeetings = [];
let activeMeetingDbId = null; // tracks DB _id of any meeting currently being recorded

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

  // Generate a unique meeting ID for this recording session
  const meetingId = `meeting-${Date.now()}`;
  const recordingsDir = path.join(app.getPath('userData'), 'recordings', meetingId);
  fs.mkdirSync(recordingsDir, { recursive: true });

  const { screen } = require('electron');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  chatWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    title: 'DejaVue Overlay',
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const chatUrl = isDev
    ? `http://localhost:3000/dashboard/overlay?platform=${meeting.platform}&title=${encodeURIComponent(meeting.title)}&meetingId=${meetingId}`
    : `file://${path.join(__dirname, 'out/dashboard/overlay.html')}?platform=${meeting.platform}&title=${encodeURIComponent(meeting.title)}&meetingId=${meetingId}`;

  chatWindow.loadURL(chatUrl);
  chatWindow.setIgnoreMouseEvents(false);

  // Grant speech-recognition + media permissions for the overlay window explicitly
  const allowed = ['media', 'microphone', 'audioCapture', 'speech-recognition'];
  chatWindow.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(allowed.includes(permission));
  });
  chatWindow.webContents.session.setPermissionCheckHandler((_wc, permission) => {
    return allowed.includes(permission);
  });

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
    width: 1000,
    height: 700,
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

// Audio recording + Local Whisper transcription IPC
ipcMain.handle('audio:transcribe', async (_event, meetingId, chunkIndex, buffer) => {
  console.log(`[Dejavue DEBUG] audio:transcribe called - meetingId: ${meetingId}, chunk: ${chunkIndex}, buffer size: ${buffer?.byteLength || 0}`);

  const os = require('os');
  const tmpDir = path.join(os.tmpdir(), 'dejavue-audio');
  fs.mkdirSync(tmpDir, { recursive: true });

  const webmPath = path.join(tmpDir, `chunk_${meetingId}_${chunkIndex}.webm`);

  try {
    // Save audio buffer to temp (deleted after Whisper processes it)
    const audioBuffer = Buffer.from(buffer);
    fs.writeFileSync(webmPath, audioBuffer);
    console.log(`[Dejavue DEBUG] Audio chunk temp saved: ${webmPath} (${audioBuffer.length} bytes)`);

    // Run local Whisper transcription
    return new Promise((resolve) => {
      // Use full path to whisper binary (pip installs to user's Python bin)
      const homeDir = require('os').homedir();
      const whisperPaths = [
        `${homeDir}/Library/Python/3.9/bin/whisper`,  // macOS pip3 user install
        `${homeDir}/.local/bin/whisper`,               // Linux pip3 user install
        'whisper',                                      // fallback: on PATH
      ];

      // Find the first whisper binary that exists
      let whisperBin = 'whisper';
      for (const p of whisperPaths) {
        if (fs.existsSync(p)) {
          whisperBin = p;
          console.log(`[Dejavue DEBUG] Found whisper at: ${p}`);
          break;
        }
      }

      // Auto-detect language — far more accurate than forcing Hindi.
      // Whisper's auto-detect correctly handles English, Hinglish, etc.
      const whisperCmd = `"${whisperBin}" "${webmPath}" --model base --output_format txt --output_dir "${tmpDir}" --fp16 False 2>&1`;
      console.log(`[Dejavue DEBUG] Running Whisper command: ${whisperCmd}`);

      // Include the Python bin dir in PATH so whisper can find ffmpeg
      const pythonBinDir = path.dirname(whisperBin);
      const env = { ...process.env, PATH: `${pythonBinDir}:${process.env.PATH}` };

      exec(whisperCmd, { timeout: 120000, env }, (error, stdout, stderr) => {
        console.log(`[Dejavue DEBUG] Whisper exec done. error: ${error?.message || 'none'}`);
        console.log(`[Dejavue DEBUG] Whisper stdout: ${(stdout || '').substring(0, 500)}`);
        if (stderr) console.log(`[Dejavue DEBUG] Whisper stderr: ${(stderr || '').substring(0, 500)}`);

        // Read the output .txt file
        const txtPath = webmPath.replace('.webm', '.txt');
        console.log(`[Dejavue DEBUG] Looking for output at: ${txtPath}, exists: ${fs.existsSync(txtPath)}`);

        if (fs.existsSync(txtPath)) {
          const text = fs.readFileSync(txtPath, 'utf-8').trim();
          console.log(`[Dejavue DEBUG] Whisper transcript (${text.length} chars): "${text.substring(0, 200)}"`);

          // Cleanup temp files
          try { fs.unlinkSync(webmPath); } catch { }
          try { fs.unlinkSync(txtPath); } catch { }

          // ── Noise/hallucination filter ────────────────────────────────────
          // Only filter obvious silence hallucinations. Keep single words — they're
          // often real (names, short answers, "yes", "gotcha", etc.)

          // Filter 1: completely empty
          if (!text || text.trim().length === 0) {
            resolve({ success: true, text: '' });
            return;
          }

          // Filter 2: known Whisper silence hallucinations on quiet audio
          const hallucinations = [
            'thank you for watching', 'thanks for watching', 'subscribe',
            'subs by', 'subtitles by', 'amara.org', 'please subscribe',
            'you', // single word "you" alone is nearly always hallucination
          ];
          const lower = text.toLowerCase().trim();
          if (hallucinations.some(h => lower === h || lower.includes('thank you for watching'))) {
            console.log(`[Dejavue DEBUG] Filtered: known hallucination phrase`);
            resolve({ success: true, text: '' });
            return;
          }

          // Filter 3: pure whitespace / punctuation only
          const stripped = text.replace(/[^\w]/g, '').trim();
          if (stripped.length < 2) {
            console.log(`[Dejavue DEBUG] Filtered: no real content`);
            resolve({ success: true, text: '' });
            return;
          }

          resolve({ success: true, text });
        } else {
          console.error(`[Dejavue DEBUG] Whisper output file NOT found at ${txtPath}`);
          // List what IS in the temp dir
          try {
            const files = fs.readdirSync(tmpDir);
            console.log(`[Dejavue DEBUG] Files in tmpDir: ${files.join(', ')}`);
          } catch { }
          // Cleanup
          try { fs.unlinkSync(webmPath); } catch { }
          resolve({ success: false, text: '', error: (error?.message || stdout || stderr || 'Whisper output not found') });
        }
      });
    });
  } catch (err) {
    console.error('[Dejavue DEBUG] Error in transcription:', err);
    return { success: false, text: '', error: err.message };
  }
});

ipcMain.handle('audio:get-recordings-path', () => {
  return path.join(app.getPath('userData'), 'recordings');
});

// Save meeting summary as .txt
ipcMain.handle('summary:save', async (_event, meetingId, summaryText, meetingTitle) => {
  try {
    const summariesDir = path.join(app.getPath('userData'), 'summaries');
    fs.mkdirSync(summariesDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTitle = (meetingTitle || 'meeting').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const fileName = `${safeTitle}_${timestamp}.txt`;
    const filePath = path.join(summariesDir, fileName);

    const fullContent = `Meeting Summary - ${meetingTitle || 'Untitled Meeting'}
Generated: ${new Date().toLocaleString()}
Meeting ID: ${meetingId}
${'='.repeat(60)}

${summaryText}
`;

    fs.writeFileSync(filePath, fullContent, 'utf-8');
    console.log(`[Dejavue] Summary saved: ${filePath}`);
    return { success: true, filePath };
  } catch (err) {
    console.error('[Dejavue] Error saving summary:', err);
    return { success: false, error: err.message };
  }
});

// Desktop capturer for system audio
ipcMain.handle('desktop-capturer:get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      fetchWindowIcons: false,
    });
    return sources.map(s => ({ id: s.id, name: s.name }));
  } catch (err) {
    console.error('[Dejavue] Error getting desktop sources:', err);
    return [];
  }
});

// Renderer registers its DB meeting _id so main process can finalize it on quit
ipcMain.handle('meeting:register-db-id', (_event, dbId) => {
  activeMeetingDbId = dbId;
  console.log(`[Dejavue] Registered active meeting DB id: ${dbId}`);
});

// On quit (even Ctrl-C / force-quit mid-meeting), mark the active meeting as completed
function finalizeActiveMeeting() {
  if (!activeMeetingDbId) return;
  const id = activeMeetingDbId;
  activeMeetingDbId = null;
  const port = isDev ? 3001 : 3000; // dev-electron uses port 3001 if 3000 is busy; try both
  const http = require('http');
  const body = JSON.stringify({ status: 'completed', endedAt: new Date().toISOString() });

  const tryPatch = (p) => new Promise((resolve) => {
    const req = http.request(
      { hostname: 'localhost', port: p, path: `/api/meetings/${id}`, method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      () => resolve(true)
    );
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });

  // Try port 3001 first (dev), then 3000
  tryPatch(3001).then(ok => { if (!ok) tryPatch(3000); });
  console.log(`[Dejavue] Finalized meeting ${id} as completed on quit`);
}

app.on('before-quit', finalizeActiveMeeting);
app.on('will-quit', finalizeActiveMeeting);

// Overlay mouse click-through: transparent areas pass events to underneath windows
ipcMain.handle('overlay:ignore-mouse-events', (_event, ignore) => {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

ipcMain.handle('permissions:reset', () => {

  if (fs.existsSync(PERM_FILE)) fs.unlinkSync(PERM_FILE);
  return true;
});

// ──────────────────────────────────────────────
// App Lifecycle
// ──────────────────────────────────────────────
app.on('ready', () => {
  // Auto-grant mic/camera permissions for the chatbot window
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'audioCapture', 'speech-recognition'];
    if (allowedPermissions.includes(permission)) {
      console.log(`[Dejavue] Auto-granting permission: ${permission}`);
      callback(true);
    } else {
      callback(false);
    }
  });

  // Also grant media/speech permission checks (for navigator.permissions.query)
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowedPermissions = ['media', 'microphone', 'audioCapture', 'speech-recognition'];
    return allowedPermissions.includes(permission);
  });

  createWindow();
  const perm = isPermissionValid();
  if (perm === true) setTimeout(() => startMonitoring(), 2000);
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
