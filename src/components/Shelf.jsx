import { useState } from 'react'
import BookSpine from './BookSpine'
import ShelfDecoration from './ShelfDecoration'
import { decorationAppearance } from '../lib/decorations'

const ROW_HEIGHT = 288

const BOARD = `
  repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(var(--row-h) - var(--board-h)),
    var(--board-top, #efe8d9) calc(var(--row-h) - var(--board-h)),
    var(--board-rim, #e2d9c6) calc(var(--row-h) - 9px * var(--shelf-scale)),
    var(--board-face, #d3c8b1) calc(var(--row-h) - 5px * var(--shelf-scale)),
    var(--board-lip, #bcaf94) calc(var(--row-h) - 3px * var(--shelf-scale)),
    var(--board-base, #a1937a) calc(var(--row-h) - 2px * var(--shelf-scale)),
    var(--board-shadow, #1c1a1721) calc(var(--row-h) - 1px * var(--shelf-scale)),
    var(--board-shadow-edge, #1c1a170a) calc(var(--row-h) - 0.5px * var(--shelf-scale)),
    transparent var(--row-h)
  )
`

export default function Shelf({ items, onSelect, movingId, onMove, draggedDeco, onDropDeco, placementOpen, touch }) {
  const [draggedId, setDraggedId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  function endDrag() {
    setDraggedId(null)
    setDropTarget(null)
  }

  function dropSide(event) {
    const box = event.currentTarget.getBoundingClientRect()
    return event.clientX < box.left + box.width / 2 ? 'before' : 'after'
  }

  const rowHeight = items.some(({ decoration }) => decoration && decorationAppearance(decoration).height > 268)
    ? 334
    : ROW_HEIGHT

  if (!items.length && !placementOpen) return <EmptyShelf />

  return (
    <div className={onMove ? 'pt-2 md:pt-6' : 'pt-2 md:pt-24'}>
      <div
        style={{ '--base-row-h': `${rowHeight}px`, backgroundImage: BOARD }}
        className="shelf-rows flex flex-wrap items-end gap-x-px px-3 md:px-10"
      >
        {items.map((item, index) => {
          const { id, book, decoration } = item
          const drag = onMove && {
            onDragStart: (event) => {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', book?.title ?? decorationAppearance(decoration).label)
              setDraggedId(id)
            },
            onDragEnd: endDrag,
            onDragOver: (event) => {
              if ((!draggedId && !draggedDeco) || draggedId === id) return
              event.preventDefault()
              event.dataTransfer.dropEffect = draggedDeco ? 'copy' : 'move'
              const side = dropSide(event)
              if (dropTarget?.id !== id || dropTarget.side !== side) setDropTarget({ id, side })
            },
            onDragLeave: (event) => {
              if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                setDropTarget((target) => target?.id === id ? null : target)
              }
            },
            onDrop: (event) => {
              if (!draggedId && !draggedDeco) return
              event.preventDefault()
              if (draggedDeco) onDropDeco(draggedDeco, id, dropSide(event))
              else onMove(draggedId, id, dropSide(event))
              endDrag()
            },
          }

          const props = {
            onSelect: () => onSelect(item),
            drag,
            moving: movingId === id,
            dropSide: touch.drag?.target?.id === id
              ? touch.drag.target.side
              : (draggedId || draggedDeco) && dropTarget?.id === id ? dropTarget.side : null,
          }

          return book
            ? <BookSpine key={id} book={book} index={index} {...props} />
            : <ShelfDecoration key={id} decoration={decoration} touch={onMove && touch.bind({ id, decoration })} {...props} />
        })}
        {placementOpen && (
          <div
            data-shelf-end
            className={`shelf-cell flex shrink-0 items-end ${items.length ? 'w-16 md:w-19' : 'w-full justify-center'}`}
            onDragOver={(event) => {
              if (!draggedDeco && !draggedId) return
              event.preventDefault()
              event.dataTransfer.dropEffect = draggedDeco ? 'copy' : 'move'
            }}
            onDrop={(event) => {
              if (!draggedDeco && !draggedId) return
              event.preventDefault()
              if (draggedDeco) onDropDeco(draggedDeco)
              else onMove(draggedId, items.at(-1)?.id, 'after')
              endDrag()
            }}
          >
            <span className={`label-caps mb-2 rounded-sm border border-dashed px-2 py-4
              ${draggedDeco || draggedId || touch.drag?.target?.id === null ? 'border-ink/45 bg-paper-dim text-ink' : 'border-ink/15 text-ink-soft'}`}>
              Drop at end
            </span>
          </div>
        )}
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
