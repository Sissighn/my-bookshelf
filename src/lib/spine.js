function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function slice(h, shift) {
  return ((h >>> shift) & 0xff) / 255
}

const HUE_ANCHORS = [8, 22, 38, 96, 152, 188, 214, 246, 292, 330]

export function spineColor(seedText) {
  const h = hash(seedText)
  const hue = HUE_ANCHORS[h % HUE_ANCHORS.length] + Math.round(slice(h, 8) * 12 - 6)
  const saturation = 16 + slice(h, 16) * 26
  const lightness = 24 + slice(h, 24) * 34
  return {
    hue,
    saturation,
    lightness,
    base: `hsl(${hue} ${saturation}% ${lightness}%)`,
    shade: `hsl(${hue} ${saturation}% ${Math.max(8, lightness - 14)}%)`,
    tint: `hsl(${hue} ${saturation}% ${Math.min(88, lightness + 12)}%)`,
    ink: lightness > 46 ? `hsl(${hue} 30% 12%)` : `hsl(${hue} 24% 92%)`,
  }
}

const SPINE_MIN_W = 26
const SPINE_MAX_W = 62
const SPINE_MIN_H = 190
const SPINE_MAX_H = 268

export function spineSize(book) {
  const h = hash(book.title + book.author)
  const byHash = slice(h, 4)
  const byPages =
    book.pages > 0 ? Math.min(1, Math.max(0, (book.pages - 120) / 700)) : null
  const widthT = byPages === null ? byHash : byPages * 0.75 + byHash * 0.25

  return {
    width: Math.round(SPINE_MIN_W + widthT * (SPINE_MAX_W - SPINE_MIN_W)),
    height: Math.round(SPINE_MIN_H + slice(h, 12) * (SPINE_MAX_H - SPINE_MIN_H)),
    tilt: (slice(h, 20) - 0.5) * 1.6,
  }
}

export function coverUrl(isbn, size = 'L') {
  if (!isbn) return null
  return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg?default=false`
}

export function truncate(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}
