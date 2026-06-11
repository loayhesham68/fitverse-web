import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TypingProvider } from './context/TypingContext'
import ProtectedRoute from './components/ProtectedRoute'
import DownloadButton from './components/DownloadButton'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CoachPage from './pages/CoachPage'
import './index.css'

export default function App() {
  return (
    <AuthProvider>
      <TypingProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/coach" element={
              <ProtectedRoute><CoachPage /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <DownloadButton />
        </BrowserRouter>
      </TypingProvider>
    </AuthProvider>
  )
}