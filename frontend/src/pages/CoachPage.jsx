import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, Send, Trash2, Wifi, WifiOff } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import Sidebar from '../components/Sidebar'
import { getChatHistory, sendChatMessage, clearChat } from '../services/api'
import { useTyping } from '../context/TypingContext'

const QUICK_PROMPTS = [
  '📊 Analyse my workout history',
  '💪 What should I eat after training?',
  '🔄 Suggest a recovery plan',
  '🎯 Reach my goal faster',
]

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  const ts = msg.timestamp ? format(parseISO(msg.timestamp), 'HH:mm') : ''
  // Strip basic markdown the model sometimes leaves in (the chat UI is plain text)
  const content = (msg.content || '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/^\s*\*\s+/gm, '• ')

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-3 sm:mb-4`}>
      {!isUser && (
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center mr-2 mt-1 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #00897B, #26C6DA)' }}>
          <Bot size={12} color="white" />
        </div>
      )}
      <div className="max-w-[85%] sm:max-w-[65%] min-w-0">
        <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-2xl font-body text-sm leading-relaxed whitespace-pre-wrap break-words"
          style={{
            background: isUser ? '#1E3538' : '#1A2E31',
            border: `1px solid ${isUser ? '#26C6DA22' : '#1E3538'}`,
            borderBottomRightRadius: isUser ? 4 : undefined,
            borderBottomLeftRadius: !isUser ? 4 : undefined,
            color: '#E8F4F5',
            overflowWrap: 'anywhere',
          }}>
          {content}
        </div>
        <div className={`flex items-center gap-1.5 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="font-mono text-[10px] sm:text-xs text-fitverse-muted">{isUser ? 'ATHLETE' : 'COACH'}</span>
          {ts && <span className="font-mono text-[10px] sm:text-xs text-fitverse-muted">{ts}</span>}
          {msg.source && (
            <span className="hidden sm:inline font-body text-xs px-1.5 py-0.5 rounded"
              style={{ background: msg.source === 'web' ? '#00897B22' : '#26C6DA22', color: msg.source === 'web' ? '#00897B' : '#26C6DA' }}>
              {msg.source}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CoachPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(true)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const sendingRef = useRef(false)
  const { setIsTyping } = useTyping()

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  const loadHistory = useCallback(async () => {
    try {
      const res = await getChatHistory()
      setMessages(res.data.messages || [])
      setOnline(true)
    } catch (e) {
      setOnline(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Lightweight poll — merges in any new messages (e.g. sent from the mobile
  // app) without disturbing an in-flight send or the optimistic bubbles.
  const pollHistory = useCallback(async () => {
    if (sendingRef.current) return
    try {
      const res = await getChatHistory()
      const fresh = res.data.messages || []
      setMessages((prev) => {
        if (prev.some((m) => m._loading)) return prev
        if (fresh.length === prev.length) {
          const sameLast = fresh.length === 0 || fresh[fresh.length - 1].id === prev[prev.length - 1]?.id
          if (sameLast) return prev
        }
        return fresh
      })
      setOnline(true)
    } catch (e) {
      setOnline(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])
  useEffect(() => { scrollToBottom() }, [messages])

  // Poll every 4 seconds for messages sent from the mobile app.
  useEffect(() => {
    const interval = setInterval(pollHistory, 4000)
    return () => clearInterval(interval)
  }, [pollHistory])

  // Also re-sync the moment the tab regains focus/visibility.
  useEffect(() => {
    const onFocus = () => pollHistory()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [pollHistory])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || sending) return
    setInput('')
    setIsTyping(false)
    setSending(true)
    sendingRef.current = true

    const tempUser = { id: `u-${Date.now()}`, role: 'user', content: msg, source: 'web', timestamp: new Date().toISOString() }
    const tempLoading = { id: `l-${Date.now()}`, role: 'model', content: '...', source: 'web', timestamp: new Date().toISOString(), _loading: true }
    setMessages((prev) => [...prev, tempUser, tempLoading])

    try {
      await sendChatMessage(msg)
      setOnline(true)
      await loadHistory()
    } catch (e) {
      setMessages((prev) => [...prev.slice(0, -1), { id: `e-${Date.now()}`, role: 'model', content: 'Sorry, I had trouble connecting. Please try again.', source: 'web', timestamp: new Date().toISOString() }])
      setOnline(false)
    } finally {
      setSending(false)
      sendingRef.current = false
      inputRef.current?.focus()
    }
  }

  const handleClear = async () => {
    if (!window.confirm('Clear all chat history? This will also clear it on your mobile app.')) return
    await clearChat()
    setMessages([])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const groupedMessages = messages.reduce((groups, msg) => {
    const day = msg.timestamp ? format(parseISO(msg.timestamp), 'yyyy-MM-dd') : 'today'
    if (!groups[day]) groups[day] = []
    groups[day].push(msg)
    return groups
  }, {})

  return (
    <div className="min-h-screen flex" style={{ background: '#0F1C1E' }}>
      <Sidebar />

      <main className="flex-1 sm:pl-16 pb-16 sm:pb-0 flex flex-col min-w-0 w-full overflow-hidden" style={{ height: '100dvh' }}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-8 py-2.5 sm:py-4 border-b border-fitverse-card2 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00897B, #26C6DA)' }}>
              <Bot size={14} color="white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-display text-base sm:text-2xl tracking-widest text-fitverse-text truncate">FITVERSE COACH</h1>
                <span className="hidden sm:flex items-center gap-1 font-body text-xs text-fitverse-teal flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-fitverse-teal animate-pulse" />
                  SYSTEM ACTIVE
                </span>
              </div>
              <p className="hidden sm:block font-body text-xs text-fitverse-subtle tracking-wider">
                Personalized · Health-aware · Context-driven
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 font-body text-xs text-fitverse-subtle">
              {online
                ? <Wifi size={14} className="text-fitverse-teal" />
                : <WifiOff size={14} className="text-red-400" />}
              <span className={`hidden sm:inline ${online ? '' : 'text-red-400'}`}>{online ? 'Synced' : 'Offline'}</span>
            </div>
            <button onClick={handleClear}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-fitverse-muted hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Quick prompts */}
        {messages.length === 0 && !loading && (
          <div className="px-3 sm:px-8 py-2.5 sm:py-3 flex gap-2 overflow-x-auto sm:flex-wrap border-b border-fitverse-card2 flex-shrink-0 no-scrollbar">
            {QUICK_PROMPTS.map((p) => (
              <button key={p} onClick={() => sendMessage(p)}
                className="font-body text-xs px-3 sm:px-4 py-2 rounded-full transition-all duration-200 hover:border-fitverse-teal hover:text-fitverse-accent whitespace-nowrap flex-shrink-0"
                style={{ background: '#1A2E31', border: '1px solid #1E3538', color: '#8AACB0' }}>
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-8 py-3 sm:py-6 w-full min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-xl animate-spin" style={{ border: '2px solid #1E3538', borderTop: '2px solid #00897B' }} />
                <p className="font-body text-xs text-fitverse-subtle tracking-widest">LOADING CHAT HISTORY...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #00897B22, #26C6DA22)', border: '1px solid #00897B44' }}>
                <Bot size={24} style={{ color: '#00897B' }} />
              </div>
              <div>
                <p className="font-display text-lg sm:text-xl tracking-widest text-fitverse-text">ASK FITVERSE COACH</p>
                <p className="font-body text-sm text-fitverse-subtle mt-1">
                  Your AI fitness coach — powered by Gemini.
                </p>
              </div>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([day, dayMessages]) => (
              <div key={day}>
                <div className="flex items-center justify-center my-3 sm:my-4">
                  <span className="font-body text-xs text-fitverse-muted px-3 py-1 rounded-full"
                    style={{ background: '#1A2E31', border: '1px solid #1E3538' }}>
                    {day === format(new Date(), 'yyyy-MM-dd') ? 'TODAY' : format(parseISO(day), 'MMM d, yyyy')}
                  </span>
                </div>
                {dayMessages.map((msg) => <ChatBubble key={msg.id} msg={msg} />)}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div className="px-2.5 sm:px-8 py-2.5 sm:py-5 border-t border-fitverse-card2 flex-shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-3 rounded-2xl px-2.5 sm:px-5 py-1.5 sm:py-3"
            style={{ background: '#1A2E31', border: '1px solid #1E3538' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); setIsTyping(e.target.value.length > 0) }}
              onKeyDown={handleKeyDown}
              placeholder="Ask FitVerse Coach..."
              disabled={sending}
              rows={1}
              className="flex-1 bg-transparent font-body text-sm text-fitverse-text placeholder-fitverse-muted resize-none outline-none py-1"
              style={{ maxHeight: '100px' }}
            />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button onClick={() => sendMessage()} disabled={!input.trim() || sending}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40 active:scale-95 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #00897B, #26C6DA)' }}>
                <Send size={14} color="white" />
              </button>
            </div>
          </div>
          <p className="hidden sm:block font-body text-xs text-fitverse-muted text-center mt-2">
            Enter to send · Shift+Enter for new line · Chat synced with mobile app
          </p>
        </div>
      </main>
    </div>
  )
}
