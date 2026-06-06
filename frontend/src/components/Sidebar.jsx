import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, Bot, LogOut } from 'lucide-react'

export default function Sidebar() {
  const { logout, user, profile } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'DASHBOARD' },
    { to: '/coach', icon: Bot, label: 'AI COACH' },
  ]

  return (
    <>
      {/* Desktop/Tablet sidebar */}
      <aside className="hidden sm:flex fixed left-0 top-0 h-screen w-16 flex-col items-center py-6 z-50"
        style={{ background: 'linear-gradient(180deg, #0a1a1c 0%, #0F1C1E 100%)', borderRight: '1px solid #1E3538' }}>

        {/* Logo */}
        <div className="mb-8">
          <img src="/logo.png" alt="FitVerse" className="w-10 h-10 rounded-xl object-cover" />
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} title={label}
              className={({ isActive }) =>
                `relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group
                 ${isActive ? 'bg-fitverse-teal text-white shadow-lg' : 'text-fitverse-subtle hover:text-fitverse-accent hover:bg-fitverse-card2'}`
              }>
              <Icon size={18} />
              <span className="absolute left-14 bg-fitverse-card2 text-fitverse-text text-xs font-body font-medium
                               px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
                               pointer-events-none border border-fitverse-muted/30">
                {label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Avatar */}
        {user?.photoURL && (
          <div className="mb-3">
            <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full border-2 border-fitverse-teal/50" />
          </div>
        )}

        {/* Logout */}
        <button onClick={handleLogout} title="LOGOUT"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-fitverse-subtle
                     hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 group relative">
          <LogOut size={18} />
          <span className="absolute left-14 bg-fitverse-card2 text-red-400 text-xs font-body font-medium
                           px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
                           pointer-events-none border border-red-400/20">
            LOGOUT
          </span>
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-4 py-3"
        style={{ background: '#0a1a1c', borderTop: '1px solid #1E3538' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all duration-200
               ${isActive ? 'text-fitverse-teal' : 'text-fitverse-muted'}`
            }>
            <Icon size={20} />
            <span className="font-body text-xs tracking-wider">{label}</span>
          </NavLink>
        ))}
        <button onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl text-fitverse-muted hover:text-red-400 transition-all">
          <LogOut size={20} />
          <span className="font-body text-xs tracking-wider">LOGOUT</span>
        </button>
      </nav>
    </>
  )
}