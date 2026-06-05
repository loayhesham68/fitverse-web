export default function MetricCard({ label, value, unit, sub, icon: Icon, accentColor = '#00897B', pulse = false }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 flex flex-col gap-2 sm:gap-3"
      style={{ background: '#1A2E31', border: '1px solid #1E3538' }}>
      <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full opacity-10 blur-2xl"
        style={{ background: accentColor, transform: 'translate(30%, -30%)' }} />
      <div className="flex items-start justify-between">
        <span className="font-body text-xs text-fitverse-subtle tracking-widest uppercase">{label}</span>
        {Icon && (
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${accentColor}22` }}>
            <Icon size={13} style={{ color: accentColor }} />
          </div>
        )}
      </div>
      <div className="flex items-end gap-1">
        <span className={`font-display text-3xl sm:text-4xl leading-none ${pulse ? 'animate-pulse' : ''}`}
          style={{ color: accentColor }}>
          {value ?? '—'}
        </span>
        {unit && <span className="font-body text-xs text-fitverse-subtle mb-1">{unit}</span>}
      </div>
      {sub && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-fitverse-card2">
            <div className="h-1 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, sub.percent || 70)}%`, background: accentColor }} />
          </div>
          <span className="text-xs font-body text-fitverse-subtle whitespace-nowrap">{sub.label}</span>
        </div>
      )}
    </div>
  )
}
