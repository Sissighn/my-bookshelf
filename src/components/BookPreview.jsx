import { useEffect, useState } from 'react'
import { spineColor, spineSize } from '../lib/spine'
import useBookCover from '../lib/useBookCover'

export default function BookPreview({ book }) {
  const cover = useBookCover(book, 'L')
  const color = spineColor(book.title + book.author)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 360)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-w-0 text-center">
      <div className="book-stage" aria-hidden="true">
        <div
          className="book-solid"
          data-open={open}
          style={{
            '--book-depth': `${Math.round(spineSize(book).width * 0.7)}px`,
            '--jacket': color.base,
            '--jacket-dark': color.shade,
            '--jacket-light': color.tint,
            '--jacket-ink': color.ink,
          }}
        >
          <div className="book-back" />
          <div className="book-page-edge book-fore-edge" />
          <div className="book-page-edge book-top-edge" />
          <div className="book-page-edge book-bottom-edge" />
          <div className="book-binding"><span>{book.title}</span></div>
          <div className="book-title-page">
            <span>{book.author}</span>
            <strong>{book.title}</strong>
            {book.year && <span>{book.year}</span>}
          </div>
          <div className="book-front">
            <div className="book-jacket">
              {cover ? <img src={cover} alt="" /> : (
                <>
                  <strong>{book.title}</strong>
                  <span>{book.author}</span>
                </>
              )}
            </div>
            <div className="book-endpaper" />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="label-caps cursor-pointer rounded-full border border-ink/20 px-4 py-2 text-ink-soft hover:border-ink hover:text-ink"
      >
        {open ? 'Close cover' : 'Open cover'}
      </button>
    </div>
  )
}
