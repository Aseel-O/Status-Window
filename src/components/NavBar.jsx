import { NavLink } from 'react-router-dom'
import { LayoutGrid, PenSquare, Flame, ScrollText, Settings2 } from 'lucide-react'

const TABS = [
  { to: '/', label: 'Status', icon: LayoutGrid, end: true },
  { to: '/log', label: 'Log', icon: PenSquare },
  { to: '/streaks', label: 'Streaks', icon: Flame },
  { to: '/history', label: 'History', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-line bg-app/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="max-w-xl mx-auto grid grid-cols-5">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-body transition-colors ${
                  isActive ? 'text-gold' : 'text-fg-muted hover:text-fg-secondary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
