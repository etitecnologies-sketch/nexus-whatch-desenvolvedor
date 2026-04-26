const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
  },
  mediamtx: {
    addStream: (name, rtspUrl) => ipcRenderer.invoke('mediamtx:addStream', { name, rtspUrl }),
    removeStream: (name) => ipcRenderer.invoke('mediamtx:removeStream', name),
  },
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
});
