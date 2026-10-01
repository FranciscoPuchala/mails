'use strict';

const path = require('node:path');
const { app, BrowserWindow, nativeTheme, session } = require('electron');
const { APP_ENTRY_URL, registerAppScheme, handleAppProtocol } = require('./utils/app-protocol');
const { registerTemplatesIpc } = require('./ipc/templates-ipc');
const { registerSettingsIpc } = require('./ipc/settings-ipc');
const { registerMailIpc } = require('./ipc/mail-ipc');
const { registerHistoryIpc } = require('./ipc/history-ipc');
const { applySavedTheme } = require('./services/settings-service');

const WINDOW_SIZE = { width: 1180, height: 760, minWidth: 960, minHeight: 640 };
const BACKGROUND = { dark: '#15161a', light: '#ffffff' };
const ICON_PATH = path.join(__dirname, '..', '..', 'assets', 'icon.png');

let mainWindow = null;

registerAppScheme();

function createMainWindow() {
  const win = new BrowserWindow({
    ...WINDOW_SIZE,
    show: false,
    title: 'MailRápido',
    autoHideMenuBar: true,
    icon: ICON_PATH,
    backgroundColor: nativeTheme.shouldUseDarkColors ? BACKGROUND.dark : BACKGROUND.light,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.loadURL(APP_ENTRY_URL);

  return win;
}

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', focusMainWindow);

  app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
      callback(false),
    );
    handleAppProtocol();
    registerTemplatesIpc();
    registerSettingsIpc();
    registerMailIpc();
    registerHistoryIpc();
    await applySavedTheme().catch((error) => console.error('[theme]', error));
    mainWindow = createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
