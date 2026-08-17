export default function SearchBar({ value, onChange }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6">
      <div className="relative border-b border-ink/15 transition-colors duration-300 focus-within:border-ink/45">
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What are you looking for?"
          aria-label="Search by title or author"
          className="w-full appearance-none bg-transparent py-4 pr-10 text-center
                     font-serif text-2xl font-light italic text-ink
                     placeholder:text-ink-faint focus:outline-none md:text-3xl
                     [&::-webkit-search-cancel-button]:appearance-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute top-1/2 right-0 -translate-y-1/2 cursor-pointer p-2
                       text-ink-faint transition-colors duration-200 hover:text-ink
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
