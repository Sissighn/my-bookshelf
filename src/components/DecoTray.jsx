import { useState } from 'react'
import { decoCatalog, decorationAppearance, prepareDecorationImage } from '../lib/decorations'
import Dialog from './Dialog'

const control = 'label-caps cursor-pointer rounded-full border border-ink/25 px-4 py-2.5 hover:border-ink focus-visible:outline focus-visible:outline-offset-2'
const categories = ['All', 'Lamps', 'Candles', 'Figurines', 'Objects']
const pageSize = 6

function DecorationChoice({ item, active, onPick, onDrag, touch }) {
  const { label, src } = decorationAppearance(item)
  return (
    <button
      type="button"
      draggable
      aria-pressed={active}
      {...touch({ decoration: item })}
      onClick={() => onPick(active ? null : item)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'copy'
        event.dataTransfer.setData('text/plain', label)
        onDrag(item)
      }}
      onDragEnd={() => onDrag(null)}
      className="flex h-25 min-w-0 cursor-grab touch-none flex-col items-center justify-end gap-1 rounded-md border border-transparent
                 px-2 py-2 hover:bg-paper-dim focus-visible:outline aria-pressed:border-ink/35 aria-pressed:bg-paper-dim"
    >
      <img src={src} alt="" draggable={false} decoding="async" className="min-h-0 w-full flex-1 object-contain object-bottom" />
      <span className="text-sm font-semibold leading-tight text-ink">{label}</span>
    </button>
  )
}

export default function DecoTray({ pending, onPick, onDrag, onPlaceAtEnd, touch }) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [custom, setCustom] = useState(null)
  const [category, setCategory] = useState('All')
  const [page, setPage] = useState(0)
  const choices = Object.entries(decoCatalog)
    .filter(([, preset]) => category === 'All' || preset.category === category.toLowerCase())
    .map(([type]) => ({ type }))
  if (custom && category === 'All') choices.unshift(custom)
  const pages = Math.ceil(choices.length / pageSize)
  const visible = choices.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <section id="deco-tray" aria-label="Shelf decorations" className="mx-auto mb-4 max-w-2xl rounded-lg border border-ink/12 bg-field px-3 pt-2 pb-3">
      <div role="group" aria-label="Decoration category" className="flex flex-wrap justify-center gap-1 border-b border-ink/10 pb-2">
        {categories.map((name) => (
          <button key={name} type="button" aria-pressed={category === name} onClick={() => {
            setCategory(name)
            setPage(0)
          }} className="label-caps min-h-9 cursor-pointer rounded-full px-2 tracking-wider text-ink-soft hover:bg-paper-dim aria-pressed:bg-paper-dim aria-pressed:text-ink">
            {name}
          </button>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1 sm:grid-cols-6">
        {visible.map((item) => (
          <DecorationChoice key={item.type} item={item} active={pending?.type === item.type} onPick={onPick} onDrag={onDrag} touch={touch} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 border-t border-ink/10 pt-2">
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous decorations" disabled={page === 0}
              onClick={() => setPage(page - 1)} className="h-9 w-9 cursor-pointer rounded-full hover:bg-paper-dim disabled:opacity-35">‹</button>
            <span aria-live="polite" className="label-caps text-ink-soft">{page + 1} / {pages}</span>
            <button type="button" aria-label="Next decorations" disabled={page + 1 === pages}
              onClick={() => setPage(page + 1)} className="h-9 w-9 cursor-pointer rounded-full hover:bg-paper-dim disabled:opacity-35">›</button>
          </div>
        )}
        <button type="button" onClick={() => setUploadOpen(true)} className={control}>Upload deco</button>
        {pending && <button type="button" onClick={onPlaceAtEnd} className={`${control} bg-ink text-paper`}>Place at end</button>}
      </div>
      {pending && <p className="mt-2 text-base text-ink-soft">Tap a shelf item to place it before that item.</p>}
      {uploadOpen && (
        <UploadDeco onClose={() => setUploadOpen(false)} onUpload={(item) => {
          setCustom(item)
          setCategory('All')
          setPage(0)
          onPick(item)
          setUploadOpen(false)
        }} />
      )}
    </section>
  )
}

function UploadDeco({ onClose, onUpload }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const label = fields.get('label').trim()
    const file = fields.get('image')
    if (!label || !file.size) {
      setError('Enter a name and choose an image.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const image = await prepareDecorationImage(file)
      onUpload({ type: 'custom', label, size: fields.get('size'), image })
    } catch (error) {
      setError(error.name === 'EncodingError' ? 'Could not open this image.' : error.message)
      setBusy(false)
    }
  }

  return (
    <Dialog labelId="upload-deco-title" onClose={() => { if (!busy) onClose() }} className="w-md p-6 text-left sm:p-8">
      <h2 id="upload-deco-title" className="mb-4 text-3xl font-semibold">Upload deco</h2>
      <form onSubmit={submit} className="grid gap-4 text-lg">
        <label className="grid gap-1">Name
          <input name="label" maxLength={80} required className="rounded-sm border border-ink/20 bg-field px-3 py-2" />
        </label>
        <label className="grid gap-1">Image with a transparent background
          <input name="image" type="file" accept="image/png,image/webp" required className="w-full text-base" />
        </label>
        <label className="grid gap-1">Shelf size
          <select name="size" defaultValue="medium" className="rounded-sm border border-ink/20 bg-field px-3 py-2">
            <option value="small">Small · candle height</option>
            <option value="medium">Medium · book height</option>
            <option value="large">Large · lamp height</option>
          </select>
        </label>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <button type="submit" disabled={busy} className={`${control} justify-self-start bg-ink text-paper disabled:opacity-50`}>
          {busy ? 'Preparing image…' : 'Choose placement'}
        </button>
      </form>
    </Dialog>
  )
}
