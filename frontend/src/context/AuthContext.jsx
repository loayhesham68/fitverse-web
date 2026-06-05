import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, signInWithGoogle, signOutUser } from '../services/firebase'
import { verifyAuth } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        try {
          // Wait for token to be ready before calling backend
          await firebaseUser.getIdToken(true)
          const res = await verifyAuth()
          setProfile(res.data.user)
        } catch (e) {
          console.error('Profile fetch failed:', e)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError('Google sign-in failed. Please try again.')
      throw e
    }
  }

  const logout = async () => {
    await signOutUser()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
