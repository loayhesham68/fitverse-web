import { useState, useEffect, useCallback } from 'react'
import { Heart, Droplets, Flame, Activity } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import MetricCard from '../components/MetricCard'
import StepsCalendar from '../components/StepsCalendar'
import { getDashboard, getSteps30Days } from '../services/api'
import { useAuth } from '../context/AuthContext'

// Poll the dashboard + steps endpoints on this interval (ms).
// The backend doesn't push live updates via WebSocket, so we refresh
// periodically to pick up new health data synced from the mobile app.
const REFRESH_INTERVAL = 15000

export default function DashboardPage() {
  const { profile } = useAuth()
  const [summary, setSummary] = useState(null)
  const [stepsData, setStepsData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, stepsRes] = await Promise.all([getDashboard(), getSteps30Days()])
      setSummary(dashRes.data)
      setStepsData(stepsRes.data)
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => { fetchData() }, [fetchData])

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])

  // Refresh immediately when the tab regains focus/visibility
  useEffect(() => {
    const onFocus = () => fetchData()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [fetchData])

  const today = summary?.today
  const p = summary?.profile || profile

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center sm:pl-16 pb-16 sm:pb-0" style={{ background: '#0F1C1E' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl animate-spin" style={{ border: '2px solid #1E3538', borderTop: '2px solid #00897B' }} />
          <p className="font-body text-fitverse-subtle text-sm tracking-widest">LOADING DASHBOARD...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0F1C1E' }}>
      <Sidebar />

      {/* sm:pl-16 = sidebar offset on tablet+, pb-20 = bottom nav offset on mobile */}
      <main className="flex-1 sm:pl-16 pb-20 sm:pb-0 flex flex-col min-h-screen w-full">
        <Header title="FITVERSE DASHBOARD" subtitle="PERFORMANCE OVERVIEW" />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">

          {/* Metric cards — 2 cols mobile, 4 cols tablet+ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard
              label="Blood Oxygen" value={today?.spo2 ? today.spo2.toFixed(1) : '—'} unit={today?.spo2 ? '%' : ''}
              icon={Droplets} accentColor="#26C6DA"
              sub={today?.spo2 ? { label: 'Optimal', percent: Math.min(100, Math.round(today.spo2)) } : { label: 'No data yet', percent: 0 }}
            />
            <MetricCard
              label="Heart Rate" value={today?.heart_rate ? Math.round(today.heart_rate) : '—'} unit={today?.heart_rate ? 'bpm' : ''}
              icon={Heart} accentColor="#EF5350" pulse={!!today?.heart_rate}
              sub={today?.heart_rate ? { label: 'Resting', percent: Math.min(100, Math.round(today.heart_rate)) } : { label: 'No data yet', percent: 0 }}
            />
            <MetricCard
              label="Steps Today" value={(today?.steps ?? 0).toLocaleString()} unit="steps"
              icon={Activity} accentColor="#00897B"
              sub={{ label: `${Math.min(100, Math.round(((today?.steps || 0) / 10000) * 100))}% of goal`, percent: Math.min(100, Math.round(((today?.steps || 0) / 10000) * 100)) }}
            />
            <MetricCard
              label="Daily Burn" value={(today?.calories ?? 0).toLocaleString()} unit="kcal"
              icon={Flame} accentColor="#FF7043"
              sub={{ label: `${Math.min(100, Math.round(((today?.calories || 0) / 2500) * 100))}% of goal`, percent: Math.min(100, Math.round(((today?.calories || 0) / 2500) * 100)) }}
            />
          </div>

          {/* Profile + Last session — stacked on mobile, side by side on tablet+ */}
          {p && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Profile card */}
              <div className="rounded-2xl p-4 sm:p-5" style={{ background: '#1A2E31', border: '1px solid #1E3538' }}>
                <p className="font-body text-xs text-fitverse-subtle tracking-widest uppercase mb-3 sm:mb-4">Athlete Profile</p>
                <div className="space-y-2 sm:space-y-3">
                  {[
                    { label: 'AGE', value: p.age ? `${p.age} yrs` : '—' },
                    { label: 'HEIGHT', value: p.height_cm ? `${p.height_cm} cm` : '—' },
                    { label: 'WEIGHT', value: p.weight_kg ? `${p.weight_kg} kg` : '—' },
                    { label: 'BMI', value: p.bmi ? `${p.bmi} (${p.bmi_category})` : '—' },
                    { label: 'GOAL', value: p.fitness_goal || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="font-body text-xs text-fitverse-muted tracking-wider">{label}</span>
                      <span className="font-mono text-sm text-fitverse-text">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last session card */}
              <div className="rounded-2xl p-4 sm:p-5 md:col-span-2" style={{ background: '#1A2E31', border: '1px solid #1E3538' }}>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <p className="font-body text-xs text-fitverse-subtle tracking-widest uppercase">Recent Workout</p>
                  {summary?.last_session && (
                    <span className="font-body text-xs text-fitverse-teal tracking-wider uppercase">
                      {summary.last_session.intensity} Intensity
                    </span>
                  )}
                </div>
                {summary?.last_session ? (
                  <>
                    <p className="font-display text-xl sm:text-2xl tracking-widest text-fitverse-text mb-1">
                      {summary.last_session.workout_name.toUpperCase()}
                    </p>
                    <p className="font-body text-xs text-fitverse-teal mb-3 sm:mb-4 tracking-wider uppercase">
                      {summary.last_session.muscle_group}
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {[
                        { label: 'Duration', value: `${summary.last_session.duration_minutes} min` },
                        { label: 'Calories', value: `${Math.round(summary.last_session.calories_burned)} kcal` },
                        { label: 'Accuracy', value: `${Math.round(summary.last_session.accuracy_score)}%` },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl p-2 sm:p-3 text-center" style={{ background: '#1E3538' }}>
                          <p className="font-display text-lg sm:text-xl text-fitverse-accent">{value}</p>
                          <p className="font-body text-xs text-fitverse-subtle mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-20 sm:h-24 text-fitverse-muted">
                    <p className="font-body text-sm">No workouts synced yet</p>
                    <p className="font-body text-xs mt-1 text-fitverse-subtle">Complete a workout on the mobile app</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 30-day Steps Calendar */}
          <StepsCalendar stepsData={stepsData} />
        </div>
      </main>
    </div>
  )
}