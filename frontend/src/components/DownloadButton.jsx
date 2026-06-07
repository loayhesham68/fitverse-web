import { useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

export default function DownloadButton() {
  const [showTooltip, setShowTooltip] = useState(false)

  const APK_URL = 'https://github.com/loayhesham68/fitverse-web/releases/download/v1.0.0/FitVerse-1.0.0.apk'

  return (
    <div className="fixed bottom-24 sm:bottom-8 right-6 z-50 flex flex-col items-end gap-2">

      {/* Tooltip card */}
      {showTooltip && (
        <div className="rounded-2xl p-4 w-64 shadow-2xl relative"
          style={{ background: '#1A2E31', border: '1px solid #1E3538' }}>
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute top-3 right-3 text-fitverse-muted hover:text-fitverse-subtle">
            <X size={14} />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
              <img src="/logo.svg" alt="FitVerse" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-display text-sm tracking-widest text-fitverse-text">FITVERSE</p>
              <p className="font-body text-xs text-fitverse-subtle">Android App</p>
            </div>
          </div>
          <p className="font-body text-xs text-fitverse-muted mb-3">
            Requires Android with Health Connect support.
          </p>
          <a
            href={APK_URL}
            download
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-body text-sm font-semibold tracking-wider text-white transition-all duration-200 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #00897B, #26C6DA)' }}
            onClick={() => setShowTooltip(false)}>
            <Download size={15} />
            DOWNLOAD APK
          </a>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-200 active:scale-95 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #00897B, #26C6DA)',
          boxShadow: '0 0 24px #00897B55',
        }}
        title="Download FitVerse App">
        <Smartphone size={22} color="white" />
      </button>
    </div>
  )
}
