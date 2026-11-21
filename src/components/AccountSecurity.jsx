import { useEffect, useState } from 'react'
import { supabase } from '../lib/auth'
import { AuthLayout } from './AuthScreen'
import Dialog from './Dialog'

const BUTTON = 'label-caps cursor-pointer rounded-full border border-ink/25 px-4 py-2 hover:border-ink disabled:opacity-50'

function CodeForm({ factorId, onVerified }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function verify(event) {
    event.preventDefault()
    const code = new FormData(event.currentTarget).get('code')
    setBusy(true)
    setError(null)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
      if (error) {
        setError('Could not verify the code. Try the current code from your app.')
        return
      }
      onVerified()
    } catch {
      setError('Could not reach the sign-in service. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={verify} className="mt-4 space-y-3">
      <label className="block">
        <span className="label-caps block">Authenticator code</span>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}"
          className="mt-2 w-full rounded border border-ink/25 bg-field px-3 py-2 font-mono" />
      </label>
      <button type="submit" disabled={busy} className={`${BUTTON} bg-ink text-paper`}>Verify code</button>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </form>
  )
}

export function VerifySecondFactor({ factors, onVerified, onSignOut }) {
  const [factorId, setFactorId] = useState(factors[0].id)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  return (
    <AuthLayout>
      <h1 className="text-4xl">Two-step verification</h1>
      <p className="mt-3 text-ink-soft">Enter the six-digit code from your authenticator app.</p>
      {factors.length > 1 && (
        <label className="mt-4 block">
          <span className="label-caps">Authenticator</span>
          <select value={factorId} onChange={(event) => setFactorId(event.target.value)} className="mt-2 w-full border border-ink/25 bg-field p-2">
            {factors.map((factor, index) => <option key={factor.id} value={factor.id}>{factor.friendly_name || `Authenticator ${index + 1}`}</option>)}
          </select>
        </label>
      )}
      <CodeForm key={factorId} factorId={factorId} onVerified={onVerified} />
      <button type="button" disabled={busy} onClick={async () => {
        setBusy(true)
        try {
          await onSignOut()
        } catch {
          setError('Could not sign out. Try again.')
        } finally {
          setBusy(false)
        }
      }} className="mt-5 cursor-pointer underline">Sign out</button>
      {error && <p role="alert" className="mt-2 text-danger">{error}</p>}
    </AuthLayout>
  )
}

export default function AccountSecurity({ onClose }) {
  const [factors, setFactors] = useState(null)
  const [setup, setSetup] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      setFactors(data.totp)
    } catch {
      setError('Could not load your verification methods.')
    }
  }

  useEffect(() => { load() }, [])

  async function enroll() {
    setBusy(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'My Bookshelf' })
      if (error) throw error
      setSetup(data)
    } catch {
      setError('Could not start authenticator setup.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    setBusy(true)
    setError(null)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
      if (error) throw error
      if (setup) setSetup(null)
      await load()
    } catch {
      setError('Could not remove that authenticator.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog labelId="security-title" onClose={() => {
      if (!busy && !setup) onClose()
    }} className="w-lg p-6 sm:p-9">
      <h2 id="security-title" className="text-4xl">Account security</h2>
      <p className="mt-3 text-ink-soft">Use an authenticator app to protect your bookshelf with two-step verification.</p>
      {setup && (
        <>
          <img src={setup.totp.qr_code} alt="Scan this code in your authenticator app" width="184" height="184" className="my-4 bg-white p-2" />
          <details>
            <summary className="cursor-pointer">Enter setup key manually</summary>
            <code className="break-all select-all">{setup.totp.secret}</code>
          </details>
          <CodeForm factorId={setup.id} onVerified={() => {
            setSetup(null)
            load()
          }} />
          <button type="button" disabled={busy} onClick={() => remove(setup.id)} className="mt-3 cursor-pointer underline">Cancel setup</button>
        </>
      )}
      {!setup && factors?.length > 0 && (
        <div className="mt-4 space-y-3">
          <p role="status">Two-step verification is enabled.</p>
          {factors.map((factor, index) => (
            <div key={factor.id} className="flex items-center justify-between gap-3">
              <span>{factor.friendly_name || `Authenticator ${index + 1}`}</span>
              <button type="button" className={BUTTON} disabled={busy}
                onClick={() => {
                  if (window.confirm('Remove this authenticator from your account?')) remove(factor.id)
                }}>Remove</button>
            </div>
          ))}
        </div>
      )}
      {!setup && factors && <button type="button" disabled={busy} onClick={enroll} className={`${BUTTON} mt-5`}>Add authenticator</button>}
      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
    </Dialog>
  )
}
