import BookSpine from './BookSpine'

const ROW_HEIGHT = 288

export const BOARD_HEIGHT = 11

const BOARD = `
  repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(var(--row-h) - 11px),
    #efe8d9 calc(var(--row-h) - 11px),
    #e2d9c6 calc(var(--row-h) - 9px),
    #d3c8b1 calc(var(--row-h) - 5px),
    #bcaf94 calc(var(--row-h) - 3px),
    #a1937a calc(var(--row-h) - 2px),
    rgba(28,26,23,0.13) calc(var(--row-h) - 1px),
    rgba(28,26,23,0.04) calc(var(--row-h) - 0.5px),
    transparent var(--row-h)
  )
`

export default function Shelf({ books, onSelect }) {
  if (!books.length) return <EmptyShelf />

  return (
    <div className="pt-6 md:pt-24">
      <div
        style={{ '--row-h': `${ROW_HEIGHT}px`, backgroundImage: BOARD }}
        className="shelf-scroll flex flex-nowrap items-end gap-px overflow-x-auto
                   overflow-y-hidden px-6 md:flex-wrap md:overflow-visible md:px-10"
      >
        {books.map((book, index) => (
          <BookSpine
            key={book.id}
            book={book}
            index={index}
            rowHeight={ROW_HEIGHT}
            boardHeight={BOARD_HEIGHT}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function EmptyShelf() {
  return (
    <div className="mx-6 border-t border-ink/10 py-20 text-center md:mx-10">
      <p className="font-serif text-2xl font-light text-ink-soft italic">
        Nothing on this shelf.
      </p>
      <p className="label-caps mt-3 text-ink-faint">Try another search or filter</p>
    </div>
  )
}
