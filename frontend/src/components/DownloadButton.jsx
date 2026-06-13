import { useState } from 'react'
import { Smartphone } from 'lucide-react'
import { useTyping } from '../context/TypingContext'

// Same-origin (via our Railway backend) proxy — avoids the GitHub
// redirect / CORS issues that broke downloads on mobile and TV browsers.
const API_BASE = import.meta.env.VITE_API_URL || ''
const APK_DOWNLOAD_URL = `${API_BASE}/api/download-apk/`

export default function DownloadButton() {
  const [showTooltip, setShowTooltip] = useState(false)
  const { isTyping } = useTyping()

  return (
    <div
      className="fixed bottom-24 sm:bottom-8 right-6 z-50 flex flex-col items-end gap-2 transition-all duration-300"
      style={{
        opacity: isTyping ? 0 : 1,
        pointerEvents: isTyping ? 'none' : 'auto',
        transform: isTyping ? 'translateY(8px)' : 'translateY(0)',
      }}
    >
      {/* Tooltip card */}
      {showTooltip && (
        <div className="rounded-2xl p-4 w-64 shadow-2xl relative"
          style={{ background: '#1A2E31', border: '1px solid #1E3538' }}>
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute top-3 right-3 text-fitverse-muted hover:text-fitverse-subtle">
            ✕
          </button>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="FitVerse" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-display text-sm tracking-widest text-fitverse-text">FITVERSE</p>
              <p className="font-body text-xs text-fitverse-subtle">Android App</p>
            </div>
          </div>
          <p className="font-body text-xs text-fitverse-muted mb-3">
            Requires Android with Health Connect support.
          </p>
          {/* Plain same-origin <a download> — browser handles the file
              save natively on desktop, mobile, and TV browsers alike. */}
          <a
            href={APK_DOWNLOAD_URL}
            download="FitVerse-1.0.0.apk"
            onClick={() => setShowTooltip(false)}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-body text-sm font-semibold tracking-wider text-white transition-all duration-200 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #00897B, #26C6DA)' }}>
            DOWNLOAD APK
          </a>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className="flex items-center gap-2 h-12 px-4 rounded-2xl shadow-2xl transition-all duration-200 active:scale-95 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #00897B, #26C6DA)',
          boxShadow: '0 0 24px #00897B55',
        }}
        title="Download FitVerse App">
        <Smartphone size={18} color="white" />
        <span className="font-body text-xs font-semibold tracking-wider text-white whitespace-nowrap">
          FOR MOBILE
        </span>
      </button>
    </div>
  )
}
