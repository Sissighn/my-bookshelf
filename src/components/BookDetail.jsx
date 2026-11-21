import { prettifyShelf } from '../lib/goodreads'
import BookPreview from './BookPreview'
import Dialog from './Dialog'
import Stars from './Stars'

export default function BookDetail({ book, onClose, onEdit }) {
  const facts = [
    ['Shelf', prettifyShelf(book.exclusiveShelf)],
    book.year && ['Published', book.year],
    book.pages > 0 && ['Pages', String(book.pages)],
    book.binding && ['Format', book.binding],
    book.dateRead && ['Finished', book.dateRead.replaceAll('/', '.')],
    book.isbn && ['ISBN', book.isbn],
  ].filter(Boolean)

  return (
    <Dialog labelId="book-detail-title" onClose={onClose} className="w-4xl">
      <div className="grid items-center gap-7 p-5 sm:p-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <BookPreview key={book.id} book={book} />
        <div className="min-w-0 px-2 pb-2">
          <h2 id="book-detail-title" className="font-serif text-4xl leading-[1.1] font-light text-balance wrap-anywhere">
            {book.title}
          </h2>
          <p className="label-caps mt-3 text-ink-soft">{book.author}</p>

          <div className="mt-6 flex flex-wrap items-start gap-x-8 gap-y-4">
            <div>
              <p className="label-caps text-ink-soft">My rating</p>
              <div className="mt-1.5">
                {book.myRating > 0 ? <Stars rating={book.myRating} label="My rating" /> : (
                  <p className="text-lg text-ink-soft italic">Not rated</p>
                )}
              </div>
            </div>
            {book.averageRating > 0 && (
              <div>
                <p className="label-caps text-ink-soft">Goodreads average</p>
                <p className="mt-1 text-xl">{book.averageRating.toFixed(2)}</p>
              </div>
            )}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-ink/10 pt-5">
            {facts.map(([term, value]) => (
              <div key={term}>
                <dt className="label-caps text-ink-soft">{term}</dt>
                <dd className="mt-1 font-serif text-lg leading-snug wrap-anywhere">{value}</dd>
              </div>
            ))}
          </dl>

          {book.shelves.length > 0 && (
            <ul aria-label="Shelves" className="mt-4 flex flex-wrap gap-2">
              {book.shelves.map((shelf) => (
                <li key={shelf} className="label-caps rounded-full border border-ink/15 px-3 py-1.5 text-ink-soft">
                  {prettifyShelf(shelf)}
                </li>
              ))}
            </ul>
          )}

          {book.notes && <p className="mt-5 border-t border-ink/10 pt-4 text-lg wrap-anywhere whitespace-pre-wrap">{book.notes}</p>}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="label-caps mt-5 cursor-pointer rounded-full border border-ink/25 px-4 py-2 hover:border-ink"
            >
              Edit book
            </button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
