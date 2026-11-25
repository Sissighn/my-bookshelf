import { parseDecoration } from './decorations.js'

const BACKUP_FORMAT = 'my-bookshelf'

export function addGoodreadsBooks(library, imported) {
  const books = library?.books ?? []
  const knownIds = new Set(library?.removedBookIds)
  for (const book of books) knownIds.add(book.id)

  const additions = imported.filter((book) => {
    if (knownIds.has(book.id)) return false
    knownIds.add(book.id)
    return true
  })

  return additions.length ? { ...library, books: [...books, ...additions] } : library
}

export function removeFromLibrary(library, id) {
  return {
    ...library,
    books: library.books.filter((book) => book.id !== id),
    removedBookIds: [...new Set([...(library.removedBookIds ?? []), id])],
    shelfOrder: library.shelfOrder?.filter((itemId) => itemId !== id),
  }
}

export function shelfItems(library, books = library?.books ?? []) {
  const items = new Map(books.map((book) => [book.id, { id: book.id, book }]))
  for (const decoration of library?.decorations ?? []) {
    items.set(decoration.id, { id: decoration.id, decoration })
  }
  const ordered = []
  for (const id of library?.shelfOrder ?? []) {
    if (!items.has(id)) continue
    ordered.push(items.get(id))
    items.delete(id)
  }
  return [...ordered, ...items.values()]
}

export function moveShelfItem(items, sourceId, targetId, side) {
  if (sourceId === targetId) return items
  const source = items.findIndex((item) => item.id === sourceId)
  const target = items.findIndex((item) => item.id === targetId)
  if (source === -1 || target === -1) return items
  const destination = target + (side === 'after' ? 1 : 0) - (source < target ? 1 : 0)
  if (source === destination) return items

  const arranged = [...items]
  const [item] = arranged.splice(source, 1)
  arranged.splice(destination, 0, item)
  return arranged
}

export function saveArrangement(library, items) {
  const decorations = items.flatMap((item) => item.decoration ? [item.decoration] : [])
  return {
    ...library,
    books: items.flatMap((item) => item.book ? [item.book] : []),
    decorations,
    shelfOrder: decorations.length ? items.map((item) => item.id) : [],
  }
}

export function exportBackup(library) {
  const file = new Blob(
    [JSON.stringify({ ...library, format: BACKUP_FORMAT, version: 1 })],
    { type: 'application/json' },
  )
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = 'my-bookshelf-backup.json'
  link.click()
  const url = link.href
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function parseBackup(text) {
  const backup = JSON.parse(text)
  if (backup?.format !== BACKUP_FORMAT || backup.version !== 1 || !Array.isArray(backup.books)) {
    throw new Error('Choose a My Bookshelf backup file.')
  }

  const ids = new Set()
  const books = backup.books.map((book) => {
    if (typeof book?.id !== 'string' || !book.id || ids.has(book.id) ||
      typeof book.title !== 'string' || !book.title.trim()) {
      throw new Error('The backup has a missing title or an invalid book ID.')
    }
    ids.add(book.id)
    const fields = ['author', 'isbn', 'alternateIsbn', 'exclusiveShelf', 'year', 'binding', 'dateRead', 'notes']
    const metadata = Object.fromEntries(fields.map((key) => [key, typeof book[key] === 'string' ? book[key] : '']))
    return {
      ...metadata,
      id: book.id,
      title: book.title,
      author: metadata.author || 'Unknown',
      exclusiveShelf: metadata.exclusiveShelf || 'to-read',
      shelves: Array.isArray(book.shelves) ? book.shelves.filter((shelf) => typeof shelf === 'string') : [],
      pages: Number.isFinite(book.pages) ? book.pages : 0,
      myRating: Number.isFinite(book.myRating) ? book.myRating : 0,
      averageRating: Number.isFinite(book.averageRating) ? book.averageRating : 0,
      coverId: Number.isSafeInteger(book.coverId) && book.coverId > 0 ? book.coverId : null,
      coverImage: /^data:image\/(?:jpeg|png|webp);base64,/.test(book.coverImage) ? book.coverImage : '',
      coverFacing: book.coverFacing === true,
    }
  })
  const removedBookIds = Array.isArray(backup.removedBookIds)
    ? [...new Set(backup.removedBookIds.filter((id) => typeof id === 'string' && id && !ids.has(id)))]
    : []
  const decorations = []
  if (Array.isArray(backup.decorations)) {
    for (const raw of backup.decorations) {
      const decoration = parseDecoration(raw)
      if (!decoration || ids.has(decoration.id)) throw new Error('The backup contains invalid shelf decorations.')
      ids.add(decoration.id)
      decorations.push(decoration)
    }
  }
  const shelfOrder = decorations.length && Array.isArray(backup.shelfOrder)
    ? [...new Set(backup.shelfOrder.filter((id) => ids.has(id)))]
    : []
  return { books, removedBookIds, decorations, shelfOrder }
}
