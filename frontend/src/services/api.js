import axios from 'axios'
import { auth } from './firebase'

// In production (Vercel), set VITE_API_URL to your Railway backend URL.
// In development, leave it empty and the Vite proxy handles /api → localhost:8000
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth
export const verifyAuth = () => api.post('/auth/verify/')

// Dashboard
export const getDashboard = () => api.get('/dashboard/')
export const getSteps30Days = () => api.get('/steps/')
export const pushSteps = (data) => api.post('/steps/', data)

// Profile
export const getProfile = () => api.get('/profile/')
export const updateProfile = (data) => api.patch('/profile/', data)

// Sessions
export const getSessions = () => api.get('/sessions/')
export const pushSession = (data) => api.post('/sessions/', data)

// Chat
export const getChatHistory = () => api.get('/chat/history/')
export const sendChatMessage = (message) => api.post('/chat/send/', { message })
export const clearChat = () => api.delete('/chat/history/')

export default api
