export const books = [
  { id: '101', title: 'Piranesi', author: 'Susanna Clarke', pages: 272, isbn: '9781635575637', exclusiveShelf: 'read', shelves: ['fantasy'] },
  { id: '202', title: 'Ficciones', author: 'Jorge Luis Borges', pages: 174, isbn: '', exclusiveShelf: 'to-read', shelves: ['classics'] },
]

export const csv = `Book Id,Title,Author,ISBN13,Exclusive Shelf,Bookshelves
101,Piranesi,Susanna Clarke,9781635575637,read,fantasy
202,Ficciones,Jorge Luis Borges,,to-read,classics
`

export function backup(library = { books }) {
  return JSON.stringify({ ...library, format: 'my-bookshelf', version: 1 })
}
