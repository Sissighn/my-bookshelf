export default function FilterChips({ filters, activeId, onChange }) {
  return (
    <nav
      aria-label="Filter by shelf"
      className="shelf-scroll mt-8 flex snap-x gap-3 overflow-x-auto px-6
                 pb-1 md:flex-wrap md:justify-center md:overflow-visible"
    >
      {filters.map((filter) => {
        const isActive = filter.id === activeId
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onChange(filter.id)}
            aria-pressed={isActive}
            title={`${filter.count} ${filter.count === 1 ? 'book' : 'books'}`}
            className={`label-caps shrink-0 snap-start cursor-pointer rounded-full border
                        px-5 py-2.5 whitespace-nowrap transition-colors duration-200
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-ink
                        focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
                          isActive
                            ? 'border-ink bg-ink text-paper'
                            : 'border-ink/18 text-ink-soft hover:border-ink/45 hover:text-ink'
                        }`}
          >
            {filter.label}
          </button>
        )
      })}
    </nav>
  )
}
