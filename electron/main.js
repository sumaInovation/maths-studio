const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
    }
  });

  // Dev eke nam localhost, build eke nam next start
  mainWindow.loadURL('http://localhost:3000');
}

app.whenReady().then(() => {
  // Next.js server eka start karanawa
  nextServer = spawn('npm', ['run', 'start'], {
    cwd: __dirname + '/..',
    shell: true
  });

  setTimeout(createWindow, 3000);
});

app.on('window-all-closed', () => {
  if (nextServer) nextServer.kill();
  app.quit();
});