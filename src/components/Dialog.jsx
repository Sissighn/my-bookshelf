import { useLayoutEffect, useRef } from 'react'

export default function Dialog({ labelId, onClose, children, className = '' }) {
  const dialogRef = useRef(null)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}
      className={`animate-rise-in fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto
        border-0 bg-paper text-ink shadow-[0_40px_80px_-32px_rgba(28,26,23,0.55)]
        backdrop:bg-scrim backdrop:backdrop-blur-[3px] ${className}`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-3 right-4 z-10 cursor-pointer px-2 text-2xl leading-none text-ink-soft hover:text-ink"
      >
        ×
      </button>
      {children}
    </dialog>
  )
}
