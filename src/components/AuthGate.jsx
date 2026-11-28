import { useEffect, useMemo, useState } from 'react'
import App from '../App'
import { createAccountStorage } from '../lib/accountStorage'
import { authConfigured, clearRecovery, desktop, hasRecoverySession, initializeAuth, localDevelopment, supabase, verifyEmailLink } from '../lib/auth'
import AuthScreen, { AuthLayout, ResetPassword } from './AuthScreen'
import AccountSecurity, { VerifySecondFactor } from './AccountSecurity'

function SignedInShelf({ user }) {
  const storage = useMemo(() => createAccountStorage(user.id), [user.id])
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState(null)
  const [securityOpen, setSecurityOpen] = useState(false)

  async function signOut() {
    setSigningOut(true)
    setError(null)
    try {
      await storage.waitForSave()
    } catch {
      if (!window.confirm('Sign out and leave the unsaved changes? You can stay and download a backup.')) {
        setSigningOut(false)
        return
      }
    }

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
    } catch {
      setError('Could not sign out. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <>
      <div inert={signingOut}>
        <App storage={storage} accountControls={
          <div className="absolute top-1 left-3 text-left md:top-5 md:left-8">
            <button
              type="button"
              title={user.email}
              onClick={signOut}
              disabled={signingOut}
              className="label-caps min-h-9 cursor-pointer px-1.5 tracking-wider text-ink-soft hover:text-ink disabled:opacity-50 md:min-h-11 md:px-3 md:tracking-[0.22em]"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
            <button type="button" onClick={() => setSecurityOpen(true)}
              className="label-caps min-h-9 cursor-pointer px-1.5 tracking-wider text-ink-soft hover:text-ink md:min-h-11 md:px-3 md:tracking-[0.22em]">
              Security
            </button>
            {error && <p role="alert" className="max-w-xs bg-paper px-3 text-danger">{error}</p>}
          </div>
        } />
      </div>
      {securityOpen && <AccountSecurity onClose={() => setSecurityOpen(false)} />}
    </>
  )
}

function SessionProtection({ session, leaveRecovery }) {
  const [verification, setVerification] = useState({ ready: false })
  const [initialToken] = useState(session.access_token)

  useEffect(() => {
    let active = true
    async function check() {
      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(initialToken)
        if (error) throw error
        if (data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
          const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
          if (listError || !factors.totp[0]) throw listError ?? new Error('No supported verification method')
          if (active) setVerification({ ready: true, factors: factors.totp })
        } else if (active) {
          setVerification({ ready: true })
        }
      } catch {
        if (active) setVerification({ ready: true, failed: true })
      }
    }
    check()
    return () => { active = false }
  }, [initialToken])

  if (!verification.ready) return <AuthLayout><p role="status">Checking account security…</p></AuthLayout>
  if (verification.failed) {
    return <AuthLayout>
      <p role="alert" className="text-danger">Could not check your account security.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-3 cursor-pointer underline">Retry</button>
      <button type="button" onClick={() => leaveRecovery(false).catch(() => {
        setVerification({ ready: true, failed: true, signOutFailed: true })
      })} className="ml-4 cursor-pointer underline">Sign out</button>
      {verification.signOutFailed && <p role="alert" className="mt-2 text-danger">Could not sign out. Try again.</p>}
    </AuthLayout>
  }
  if (verification.factors) {
    return <VerifySecondFactor factors={verification.factors}
      onVerified={() => setVerification({ ready: true })}
      onSignOut={() => leaveRecovery(false)} />
  }
  if (hasRecoverySession(session)) {
    return <ResetPassword email={session.user.email} onComplete={() => leaveRecovery(true)} onCancel={() => leaveRecovery(false)} />
  }
  return <SignedInShelf user={session.user} />
}

function ConfiguredAuth({ onLocal }) {
  const [state, setState] = useState({ ready: false, session: null, notice: null })
  const [verifyingLink, setVerifyingLink] = useState(false)
  const [linkError, setLinkError] = useState(null)

  useEffect(() => {
    let active = true
    let subscription
    initializeAuth().then((result) => {
      if (!active) return
      setState({ ready: true, ...result })
      const listener = supabase.auth.onAuthStateChange((event, session) => {
        if (!active || event === 'INITIAL_SESSION') return
        setState((previous) => ({ ...previous, session }))
      })
      subscription = listener.data.subscription
    }).catch(() => {
      if (active) setState({ ready: true, session: null, notice: 'Could not check your session. Reload and try again.' })
    })
    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  async function leaveRecovery(changed) {
    const { error } = await supabase.auth.signOut({ scope: changed ? 'global' : 'local' })
    if (error) throw error
    clearRecovery()
    setState({ ready: true, session: null, notice: changed ? 'Password updated. Sign in with your new password.' : null })
  }

  async function acceptEmailLink() {
    setVerifyingLink(true)
    try {
      const result = await verifyEmailLink(state.emailLink)
      setState({ ready: true, ...result })
    } catch {
      setLinkError('Could not verify this link. Request a fresh email and try again.')
    } finally {
      setVerifyingLink(false)
    }
  }

  if (!state.ready) return <AuthLayout><p role="status">Checking your session…</p></AuthLayout>
  if (state.emailLink) {
    const label = state.emailLink.type === 'recovery' ? 'Continue to reset password' : 'Confirm email address'
    return <AuthLayout>
      <h1 className="mb-4 text-4xl">{label}</h1>
      <button type="button" disabled={verifyingLink} onClick={acceptEmailLink}
        className="label-caps cursor-pointer rounded-full bg-ink px-5 py-3 text-paper disabled:opacity-50">{label}</button>
      <button type="button" disabled={verifyingLink}
        onClick={() => setState((previous) => ({ ...previous, emailLink: null }))}
        className="ml-4 cursor-pointer underline">Cancel</button>
      {linkError && <p role="alert" className="mt-4 text-danger">{linkError}</p>}
    </AuthLayout>
  }
  if (!state.session) return <AuthScreen notice={state.notice} onLocal={onLocal} />
  return <SessionProtection key={state.session.user.id} session={state.session} leaveRecovery={leaveRecovery} />
}

function DesktopBookshelf() {
  const [sync, setSync] = useState(() => authConfigured && localStorage.getItem('my-bookshelf:mac-mode') === 'sync')

  function changeMode(useSync) {
    localStorage.setItem('my-bookshelf:mac-mode', useSync ? 'sync' : 'local')
    setSync(useSync)
  }

  if (sync) return <ConfiguredAuth onLocal={() => changeMode(false)} />
  return <App accountControls={authConfigured && (
    <button type="button" onClick={() => changeMode(true)}
      className="label-caps absolute top-1 left-3 min-h-9 cursor-pointer px-1.5 tracking-wider text-ink-soft hover:text-ink md:top-5 md:left-8 md:min-h-11 md:px-3">
      Sign in to sync
    </button>
  )} />
}

export default function AuthGate() {
  if (desktop) return <DesktopBookshelf />
  if (localDevelopment) return <App />
  if (!authConfigured) {
    return <AuthLayout><h1 className="text-4xl">Account setup required</h1><p className="mt-3">Connect a Supabase project to enable sign-in.</p></AuthLayout>
  }
  return <ConfiguredAuth />
}
