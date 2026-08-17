# My Bookshelf

A virtual bookshelf for your Goodreads library. Your books stand as spines on a
shelf, in the colours of their real covers — searchable, filterable by shelf,
and clickable for details.

Everything runs in the browser. There is no backend, no account, and your export
never leaves your machine.

## Setup

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build
npm run lint      # oxlint
```

## Getting your Goodreads CSV

Goodreads shut its public API down in December 2020 — no new keys are issued and
there is no live sync. A CSV export is the only way to get your library out, so
that is what this app reads.

1. Go to [goodreads.com/review/import](https://www.goodreads.com/review/import)
   (or **My Books → Tools → Import/Export** in the left sidebar).
2. Click **Export Library**.
3. Wait a moment — a link like `goodreads_library_export.csv` appears at the top
   of the page. Download it.
4. In the app, click **Import Goodreads CSV**, or just drag the file anywhere
   onto the page.

Until you import something, the shelf shows a small sample library so there is
something to look at.

### Columns it reads

`Title`, `Author`, `ISBN`, `ISBN13`, `My Rating`, `Average Rating`,
`Exclusive Shelf`, `Bookshelves`, `Number of Pages`, `Binding`,
`Original Publication Year` / `Year Published`, `Date Read`.

Goodreads writes ISBNs as spreadsheet escapes (`="0439023483"`); the parser
unwraps them. Rows without a title are skipped, and a file with no `Title`
column is rejected with a message rather than a blank shelf.

## How it works

**Covers** come from the [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers)
by ISBN — no key required:

```
https://covers.openlibrary.org/b/isbn/{ISBN}-M.jpg
```

Open Library redirects these into an archive.org zip, so a cover that nobody has
requested recently can take ten seconds to arrive, and asking for a hundred at
once gets connections reset. Two things follow from that:

- Requests go through a small queue (`src/lib/coverQueue.js`) that keeps a dozen
  in flight at a time. A large library fills in progressively rather than all at
  once, and it is fast on later visits once the browser has cached them.
- A spine never waits on its cover. It draws immediately in a colour derived
  from its title, and the artwork cross-fades over it if and when it loads.

**Spines carry no lettering.** A cover-backed spine is a sharp, unfiltered crop
of the artwork and nothing else; the title lives in the hover card and the
detail overlay. That is what lets the crop stay unblurred — with no stamped
title of our own, the cover's own typography has nothing to collide with. The
button keeps an `aria-label`, so a screen reader still gets the title.

**Spines without a cover** are the exception, and they *do* carry their title —
otherwise they would be blank coloured rectangles with nothing to tell them
apart. They are drawn instead: a cloth colour, a lit head and tail, the title
stamped vertically. Colour, width and height all come from a hash of the title,
so they are random-looking but identical on every reload. Width also follows the
real page count when the export has one, so a 700-page novel is visibly fatter
than a novella.

**The only overlay** on a cover is a pair of dark seams down the left and right
edges, reading as the curve where one spine meets the next. The middle is left
completely alone.

**Shelf rows** are pure CSS. Every spine sits bottom-aligned in a fixed-height
band, and one repeating gradient paints a plank under each wrapped row — so
nothing has to measure the container or chunk books into rows in JavaScript.

## Storage

The last import is kept in `localStorage` so a reload does not send you back to
the sample shelf. **Clear** next to the import button forgets it. If the export
is too large for the quota the shelf still works for that session, it just will
not survive a reload.

## Project layout

```
src/
  App.jsx                  state, filtering, file + drag-and-drop import
  components/
    Header.jsx             title, volume count, import controls
    SearchBar.jsx          title/author search
    FilterChips.jsx        All + exclusive shelves + your own shelves
    Shelf.jsx              wrapping rows and the CSS shelf boards
    BookSpine.jsx          one spine: cover, fallback, hover card
    BookDetail.jsx         the detail overlay
    Stars.jsx              rating stars
  lib/
    goodreads.js           CSV parsing, normalizing, filters
    spine.js               deterministic colour and size, cover URLs
    coverQueue.js          concurrency gate for cover requests
    storage.js             localStorage
  data/sampleBooks.js      the shelf you see before importing
```

## Notes

- Filter chips are built from your own `Bookshelves` values, sorted by how many
  books each holds, after the three shelves Goodreads guarantees
  (currently-reading, read, to-read).
- On phones the shelf scrolls sideways and the hover cards are suppressed —
  tapping a spine opens the full detail overlay instead.
- The overlay closes on **Esc**, on a backdrop click, or via the close button.
- `prefers-reduced-motion` disables the lifts and cross-fades.

## Tech

Vite · React · Tailwind CSS v4 · PapaParse
