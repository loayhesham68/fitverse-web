import { useEffect, useRef, useCallback } from 'react'
import { auth } from '../services/firebase'

export function useRealtimeDashboard(onUpdate) {
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)

  const connect = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return

    const token = await user.getIdToken()

    // In production use VITE_WS_URL (e.g. wss://your-app.railway.app)
    // In development use current host with ws/wss protocol
    let wsBase = import.meta.env.VITE_WS_URL
    if (!wsBase) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      wsBase = `${wsProtocol}://${window.location.host}`
    }
    const url = `${wsBase}/ws/dashboard/?token=${token}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Dashboard connected')
      ws._pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'dashboard_update' && onUpdate) {
          onUpdate(msg.data)
        }
      } catch (e) {
        console.warn('[WS] Parse error', e)
      }
    }

    ws.onerror = (e) => console.warn('[WS] Error', e)

    ws.onclose = () => {
      clearInterval(ws._pingInterval)
      reconnectTimer.current = setTimeout(connect, 5000)
    }
  }, [onUpdate])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])
}
