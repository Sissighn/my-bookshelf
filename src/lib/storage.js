const LEGACY_KEY = 'my-bookshelf:library:v1'
const STORE = 'library'
const RECORD = 'current'

let database

function openDatabase() {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('my-bookshelf', 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        database = undefined
      }
      resolve(db)
    }
    request.onerror = () => reject(request.error)
  }).catch((error) => {
    database = undefined
    throw error
  })
  return database
}

export function loadLegacyLibrary() {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY))
    return Array.isArray(legacy?.books) ? { books: legacy.books } : null
  } catch {
    return null
  }
}

export async function loadLibrary() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)
    const request = store.get(RECORD)
    let library
    request.onsuccess = () => {
      library = request.result
      if (library) return
      library = loadLegacyLibrary()
      if (library) store.put(library, RECORD)
    }
    transaction.oncomplete = () => resolve(library)
    transaction.onabort = () => reject(transaction.error)
  })
}

export async function saveLibrary(library) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error)
    transaction.objectStore(STORE).put(library, RECORD)
  })
}
