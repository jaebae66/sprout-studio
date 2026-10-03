// Gives the page the vault and database functions described by VaultBridge and
// DatabaseBridge in src/study/lib/vault.ts and src/study/lib/database.ts, and nothing else.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sproutVault', {
  folder: () => ipcRenderer.invoke('vault:folder'),
  list: () => ipcRenderer.invoke('vault:list'),
  write: (name, body) => ipcRenderer.invoke('vault:write', name, body),
  rename: (from, to) => ipcRenderer.invoke('vault:rename', from, to),
  remove: (name) => ipcRenderer.invoke('vault:remove', name),
  chooseFolder: () => ipcRenderer.invoke('vault:choose'),
  openFolder: () => ipcRenderer.invoke('vault:open'),
  onChange(listener) {
    const forward = () => listener();
    ipcRenderer.on('vault:changed', forward);
    return () => ipcRenderer.removeListener('vault:changed', forward);
  },
});

contextBridge.exposeInMainWorld('sproutDb', {
  load: () => ipcRenderer.sendSync('db:load'),
  save: (data) => ipcRenderer.sendSync('db:save', data),
  getPreference: (key) => ipcRenderer.sendSync('db:get-preference', key),
  setPreference: (key, value) => ipcRenderer.sendSync('db:set-preference', key, value),
  onChange(listener) {
    const forward = () => listener();
    ipcRenderer.on('db:changed', forward);
    return () => ipcRenderer.removeListener('db:changed', forward);
  },
});
