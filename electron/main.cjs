// Sprout Study as a desktop app. Notes are plain `<name>.md` files in a vault folder
// (Documents\Sprout Vault unless you pick another), so other editors can open them too.
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PAGE = path.join(__dirname, '..', 'dist', 'Sprout Study.html');
const PAGE_URL = pathToFileURL(PAGE).href;
const ICON = path.join(__dirname, '..', 'icons', 'sprout-study.ico');
const CONFIG = path.join(app.getPath('userData'), 'config.json');

/** Same rule as cleanNoteName in src/study/lib/notes.ts: nothing that could leave the vault folder. */
const UNSAFE_NAME = /[\\/:*?"<>|#^[\]\n\r\t\0]/;

let mainWindow = null;
let vaultFolder = '';
let watcher = null;
/** When the app last wrote each file, so its own saves aren't reported back as outside changes. */
const ownWrites = new Map();

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));
}

function noteFile(name) {
  if (typeof name !== 'string' || !name.trim() || name.length > 120 || UNSAFE_NAME.test(name) || /^\.|\.$/.test(name)) {
    throw new Error(`Not a valid note name: ${name}`);
  }
  const file = path.join(vaultFolder, `${name}.md`);
  if (path.dirname(file) !== path.resolve(vaultFolder)) throw new Error(`Not a valid note name: ${name}`);
  return file;
}

function markWritten(file) {
  ownWrites.set(path.basename(file).toLowerCase(), Date.now());
}

function openVault(folder) {
  fs.mkdirSync(folder, { recursive: true });
  vaultFolder = path.resolve(folder);
  watcher?.close();
  let timer = null;
  watcher = fs.watch(vaultFolder, (_event, filename) => {
    if (filename && Date.now() - (ownWrites.get(filename.toLowerCase()) ?? 0) < 1500) return;
    clearTimeout(timer);
    timer = setTimeout(() => mainWindow?.webContents.send('vault:changed'), 250);
  });
}

/** Only our own page may use the vault. */
function handle(channel, listener) {
  ipcMain.handle(channel, (event, ...args) => {
    if (event.senderFrame?.url.split('#')[0] !== PAGE_URL) throw new Error('Blocked');
    return listener(...args);
  });
}

handle('vault:folder', () => vaultFolder);

handle('vault:list', () =>
  fs
    .readdirSync(vaultFolder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => {
      const file = path.join(vaultFolder, entry.name);
      return { name: entry.name.slice(0, -3), body: fs.readFileSync(file, 'utf8'), updated: fs.statSync(file).mtimeMs };
    }),
);

handle('vault:write', (name, body) => {
  const file = noteFile(name);
  markWritten(file);
  fs.writeFileSync(file, String(body), 'utf8');
});

handle('vault:rename', (from, to) => {
  const source = noteFile(from);
  const target = noteFile(to);
  // A change of case only is fine; anything else must not overwrite another note.
  if (source.toLowerCase() !== target.toLowerCase() && fs.existsSync(target)) throw new Error('Name taken');
  markWritten(source);
  markWritten(target);
  fs.renameSync(source, target);
});

handle('vault:remove', async (name) => {
  const file = noteFile(name);
  markWritten(file);
  await shell.trashItem(file);
});

handle('vault:choose', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a vault folder',
    defaultPath: vaultFolder,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  openVault(result.filePaths[0]);
  writeConfig({ ...readConfig(), vault: vaultFolder });
  return vaultFolder;
});

handle('vault:open', () => shell.openPath(vaultFolder));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 420,
    minHeight: 400,
    title: 'Sprout Study',
    icon: ICON,
    autoHideMenuBar: true,
    backgroundColor: '#eef7ef',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // Web links open in the normal browser; the app window never leaves its own page.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.split('#')[0] !== PAGE_URL) event.preventDefault();
  });

  mainWindow.on('closed', () => (mainWindow = null));
  void mainWindow.loadFile(PAGE);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });

  app.whenReady().then(() => {
    openVault(readConfig().vault ?? path.join(app.getPath('documents'), 'Sprout Vault'));
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
