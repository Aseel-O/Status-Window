import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import StatusPanel from '../components/StatusPanel'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const { signInWithPassword, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signInWithPassword(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setInfo('Account created. Check your email if confirmation is required, then sign in.')
        setMode('signin')
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 relative">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="eyebrow mb-2">Character Select</p>
          <h1 className="font-display text-3xl text-gold tracking-wide">Status Window</h1>
        </div>

        <StatusPanel className="p-6">
          <div className="flex mb-6 rounded-md bg-soft p-1">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                mode === 'signin' ? 'bg-panel text-gold' : 'text-fg-muted'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-panel text-gold' : 'text-fg-muted'
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border border-line rounded-md px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-gold/50"
                autoComplete="email"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-input border border-line rounded-md px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-gold/50"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </label>

            {error && <p className="text-sm text-danger">{error}</p>}
            {info && <p className="text-sm text-success">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 bg-gold text-gold-on font-semibold text-sm rounded-md py-2.5 hover:bg-gold-strong transition-colors disabled:opacity-50"
            >
              {busy ? 'Please wait…' : mode === 'signin' ? 'Enter' : 'Create account'}
            </button>
          </form>
        </StatusPanel>

        <p className="text-center text-xs text-fg-muted mt-6">
          Personal build — single-user. Your data stays in your own Supabase project.
        </p>
      </div>
    </div>
  )
}
