// electron-main.js - Maths Studio eka Windows .exe ekak widiyata run karanna
// Next.js server eka Electron athulenma start karala, window ekak open karanawa.
const { app, BrowserWindow } = require('electron');
const path = require('path');

const PORT = 3000;
let win = null;
let nextApp = null;

async function startNext() {
  // production build eka (npm run build) karala thiyenna one
  const next = require('next');
  nextApp = next({ dev: false, dir: __dirname });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();
  const http = require('http');
  http.createServer((req, res) => handle(req, res)).listen(PORT, () => {
    console.log(`Maths Studio running on http://localhost:${PORT}`);
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Maths Studio',
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  win.loadURL(`http://localhost:${PORT}`);
  win.on('closed', () => { win = null; });
}

app.whenReady().then(async () => {
  await startNext();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
