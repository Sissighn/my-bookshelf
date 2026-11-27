import { acquireCoverSlot } from './coverQueue'

function otherIsbn(isbn) {
  if (/^978\d{10}$/.test(isbn)) {
    const digits = isbn.slice(3, -1)
    if (toIsbn13(digits) !== isbn) return ''

    const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * (10 - index), 0)
    const checkDigit = (11 - (sum % 11)) % 11
    return digits + (checkDigit === 10 ? 'X' : checkDigit)
  }

  if (/^\d{9}[0-9X]$/.test(isbn)) {
    const sum = [...isbn].reduce(
      (total, digit, index) => total + (digit === 'X' ? 10 : Number(digit)) * (10 - index),
      0,
    )
    if (sum % 11 === 0) return toIsbn13(isbn.slice(0, -1))
  }

  return ''
}

function toIsbn13(digits) {
  const prefix = '978' + digits
  const sum = [...prefix].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0)
  return prefix + ((10 - (sum % 10)) % 10)
}

export function coverUrls(isbn, alternateIsbn, size) {
  const isbns = [...new Set([isbn, alternateIsbn, otherIsbn(isbn), otherIsbn(alternateIsbn)])]
  const sizes = size === 'L' ? ['L', 'M'] : [size]
  return isbns.filter((value) => /^(?:\d{13}|\d{9}[0-9X])$/.test(value)).flatMap((value) =>
    sizes.map((imageSize) =>
      `https://covers.openlibrary.org/b/isbn/${value}-${imageSize}.jpg?default=false`,
    ),
  )
}

function loadImage(url, signal) {
  return new Promise((resolve) => {
    const image = new Image()
    const timer = setTimeout(abort, 20000)

    function settle(loaded) {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      image.onload = null
      image.onerror = null
      resolve(loaded)
    }

    function abort() {
      settle(false)
      image.removeAttribute('src')
    }

    signal.addEventListener('abort', abort, { once: true })
    image.onload = () => settle(image.naturalWidth > 1 && image.naturalHeight > 1)
    image.onerror = () => settle(false)
    image.src = url
  })
}

export async function findCover(urls, signal) {
  for (const url of urls) {
    if (signal.aborted) return null
    const release = await acquireCoverSlot()
    try {
      if (signal.aborted) return null
      if (await loadImage(url, signal)) return url
    } finally {
      release()
    }
  }
  return null
}
