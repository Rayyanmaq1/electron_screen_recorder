const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  systemPreferences,
} = require("electron");
const path = require("node:path");
const remoteMain = require("@electron/remote/main");

remoteMain.initialize();

// Handle IPC request for screen sources
ipcMain.handle("get-sources", async () => {
  try {
    // On macOS, check screen recording permission
    if (process.platform === "darwin") {
      const status = systemPreferences.getMediaAccessStatus("screen");
      console.log("macOS screen recording permission status:", status);

      if (status !== "granted") {
        console.log("Requesting screen recording permission...");
        // This will prompt user if not already granted
      }
    }

    console.log("Attempting to get desktop sources...");
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 150, height: 150 },
    });
    console.log(`Found ${sources.length} sources`);
    return sources;
  } catch (error) {
    console.error("Error getting sources in main process:", error);
    console.error("Error details:", error.message, error.stack);
    throw error;
  }
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Enable remote module for this window
  remoteMain.enable(mainWindow.webContents);

  // Set permissions for screen capture
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media") {
        callback(true);
      } else {
        callback(false);
      }
    }
  );

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
