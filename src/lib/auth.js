import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
const HTTPS_ORIGIN = /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?\/?$/i
export const desktop = import.meta.env.MODE === 'mac' ? window.bookshelfDesktop : undefined
export const authConfigured = window.isSecureContext && Boolean(HTTPS_ORIGIN.test(url ?? '') && key?.startsWith('sb_publishable_'))
export const localDevelopment = import.meta.env.DEV && !url && !key

const installedApp = desktop || navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
const authStorage = installedApp ? window.localStorage : window.sessionStorage
const installedStorageKey = 'my-bookshelf:installed-auth'

function tabStorageKey() {
  const key = 'my-bookshelf:auth-tab'
  const id = sessionStorage.getItem(key) ?? crypto.randomUUID()
  sessionStorage.setItem(key, id)
  return `my-bookshelf:auth:${id}`
}

export const supabase = authConfigured
  ? createClient(url, key, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
      storage: desktop?.authStorage ?? authStorage,
      storageKey: installedApp ? installedStorageKey : tabStorageKey(),
    },
  })
  : null

const recoveryKey = 'my-bookshelf:pending-password-reset'
const recoveryPending = 'pending'
let authCallback
let confirmationClient

export function callbackUrl() {
  // Desktop email uses the Supabase Site URL so password-reset links stay on HTTPS.
  if (!desktop) return new URL(import.meta.env.BASE_URL, window.location.origin).href
}

export async function signInWithGoogle() {
  const redirectTo = desktop ? await desktop.prepareGoogleSignIn() : callbackUrl()
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: Boolean(desktop),
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) throw error
    if (!desktop) return
    const code = await desktop.signInWithGoogle(data.url)
    const result = await supabase.auth.exchangeCodeForSession(code)
    if (result.error) throw result.error
  } finally {
    if (desktop) await desktop.cancelGoogleSignIn(redirectTo).catch(() => {})
  }
}

export function hasRecoverySession(session) {
  if (!session) return false
  const recovery = authStorage.getItem(recoveryKey)
  return recovery === recoveryPending || recovery === session.user.id
}

export function clearRecovery() {
  authStorage.removeItem(recoveryKey)
}

async function processAuthCallback() {
  const current = new URL(window.location.href)
  const fragment = new URLSearchParams(current.hash.slice(1))
  const code = current.searchParams.get('code')
  const action = current.searchParams.get('auth_action')
  const token = fragment.get('token_hash')
  const failed = current.searchParams.has('error') || fragment.has('error')
  if (!code && !action && !failed) return {}

  // Remove single-use credentials before rendering or making external requests.
  current.searchParams.delete('code')
  current.searchParams.delete('auth_action')
  current.searchParams.delete('error')
  current.searchParams.delete('error_code')
  current.searchParams.delete('error_description')
  current.hash = ''
  history.replaceState(history.state, '', current)

  if (failed) return { notice: 'That link could not be completed. Please try again.' }
  if (code && !action) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    return error ? { notice: 'That sign-in link expired or was opened in a different tab. Please try again.' } : {}
  }
  const type = action === 'confirm' ? 'email' : action === 'recover' ? 'recovery' : null
  if (!type || !token || code) return { notice: 'That email link is invalid. Please request a new one.' }
  return { emailLink: { type, token } }
}

export async function verifyEmailLink({ type, token }) {
  if (type === 'recovery') {
    // Block shelf access even if the app closes before verifyOtp finishes saving the session.
    const previous = authStorage.getItem(recoveryKey)
    authStorage.setItem(recoveryKey, recoveryPending)
    let data
    try {
      const result = await supabase.auth.verifyOtp({ type, token_hash: token })
      if (result.error || !result.data.session) throw new Error('Email link verification failed')
      data = result.data
    } catch (error) {
      if (previous === null) clearRecovery()
      else authStorage.setItem(recoveryKey, previous)
      throw error
    }
    authStorage.setItem(recoveryKey, data.session.user.id)
    return { session: data.session }
  }

  // Verification proves the address. Access to the shelf still starts at sign-in.
  confirmationClient ??= createClient(url, key, { auth: {
    persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
    storageKey: 'my-bookshelf:email-confirmation',
  } })
  const { data, error } = await confirmationClient.auth.verifyOtp({ type, token_hash: token })
  if (error || !data.session) throw new Error('Email link verification failed')
  await confirmationClient.auth.signOut({ scope: 'local' })
  const current = await supabase.auth.getSession()
  return { session: current.data.session, notice: 'Email verified. You can sign in now.' }
}

export async function initializeAuth() {
  const callback = await (authCallback ??= processAuthCallback())
  const { data, error } = await supabase.auth.getSession()
  if (!error && !data.session) clearRecovery()
  return {
    session: error ? null : data.session,
    ...callback,
    notice: callback.notice ?? (error ? 'Your session expired. Please sign in again.' : null),
  }
}
