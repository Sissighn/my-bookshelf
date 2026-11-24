const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('bookshelfDesktop', {
  prepareGoogleSignIn: () => ipcRenderer.invoke('bookshelf:prepare-google'),
  signInWithGoogle: (url) => ipcRenderer.invoke('bookshelf:google', url),
  cancelGoogleSignIn: (callback) => ipcRenderer.invoke('bookshelf:cancel-google', callback),
  authStorage: {
    getItem: (key) => ipcRenderer.invoke('bookshelf:get-auth', key),
    setItem: (key, value) => ipcRenderer.invoke('bookshelf:set-auth', key, value),
    removeItem: (key) => ipcRenderer.invoke('bookshelf:remove-auth', key),
  },
})
