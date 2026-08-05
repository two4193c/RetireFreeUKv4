const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'RetireFree UK — Retirement & Tax Planner',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false, // Allows smooth local asset loading
    },
  });

  // Hide default menu bar for a clean native app feel
  mainWindow.setMenuBarVisibility(false);

  const indexPath = path.join(__dirname, '../dist/index.html');

  if (app.isPackaged) {
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load app index.html:', err);
    });
  } else {
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      mainWindow.loadFile(indexPath);
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
