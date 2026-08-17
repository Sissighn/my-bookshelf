export default function Header({ count, onImportClick, fileName, onReset }) {
  return (
    <header className="px-6 pt-16 pb-10 text-center md:pt-24">
      <p className="label-caps text-ink-faint">A Personal Archive</p>

      <h1 className="mt-5 font-serif text-5xl leading-none font-light italic md:text-7xl">
        Welcome to my library
        <span
          aria-hidden="true"
          className="ml-1 inline-block w-[2px] self-stretch align-middle"
          style={{
            height: '0.8em',
            background: 'currentColor',
            animation: 'caret 1.1s step-end infinite',
          }}
        />
      </h1>

      <p className="label-caps mt-6 text-ink-soft">
        {count} {count === 1 ? 'Volume' : 'Volumes'}
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onImportClick}
          className="label-caps cursor-pointer rounded-full border border-ink/20 px-6 py-3
                     text-ink-soft transition-colors duration-200 hover:border-ink/50
                     hover:text-ink focus:outline-none focus-visible:ring-2
                     focus-visible:ring-ink focus-visible:ring-offset-2
                     focus-visible:ring-offset-paper"
        >
          Import Goodreads CSV
        </button>

        {fileName && (
          <button
            type="button"
            onClick={onReset}
            title={`Loaded from ${fileName}`}
            className="label-caps cursor-pointer text-ink-faint underline
                       decoration-ink-faint/40 underline-offset-4 transition-colors
                       duration-200 hover:text-ink-soft focus:outline-none
                       focus-visible:ring-2 focus-visible:ring-ink"
          >
            Clear
          </button>
        )}
      </div>
    </header>
  )
}
