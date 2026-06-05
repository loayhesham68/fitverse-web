import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F1C1E' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ background: 'linear-gradient(135deg, #00897B, #26C6DA)' }}>
            <span className="font-display text-xl text-white">F</span>
          </div>
          <p className="font-body text-fitverse-subtle text-sm tracking-widest">LOADING...</p>
        </div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}
