import { useAuth } from '../context/AuthContext'

export default function Header({ title, subtitle }) {
  const { user, profile } = useAuth()
  const displayName = profile?.display_name || user?.displayName || 'ATHLETE'

  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b border-fitverse-card2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <h1 className="font-display text-lg sm:text-2xl tracking-widest text-fitverse-text truncate">{title}</h1>
        {subtitle && (
          <span className="hidden md:block text-fitverse-subtle font-body text-sm tracking-wider uppercase">
            | {subtitle}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <span className="hidden sm:block font-body font-medium text-sm tracking-wider text-fitverse-subtle uppercase">
          HELLO <span className="text-fitverse-text">{displayName.split(' ')[0].toUpperCase()}</span>
        </span>
        {user?.photoURL ? (
          <img src={user.photoURL} alt="avatar" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-fitverse-teal/50" />
        ) : (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-fitverse-teal flex items-center justify-center text-white font-display text-lg">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
      </div>
    </header>
  )
}
