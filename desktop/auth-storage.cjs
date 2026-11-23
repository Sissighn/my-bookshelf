const { app, safeStorage } = require('electron')
const { randomUUID } = require('node:crypto')
const { mkdir, readFile, rename, rm, writeFile } = require('node:fs/promises')
const { join } = require('node:path')

function authPath(key) {
  if (typeof key !== 'string' || !/^my-bookshelf:installed-auth(?:-[a-z0-9-]{1,100})?$/i.test(key)) {
    throw new Error('Invalid auth storage key')
  }
  const dir = join(app.getPath('userData'), 'accounts')
  return { dir, file: join(dir, key.replace(':', '-')) }
}

async function setItem(key, value) {
  const { dir, file } = authPath(key)
  if (typeof value !== 'string' || value.length > 1024 * 1024) throw new Error('Invalid auth value')
  if (!await safeStorage.isAsyncEncryptionAvailable()) throw new Error('The macOS Keychain is unavailable')
  const encrypted = await safeStorage.encryptStringAsync(value)
  await mkdir(dir, { recursive: true, mode: 0o700 })
  const temporary = join(dir, randomUUID())
  try {
    await writeFile(temporary, encrypted, { mode: 0o600, flag: 'wx' })
    await rename(temporary, file)
  } finally {
    await rm(temporary, { force: true })
  }
}

async function getItem(key) {
  const { file } = authPath(key)
  let buffer
  try {
    buffer = await readFile(file)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(buffer)
  if (shouldReEncrypt) await setItem(key, result)
  return result
}

function removeItem(key) {
  return rm(authPath(key).file, { force: true })
}

module.exports = { getItem, setItem, removeItem }
