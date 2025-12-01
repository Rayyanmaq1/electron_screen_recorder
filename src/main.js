const { app, BrowserWindow, ipcMain, desktopCapturer, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle getting video sources (screens and windows)
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  });
  return sources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnailDataUrl: source.thumbnail.toDataURL()
  }));
});

// Handle saving the recorded video
ipcMain.handle('save-video', async (event, buffer) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    buttonLabel: 'Save Video',
    defaultPath: `recording-${Date.now()}.webm`,
    filters: [
      { name: 'WebM Video', extensions: ['webm'] }
    ]
  });

  if (canceled || !filePath) {
    return { success: false, message: 'Save cancelled' };
  }

  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  } catch (error) {
    return { success: false, message: error.message };
  }
});
