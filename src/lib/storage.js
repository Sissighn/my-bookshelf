const KEY = 'my-bookshelf:library:v1'

export function loadLibrary() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.books) || !parsed.books.length) return null
    return parsed
  } catch {
    return null
  }
}

export function saveLibrary(books, fileName) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ books, fileName, savedAt: Date.now() }),
    )
  } catch {
  }
}

export function clearLibrary() {
  try {
    localStorage.removeItem(KEY)
  } catch {
  }
}
