const { randomUUID } = require('node:crypto')
const { createServer } = require('node:http')

const loopback = '127.0.0.1'
const callbackTimeout = 180_000

function createGoogleSignIn(authOrigin, openBrowser, focusApp) {
  let pending

  function finish(attempt, code) {
    if (pending !== attempt) return
    pending = undefined
    clearTimeout(attempt.timer)
    attempt.server.close()
    attempt.complete?.(code)
  }

  async function prepare() {
    if (!authOrigin || pending) throw new Error('Could not start Google sign-in')
    const path = `/auth/callback/${randomUUID()}`
    const attempt = { server: createServer({ requestTimeout: 10_000, headersTimeout: 5_000 }) }
    pending = attempt

    attempt.server.on('request', (request, response) => {
      const callback = URL.parse(request.url, attempt.address)
      if (!attempt.complete || request.method !== 'GET' || request.headers.host !== attempt.address.host ||
          callback?.origin !== attempt.address.origin || callback.pathname !== path) {
        response.writeHead(404, { Connection: 'close' }).end()
        return
      }
      const codes = callback.searchParams.getAll('code')
      const valid = codes.length === 1 && /^[A-Za-z0-9_-]{1,512}$/.test(codes[0]) && !callback.searchParams.has('error')
      response.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        Connection: 'close',
      }).end(valid ? 'Return to My Bookshelf to finish signing in.' : 'Sign-in did not finish. Return to My Bookshelf to try again.')
      finish(attempt, valid ? codes[0] : undefined)
      focusApp()
    })

    try {
      await new Promise((resolve, reject) => {
        attempt.server.once('error', reject)
        attempt.server.listen(0, loopback, resolve)
      })
      if (pending !== attempt) throw new Error('Google sign-in was canceled')
      attempt.callback = `http://${loopback}:${attempt.server.address().port}${path}`
      attempt.address = new URL(attempt.callback)
      attempt.timer = setTimeout(() => finish(attempt), callbackTimeout)
      return attempt.callback
    } catch (error) {
      finish(attempt)
      throw error
    }
  }

  function signIn(value) {
    const attempt = pending
    if (!attempt?.callback || attempt.complete || typeof value !== 'string') throw new Error('Google sign-in was not started')
    const url = new URL(value)
    const params = url.searchParams
    const challenge = params.get('code_challenge')
    if (url.origin !== authOrigin || url.username || url.password || url.hash ||
        url.pathname !== '/auth/v1/authorize' || params.get('provider') !== 'google' ||
        params.get('redirect_to') !== attempt.callback || params.get('code_challenge_method') !== 's256' ||
        !/^[A-Za-z0-9_-]{43}$/.test(challenge ?? '')) throw new Error('Invalid Google sign-in URL')

    url.search = new URLSearchParams({
      provider: 'google', redirect_to: attempt.callback, prompt: 'select_account',
      code_challenge_method: 's256', code_challenge: challenge,
    })
    return new Promise((resolve, reject) => {
      attempt.complete = (code) => code ? resolve(code) : reject(new Error('Google sign-in was interrupted'))
      openBrowser(url.href).catch(() => finish(attempt))
    })
  }

  function cancel(callback) {
    if (pending && (callback === undefined || callback === pending.callback)) finish(pending)
  }

  return { prepare, signIn, cancel }
}

module.exports = { createGoogleSignIn }
