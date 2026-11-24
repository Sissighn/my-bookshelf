const { app, BrowserWindow, ipcMain, net, protocol, session, shell } = require('electron')
const { join, relative, resolve, sep } = require('node:path')
const { pathToFileURL } = require('node:url')
const storage = require('./auth-storage.cjs')
const { createGoogleSignIn } = require('./google-auth.cjs')
const { authOrigin } = require('./config.json')

const entry = 'bookshelf://app/'
const webRoot = join(__dirname, 'web')
let window
const google = createGoogleSignIn(authOrigin, (url) => shell.openExternal(url), () => {
  window?.show()
  window?.focus()
})

protocol.registerSchemesAsPrivileged([
  { scheme: 'bookshelf', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

async function serveAsset(request) {
  const url = new URL(request.url)
  if (url.host !== 'app' || !['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 404 })
  try {
    const path = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
    const asset = resolve(webRoot, `.${path}`)
    const location = relative(webRoot, asset)
    if (!location || location === '..' || location.startsWith(`..${sep}`)) return new Response(null, { status: 404 })
    return await net.fetch(pathToFileURL(asset).href, { method: request.method })
  } catch {
    return new Response(null, { status: 404 })
  }
}

function registerAction(channel, action) {
  ipcMain.handle(`bookshelf:${channel}`, (event, ...args) => {
    const frame = event.senderFrame
    if (!frame || frame !== window?.webContents.mainFrame || frame.url !== entry) throw new Error('Untrusted sender')
    return action(...args)
  })
}

function openWindow() {
  window = new BrowserWindow({
    title: 'My Bookshelf', width: 1160, height: 820, minWidth: 420, minHeight: 430,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      sandbox: true, contextIsolation: true, nodeIntegration: false, spellcheck: false,
    },
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => {
    if (event.url !== entry) event.preventDefault()
  })
  window.webContents.on('will-attach-webview', (event) => event.preventDefault())
  window.once('ready-to-show', () => window?.show())
  window.on('closed', () => {
    google.cancel()
    window = undefined
  })
  window.loadURL(entry)
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => window ? window.show() : openWindow())
  app.on('activate', () => { if (!window) openWindow() })
  app.whenReady().then(() => {
    protocol.handle('bookshelf', serveAsset)
    session.defaultSession.setPermissionCheckHandler(() => false)
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    session.defaultSession.on('will-download', (event, item) => {
      if (item.getURL().startsWith('blob:bookshelf://app/') && item.getFilename() === 'my-bookshelf-backup.json') return
      event.preventDefault()
    })
    registerAction('prepare-google', google.prepare)
    registerAction('google', google.signIn)
    registerAction('cancel-google', google.cancel)
    registerAction('get-auth', storage.getItem)
    registerAction('set-auth', storage.setItem)
    registerAction('remove-auth', storage.removeItem)
    openWindow()
  })
}
