// Gives the page the vault functions described by VaultBridge in src/study/lib/vault.ts, and nothing else.
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
