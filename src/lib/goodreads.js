import Papa from 'papaparse'

function cleanIsbn(raw) {
  if (!raw) return ''
  const digits = String(raw)
    .replace(/^="?|"?$/g, '')
    .replace(/[^0-9Xx]/g, '')
    .toUpperCase()
  return digits.length === 10 || digits.length === 13 ? digits : ''
}

function cleanText(raw) {
  return String(raw ?? '').trim()
}

function toNumber(raw) {
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

export function prettifyShelf(slug) {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function parseShelves(raw, exclusiveShelf) {
  return cleanText(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== exclusiveShelf)
}

function normalizeRow(row, index) {
  const title = cleanText(row['Title'])
  if (!title) return null

  const exclusiveShelf = cleanText(row['Exclusive Shelf']) || 'read'
  const isbn13 = cleanIsbn(row['ISBN13'])
  const isbn = cleanIsbn(row['ISBN'])

  return {
    id: cleanText(row['Book Id']) || `${index}-${title}`,
    title,
    author: cleanText(row['Author']) || 'Unknown',
    isbn: isbn13 || isbn,
    myRating: toNumber(row['My Rating']),
    averageRating: toNumber(row['Average Rating']),
    exclusiveShelf,
    shelves: parseShelves(row['Bookshelves'], exclusiveShelf),
    pages: toNumber(row['Number of Pages']),
    year: cleanText(row['Original Publication Year']) || cleanText(row['Year Published']),
    binding: cleanText(row['Binding']),
    dateRead: cleanText(row['Date Read']),
  }
}

export function parseGoodreadsCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: ({ data }) => {
        if (!data.length || !('Title' in data[0])) {
          reject(
            new Error(
              "That doesn't look like a Goodreads export — no “Title” column found.",
            ),
          )
          return
        }
        const books = data.map(normalizeRow).filter(Boolean)
        if (!books.length) {
          reject(new Error('No books found in that file.'))
          return
        }
        resolve({ books, skipped: data.length - books.length })
      },
      error: (err) => reject(new Error(err.message || 'Could not read that file.')),
    })
  })
}

const EXCLUSIVE_ORDER = ['currently-reading', 'read', 'to-read']

export function buildFilters(books) {
  const exclusiveCounts = new Map()
  const shelfCounts = new Map()

  for (const book of books) {
    exclusiveCounts.set(
      book.exclusiveShelf,
      (exclusiveCounts.get(book.exclusiveShelf) ?? 0) + 1,
    )
    for (const shelf of book.shelves) {
      shelfCounts.set(shelf, (shelfCounts.get(shelf) ?? 0) + 1)
    }
  }

  const exclusive = [...exclusiveCounts.keys()].sort((a, b) => {
    const ai = EXCLUSIVE_ORDER.indexOf(a)
    const bi = EXCLUSIVE_ORDER.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const custom = [...shelfCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([slug]) => slug)

  return [
    { id: 'all', label: 'All', kind: 'all', count: books.length },
    ...exclusive.map((slug) => ({
      id: `exclusive:${slug}`,
      label: prettifyShelf(slug),
      kind: 'exclusive',
      slug,
      count: exclusiveCounts.get(slug),
    })),
    ...custom.map((slug) => ({
      id: `shelf:${slug}`,
      label: prettifyShelf(slug),
      kind: 'shelf',
      slug,
      count: shelfCounts.get(slug),
    })),
  ]
}

function matchesFilter(book, filter) {
  if (!filter || filter.kind === 'all') return true
  if (filter.kind === 'exclusive') return book.exclusiveShelf === filter.slug
  return book.shelves.includes(filter.slug)
}

export function filterBooks(books, { query, filter }) {
  const q = query.trim().toLowerCase()
  return books.filter((book) => {
    if (!matchesFilter(book, filter)) return false
    if (!q) return true
    return (
      book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q)
    )
  })
}
