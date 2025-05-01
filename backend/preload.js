const { contextBridge, ipcRenderer } = require('electron');

// Expondo métodos seguros para o frontend
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        on: (channel, listener) => ipcRenderer.on(channel, listener),
        removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    },
});
