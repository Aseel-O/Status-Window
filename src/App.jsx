import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { isSupabaseConfigured } from './lib/supabaseClient'
import NavBar from './components/NavBar'
import LoadingScreen from './components/LoadingScreen'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import QuickLog from './pages/QuickLog'
import Streaks from './pages/Streaks'
import History from './pages/History'
import Settings from './pages/Settings'

function ConfigWarning() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <p className="font-display text-xl text-gold mb-3">Not configured</p>
        <p className="text-sm text-fg-secondary">
          Copy <code className="text-fg">.env.example</code> to{' '}
          <code className="text-fg">.env</code> and fill in your Supabase project URL and
          anon key, then restart the dev server. See README.md for the full setup steps.
        </p>
      </div>
    </div>
  )
}

function AuthedApp() {
  const { session, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <Login />

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/log" element={<QuickLog />} />
        <Route path="/streaks" element={<Streaks />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <NavBar />
    </>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigWarning />

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AuthedApp />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
