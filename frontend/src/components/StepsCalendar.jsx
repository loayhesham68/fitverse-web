import { useMemo } from 'react'
import { format, subDays } from 'date-fns'

export default function StepsCalendar({ stepsData = [] }) {
  const days = useMemo(() => {
    const map = {}
    stepsData.forEach((d) => { map[d.date] = d.steps })
    const result = []
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i)
      const key = format(d, 'yyyy-MM-dd')
      result.push({ date: d, key, steps: map[key] || 0 })
    }
    return result
  }, [stepsData])

  const goal = 10000

  const getColor = (steps) => {
    if (steps === 0) return '#1E3538'
    const ratio = Math.min(steps / goal, 1)
    if (ratio < 0.25) return '#00897B33'
    if (ratio < 0.5)  return '#00897B66'
    if (ratio < 0.75) return '#00897BAA'
    return '#00897B'
  }

  const getTextColor = (steps) => {
    if (steps === 0) return '#4A6B70'
    return steps >= goal ? '#fff' : '#26C6DA'
  }

  const totalSteps = days.reduce((s, d) => s + d.steps, 0)
  const activeDays = days.filter((d) => d.steps > 0).length
  const goalDays = days.filter((d) => d.steps >= goal).length

  return (
    <div className="rounded-2xl px-4 sm:px-5 py-3 sm:py-4" style={{ background: '#1A2E31', border: '1px solid #1E3538' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-sm tracking-widest text-fitverse-text">STEPS — LAST 30 DAYS</h2>
          <span className="hidden sm:block font-body text-fitverse-muted" style={{ fontSize: '11px' }}>Goal: 10,000 / day</span>
        </div>
        <div className="flex gap-3 sm:gap-4">
          {[
            { value: activeDays, label: 'active', color: 'text-fitverse-accent' },
            { value: goalDays, label: 'goals hit', color: 'text-fitverse-teal' },
            { value: `${(totalSteps / 1000).toFixed(1)}k`, label: 'total', color: 'text-fitverse-text' },
          ].map(({ value, label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <span className={`font-display text-base ${color}`}>{value}</span>
              <span className="font-body text-fitverse-muted" style={{ fontSize: '11px' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {/* Day labels */}
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '9px', color: '#4A6B70', paddingBottom: '2px' }}>{d}</div>
        ))}

        {/* Empty offset */}
        {Array.from({ length: days[0].date.getDay() }).map((_, i) => (
          <div key={`e-${i}`} style={{ height: '28px' }} />
        ))}

        {/* Day cells */}
        {days.map(({ date, key, steps }) => (
          <div key={key} className="relative group cursor-default transition-transform duration-150 hover:scale-110"
            style={{ background: getColor(steps), height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: getTextColor(steps), fontSize: '9px', fontFamily: 'monospace' }}>
              {format(date, 'd')}
            </span>
            {steps >= goal && (
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '5px', height: '5px', borderRadius: '50%', background: '#26C6DA' }} />
            )}
            {/* Tooltip — hidden on very small screens */}
            <div className="hidden sm:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
              style={{ background: '#0F1C1E', border: '1px solid #1E3538', borderRadius: '8px', padding: '4px 8px', whiteSpace: 'nowrap' }}>
              <p style={{ fontSize: '10px', color: '#8AACB0' }}>{format(date, 'EEE, MMM d')}</p>
              <p style={{ fontSize: '12px', color: '#26C6DA', fontFamily: 'monospace' }}>
                {steps.toLocaleString()} <span style={{ fontSize: '10px', color: '#8AACB0' }}>steps</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-2">
        <span style={{ fontSize: '10px', color: '#4A6B70' }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <div key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', background: getColor(Math.round(r * goal)) }} />
        ))}
        <span style={{ fontSize: '10px', color: '#4A6B70' }}>More</span>
      </div>
    </div>
  )
}
