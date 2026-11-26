import { expect, test, vi } from 'vitest'
import { coverUrls, findCover } from '../../src/lib/bookCover.js'
import { catalogCoverUrl, searchCoverCatalog } from '../../src/lib/coverCatalog.js'
import { acquireCoverSlot } from '../../src/lib/coverQueue.js'
import { spineColor, spineSize, truncate } from '../../src/lib/spine.js'

test('generates ISBN edition fallbacks at the right sizes without duplicate or invalid URLs', () => {
  const url = (isbn, size) => `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg?default=false`
  expect(coverUrls('9780441478125', '0441478123', 'L')).toEqual([
    url('9780441478125', 'L'), url('9780441478125', 'M'), url('0441478123', 'L'), url('0441478123', 'M'),
  ])
  expect(coverUrls('0441478123', '', 'M')).toEqual([url('0441478123', 'M'), url('9780441478125', 'M')])
  expect(coverUrls('9780441478120', 'bad', 'M')).toEqual([url('9780441478120', 'M')])
  expect(coverUrls('', 'https://invalid.test', 'M')).toEqual([])
})

test('skips missing and placeholder images and returns the next usable cover', async () => {
  const tried = []
  class MockImage {
    set src(url) {
      tried.push(url)
      queueMicrotask(() => {
        if (url === 'missing') return this.onerror?.()
        this.naturalWidth = this.naturalHeight = url === 'placeholder' ? 1 : 300
        this.onload?.()
      })
    }
  }
  vi.stubGlobal('Image', MockImage)
  expect(await findCover(['missing', 'placeholder', 'usable', 'unused'], new AbortController().signal)).toBe('usable')
  expect(tried).toEqual(['missing', 'placeholder', 'usable'])
  expect(await findCover(['missing'], new AbortController().signal)).toBeNull()
})

test('aborts a pending image and stops trying later URLs', async () => {
  const removeAttribute = vi.fn()
  const start = vi.fn()
  vi.stubGlobal('Image', class {
    set src(value) { start(value) }
    removeAttribute(name) { removeAttribute(name) }
  })
  const controller = new AbortController()
  const cover = findCover(['slow', 'unused'], controller.signal)
  await Promise.resolve()
  controller.abort()
  await expect(cover).resolves.toBeNull()
  expect(start.mock.calls).toEqual([['slow']])
  expect(removeAttribute).toHaveBeenCalledWith('src')
  await expect(findCover(['unused'], controller.signal)).resolves.toBeNull()
})

test('queues a thirteenth cover and releases a slot after timeout', async () => {
  vi.useFakeTimers()
  const releases = await Promise.all(Array.from({ length: 12 }, acquireCoverSlot))
  try {
    const granted = vi.fn()
    const next = acquireCoverSlot().then(granted)
    await vi.advanceTimersByTimeAsync(19999)
    expect(granted).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await next
    expect(granted).toHaveBeenCalledOnce()
    granted.mock.calls[0][0]()
    granted.mock.calls[0][0]()
  } finally {
    releases.forEach((release) => release())
    vi.useRealTimers()
  }
})

test('escapes catalog search parameters, accepts only valid covers and propagates service failure', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ docs: [{ cover_i: 7 }, { cover_i: -2 }, { cover_i: '42' }, {}] }) })
    .mockResolvedValueOnce({ ok: false })
  vi.stubGlobal('fetch', fetch)
  const { signal } = new AbortController()
  await expect(searchCoverCatalog('A & B', 'Åsa', signal)).resolves.toEqual([{ cover_i: 7 }])
  const [url, options] = fetch.mock.calls[0]
  expect(new URL(url).searchParams.get('title')).toBe('A & B')
  expect(new URL(url).searchParams.get('author')).toBe('Åsa')
  expect(options.signal).toBe(signal)
  await expect(searchCoverCatalog('A & B', '', signal)).rejects.toThrow('Open Library is unavailable')
  expect(new URL(fetch.mock.calls[1][0]).searchParams.has('author')).toBe(false)
  expect(catalogCoverUrl(7)).toBe('https://covers.openlibrary.org/b/id/7-M.jpg?default=false')
})

test('keeps spine dimensions stable and thicker books visibly wider', () => {
  const book = { title: 'Piranesi', author: 'Susanna Clarke' }
  const small = spineSize({ ...book, pages: 80 })
  const large = spineSize({ ...book, pages: 1400 })
  expect(large.width).toBeGreaterThan(small.width)
  expect(large.height).toBe(small.height)
  expect(spineSize(book)).toEqual(spineSize(book))
  expect(spineColor(book.title)).toEqual(spineColor(book.title))
  expect(truncate('The book', 6)).toBe('The b…')
  expect(truncate('Short', 10)).toBe('Short')
})
