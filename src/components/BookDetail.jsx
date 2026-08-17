import { useEffect, useRef, useState } from 'react'
import { coverUrl, spineColor } from '../lib/spine'
import { prettifyShelf } from '../lib/goodreads'
import Stars from './Stars'

export default function BookDetail({ book, onClose }) {
  const closeRef = useRef(null)
  const [coverFailed, setCoverFailed] = useState(false)

  useEffect(() => setCoverFailed(false), [book.id])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const src = coverUrl(book.isbn, 'L')
  const hasCover = Boolean(src) && !coverFailed
  const color = spineColor(book.title + book.author)

  const facts = [
    ['Shelf', prettifyShelf(book.exclusiveShelf)],
    book.year && ['Published', book.year],
    book.pages > 0 && ['Pages', String(book.pages)],
    book.binding && ['Format', book.binding],
    book.dateRead && ['Finished', book.dateRead.replaceAll('/', '.')],
    book.isbn && ['ISBN', book.isbn],
  ].filter(Boolean)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-detail-title"
      onClick={onClose}
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center
                 overflow-y-auto bg-ink/35 p-4 backdrop-blur-[3px] sm:items-center sm:p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-rise-in relative my-auto w-full max-w-3xl bg-paper
                   shadow-[0_40px_80px_-32px_rgba(28,26,23,0.55)]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 cursor-pointer p-2 text-ink-faint
                     transition-colors duration-200 hover:text-ink focus:outline-none
                     focus-visible:ring-2 focus-visible:ring-ink"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M1 1l14 14M15 1L1 15"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
        </button>

        <div className="grid gap-10 p-8 sm:grid-cols-[minmax(0,200px)_1fr] sm:p-12">
          <div className="mx-auto w-full max-w-[200px] sm:mx-0">
            <div
              className="aspect-[2/3] w-full overflow-hidden
                         shadow-[0_2px_4px_rgba(28,26,23,0.2),0_24px_40px_-20px_rgba(28,26,23,0.5)]"
              style={{ backgroundColor: color.base }}
            >
              {hasCover ? (
                <img
                  src={src}
                  alt={`Cover of ${book.title}`}
                  onError={() => setCoverFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <DrawnCover book={book} color={color} />
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h2
              id="book-detail-title"
              className="font-serif text-4xl leading-[1.1] font-light text-balance"
            >
              {book.title}
            </h2>
            <p className="label-caps mt-4 text-ink-soft">{book.author}</p>

            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <div>
                <p className="label-caps text-ink-faint">My Rating</p>
                <div className="mt-2">
                  {book.myRating > 0 ? (
                    <Stars rating={book.myRating} label="My rating" />
                  ) : (
                    <p className="font-serif text-lg text-ink-faint italic">
                      Not rated
                    </p>
                  )}
                </div>
              </div>

              {book.averageRating > 0 && (
                <div>
                  <p className="label-caps text-ink-faint">Goodreads Average</p>
                  <p className="mt-1.5 font-serif text-2xl font-light">
                    {book.averageRating.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <dl className="mt-9 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-ink/10 pt-7">
              {facts.map(([term, value]) => (
                <div key={term}>
                  <dt className="label-caps text-ink-faint">{term}</dt>
                  <dd className="mt-1.5 font-serif text-lg leading-snug">{value}</dd>
                </div>
              ))}
            </dl>

            {book.shelves.length > 0 && (
              <div className="mt-8 border-t border-ink/10 pt-7">
                <p className="label-caps text-ink-faint">Shelves</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {book.shelves.map((shelf) => (
                    <li
                      key={shelf}
                      className="label-caps rounded-full border border-ink/15 px-3.5 py-1.5 text-ink-soft"
                    >
                      {prettifyShelf(shelf)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DrawnCover({ book, color }) {
  return (
    <div
      className="flex h-full w-full flex-col justify-between p-6 text-center"
      style={{
        color: color.ink,
        background: `linear-gradient(160deg, ${color.tint} 0%, ${color.base} 40%, ${color.shade} 100%)`,
      }}
    >
      <span className="label-caps opacity-70">No cover found</span>
      <span className="font-serif text-2xl leading-tight text-balance">
        {book.title}
      </span>
      <span className="label-caps opacity-80">{book.author}</span>
    </div>
  )
}
