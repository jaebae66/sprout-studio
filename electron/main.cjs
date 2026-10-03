// Sprout Studio as a desktop app: notes, study tools and the book maker in one window.
// Notes are plain `<name>.md` files in a vault folder (Documents\Sprout Vault unless
// you pick another), so other editors can open them too.
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { openDatabase } = require('./database.cjs');
const { listNotes, noteFile: vaultNoteFile, writeNote } = require('./vault-files.cjs');

// Tests (and anyone wanting a separate profile) can point the app at another data folder.
if (process.env.SPROUT_USER_DATA) app.setPath('userData', path.resolve(process.env.SPROUT_USER_DATA));

const PAGE = path.join(__dirname, '..', 'dist', 'index.html');
const PAGE_URL = pathToFileURL(PAGE).href;
const ICON = path.join(__dirname, '..', 'icons', 'sprout-study.ico');
const CONFIG = path.join(app.getPath('userData'), 'config.json');
const DATABASE = path.join(app.getPath('userData'), 'sprout-studio.db');

/** How often to check whether something else (like the MCP server) changed the database. */
const DATABASE_CHECK_MS = 1000;

let mainWindow = null;
let vaultFolder = '';
let watcher = null;
let database = null;
/** When the app last wrote each file, so its own saves aren't reported back as outside changes. */
const ownWrites = new Map();
/** Notes on their way to the Recycle Bin (which takes a moment), so they aren't listed again meanwhile. */
const removing = new Set();

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
  return vaultNoteFile(vaultFolder, name);
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

function fromOurPage(event) {
  return event.senderFrame?.url.split('#')[0] === PAGE_URL;
}

/** Only our own page may use the vault or the database. */
function handle(channel, listener) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!fromOurPage(event)) throw new Error('Blocked');
    return listener(...args);
  });
}

/** Like `handle`, for calls the page waits on (it reads its data before the first render). Errors become `fallback`. */
function handleSync(channel, fallback, listener) {
  ipcMain.on(channel, (event, ...args) => {
    try {
      event.returnValue = fromOurPage(event) ? listener(...args) : fallback;
    } catch (error) {
      console.error(`${channel} failed:`, error);
      event.returnValue = fallback;
    }
  });
}

handleSync('db:load', null, () => database.load());
handleSync('db:save', false, (data) => {
  database.save(data);
  return true;
});
handleSync('db:get-preference', null, (key) => database.getPreference(key));
handleSync('db:set-preference', false, (key, value) => {
  database.setPreference(key, value);
  return true;
});

handle('vault:folder', () => vaultFolder);

handle('vault:list', () => listNotes(vaultFolder).filter((note) => !removing.has(note.name.toLowerCase())));

handle('vault:write', (name, body) => {
  markWritten(noteFile(name));
  writeNote(vaultFolder, name, body);
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
  removing.add(name.toLowerCase());
  try {
    await shell.trashItem(file);
  } finally {
    removing.delete(name.toLowerCase());
  }
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
    title: 'Sprout Studio',
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
    database = openDatabase(DATABASE);
    const config = readConfig();
    openVault(config.vault ?? path.join(app.getPath('documents'), 'Sprout Vault'));
    // Written down so tools outside the app (the MCP server) can find the vault.
    if (config.vault !== vaultFolder) writeConfig({ ...config, vault: vaultFolder });
    createWindow();

    // Changes from anywhere else (the MCP server, another tool) make the page reload its data.
    let lastVersion = database.dataVersion();
    setInterval(() => {
      const version = database.dataVersion();
      if (version === lastVersion) return;
      lastVersion = version;
      mainWindow?.webContents.send('db:changed');
    }, DATABASE_CHECK_MS);
  });

  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => database?.close());
}
