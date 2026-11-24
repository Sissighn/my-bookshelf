import { expect } from '@playwright/test'
import { books } from './library.js'

const authOrigin = 'https://bookshelf-test.invalid'
const userId = '00000000-0000-4000-8000-000000000001'
export const email = 'reader@example.test'
export const password = 'example-test-passphrase'

export async function mockAccount(context, { factor = false } = {}) {
  const verified = { id: 'authenticator-1', factor_type: 'totp', status: 'verified', friendly_name: 'Test authenticator' }
  const user = { id: userId, email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, factors: factor ? [verified] : [] }
  const server = { revision: 1, library: { books }, shelfReads: 0, failNextLoad: false, registrations: [], recoveryEmails: [], updatedPasswords: [], loggedOut: 0, redirects: [], exchanges: [] }

  function session(aal = 'aal1') {
    const jwt = { sub: userId, aal, exp: Math.floor(Date.now() / 1000) + 3600 }
    const encode = (data) => Buffer.from(JSON.stringify(data)).toString('base64url')
    return { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(jwt)}.c2ln`, refresh_token: 'example-refresh', expires_in: 3600, token_type: 'bearer', user }
  }

  await context.route(`${authOrigin}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || '*' }
    const respond = (json, status = 200) => route.fulfill({ status, headers, json })
    const body = () => request.postDataJSON()
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers })
    switch (url.pathname) {
      case '/auth/v1/token':
        if (url.searchParams.get('grant_type') === 'pkce') {
          server.exchanges.push(body())
          return respond(session())
        }
        if (body().password !== password) return respond({ code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400)
        return respond(session())
      case '/auth/v1/signup':
        server.registrations.push(body().email)
        return respond(user)
      case '/auth/v1/recover':
        server.recoveryEmails.push(body().email)
        return respond({})
      case '/auth/v1/verify':
        return respond(session())
      case '/auth/v1/user':
        if (method === 'PUT') server.updatedPasswords.push(body().password)
        return respond(user)
      case '/auth/v1/logout':
        server.loggedOut++
        return route.fulfill({ status: 204, headers })
      case '/auth/v1/authorize': {
        const callback = new URL(url.searchParams.get('redirect_to'))
        server.redirects.push(Object.fromEntries(url.searchParams))
        callback.searchParams.set('code', 'test-one-time-code')
        return route.fulfill({ status: 302, headers: { ...headers, Location: callback.href } })
      }
      case '/auth/v1/factors':
        return respond({ id: verified.id, type: 'totp', totp: { secret: 'TESTSETUPKEY', qr_code: '<svg xmlns="http://www.w3.org/2000/svg"/>' } })
      case '/auth/v1/factors/authenticator-1/challenge':
        return respond({ id: 'challenge-1', type: 'totp' })
      case '/auth/v1/factors/authenticator-1/verify':
        if (body().code !== '123456') return respond({ code: 'mfa_verification_failed', msg: 'Invalid code' }, 400)
        user.factors = [verified]
        return respond(session('aal2'))
      case '/auth/v1/factors/authenticator-1':
        user.factors = []
        return respond({ id: verified.id })
      case '/rest/v1/bookshelves':
        if (method === 'GET') {
          server.shelfReads++
          if (server.failNextLoad) {
            server.failNextLoad = false
            return respond({ message: 'Test shelf failed to load' }, 400)
          }
          return respond([{ revision: server.revision, library: server.library }])
        }
        if (method === 'PATCH') {
          if (url.searchParams.get('revision') !== `eq.${server.revision}`) return respond([])
          const { library, revision } = body()
          Object.assign(server, { library, revision })
          return respond([{ revision }])
        }
    }
    return respond({ message: 'Unexpected test API request' }, 400)
  })
  return server
}

export async function signInWithEmail(page, secret = password) {
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(secret)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}
