import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, user, loading, error } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true })
  }, [user, loading, navigate])

  const handleLogin = async () => {
    try { await login() } catch (e) {}
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0F1C1E' }}>
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-64 sm:w-96 lg:w-[600px] h-64 sm:h-96 lg:h-[600px] rounded-full opacity-5 blur-3xl"
          style={{ background: '#00897B' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-64 sm:w-80 lg:w-[500px] h-64 sm:h-80 lg:h-[500px] rounded-full opacity-5 blur-3xl"
          style={{ background: '#26C6DA' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#26C6DA 1px, transparent 1px), linear-gradient(90deg, #26C6DA 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Top bar */}
      <nav className="relative z-10 flex items-center justify-center px-5 sm:px-10 py-4 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex-shrink-0">
            <img src="/logo.png" alt="FitVerse" className="w-full h-full object-cover" />
          </div>
          <span className="font-display text-xl sm:text-2xl tracking-widest text-fitverse-text">FITVERSE</span>
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
            style={{ background: '#1A2E31', border: '1px solid #1E3538' }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, #00897B, transparent)' }} />

            <h2 className="font-display text-3xl sm:text-4xl tracking-widest text-fitverse-text mb-1">WELCOME</h2>
            <h2 className="font-display text-3xl sm:text-4xl tracking-widest text-fitverse-teal mb-2">BACK</h2>
            <p className="font-body text-xs text-fitverse-subtle tracking-widest uppercase mb-6 sm:mb-8">
              Unleash the athlete within
            </p>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="font-body text-sm text-red-400">{error}</p>
              </div>
            )}

            <button onClick={handleLogin} disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 sm:py-3.5 rounded-xl font-body font-semibold
                         text-sm tracking-wider transition-all duration-200 active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #00897B, #00695C)', color: 'white', boxShadow: '0 0 20px #00897B33' }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#ffffffcc" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#ffffff88" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#ffffffaa" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'SIGNING IN...' : 'CONTINUE WITH GOOGLE'}
            </button>

            <p className="font-body text-xs text-fitverse-subtle text-center mt-4 tracking-wide">
              Not a member?{' '}
              <button onClick={handleLogin} className="text-fitverse-accent hover:underline">Start your journey</button>
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mt-5 sm:mt-6">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00897B, #26C6DA)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="font-body text-xs text-fitverse-subtle tracking-widest uppercase">High Performance Only</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-5 sm:px-10 py-4 sm:py-6 border-t border-fitverse-card2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <span className="font-display text-lg tracking-widest text-fitverse-teal">FITVERSE</span>
          <div className="flex gap-3 sm:gap-6 flex-wrap justify-center">
            {['Privacy', 'Terms', 'Support', 'Cookies'].map((t) => (
              <a key={t} href="#" className="font-body text-xs text-fitverse-muted hover:text-fitverse-subtle tracking-wider uppercase">{t}</a>
            ))}
          </div>
          <span className="font-body text-xs text-fitverse-muted">© 2026 FIT VERSE</span>
        </div>
      </footer>
    </div>
  )
}