import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import FilterChips from './components/FilterChips'
import Shelf from './components/Shelf'
import BookDetail from './components/BookDetail'
import { buildFilters, filterBooks, parseGoodreadsCsv } from './lib/goodreads'
import { clearLibrary, loadLibrary, saveLibrary } from './lib/storage'
import { sampleBooks } from './data/sampleBooks'

export default function App() {
  const saved = useRef(loadLibrary()).current

  const [books, setBooks] = useState(() => saved?.books ?? sampleBooks)
  const [fileName, setFileName] = useState(saved?.fileName ?? null)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const inputRef = useRef(null)
  const isSample = fileName === null

  const filters = useMemo(() => buildFilters(books), [books])

  useEffect(() => {
    if (!filters.some((f) => f.id === activeFilter)) setActiveFilter('all')
  }, [filters, activeFilter])

  const visible = useMemo(() => {
    const filter = filters.find((f) => f.id === activeFilter)
    return filterBooks(books, { query, filter })
  }, [books, query, activeFilter, filters])

  const importFile = useCallback(async (file) => {
    if (!file) return
    setError(null)
    try {
      const { books: parsed } = await parseGoodreadsCsv(file)
      setBooks(parsed)
      setFileName(file.name)
      setQuery('')
      setActiveFilter('all')
      saveLibrary(parsed, file.name)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const handleReset = useCallback(() => {
    clearLibrary()
    setBooks(sampleBooks)
    setFileName(null)
    setQuery('')
    setActiveFilter('all')
    setError(null)
  }, [])

  useEffect(() => {
    const over = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault()
        setIsDragging(true)
      }
    }
    const leave = (e) => {
      if (!e.relatedTarget) setIsDragging(false)
    }
    const drop = (e) => {
      e.preventDefault()
      setIsDragging(false)
      importFile(e.dataTransfer?.files?.[0])
    }
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [importFile])

  return (
    <div className="min-h-full pb-24">
      <Header
        count={books.length}
        fileName={fileName}
        onImportClick={() => inputRef.current?.click()}
        onReset={handleReset}
      />

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => {
          importFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {error && (
        <p
          role="alert"
          className="mx-auto mb-6 max-w-md px-6 text-center font-serif text-lg text-red-900/80 italic"
        >
          {error}
        </p>
      )}

      {isSample && !error && (
        <p className="mx-auto -mt-3 mb-2 max-w-xl px-6 text-center font-serif text-base text-ink-faint italic">
          Showing a sample shelf — import your Goodreads export to see your own.
        </p>
      )}

      <SearchBar value={query} onChange={setQuery} />
      <FilterChips filters={filters} activeId={activeFilter} onChange={setActiveFilter} />

      <p className="label-caps mt-8 px-6 text-center text-ink-faint">
        {visible.length === books.length
          ? `${books.length} shown`
          : `${visible.length} of ${books.length} shown`}
      </p>

      <main className="mt-2">
        <Shelf books={visible} onSelect={setSelected} />
      </main>

      {selected && <BookDetail book={selected} onClose={() => setSelected(null)} />}

      {isDragging && (
        <div className="animate-fade-in pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-paper/85 backdrop-blur-sm">
          <div className="border border-dashed border-ink/30 px-16 py-12 text-center">
            <p className="font-serif text-3xl font-light italic">Drop your export</p>
            <p className="label-caps mt-3 text-ink-faint">goodreads_library_export.csv</p>
          </div>
        </div>
      )}
    </div>
  )
}
