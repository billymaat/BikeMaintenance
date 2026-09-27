import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Bike, LayoutDashboard, ListPlus, Wrench, Settings as SettingsIcon } from 'lucide-react'

const TABS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/log', label: 'Log', icon: ListPlus, end: false },
  { to: '/task-types', label: 'Task Types', icon: Wrench, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false },
]

// Phones: bottom tab bar. Tablets (md): icon rail on the left. Desktop (lg): full sidebar with labels.
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="sticky top-0 hidden h-svh shrink-0 flex-col border-r border-slate-200 bg-white md:flex md:w-20 lg:w-60 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-center gap-2 px-4 py-5 lg:justify-start">
          <Bike size={24} className="text-blue-600 dark:text-blue-400" />
          <span className="hidden font-semibold lg:inline">Bike Maintenance</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-[11px] font-medium lg:flex-row lg:gap-3 lg:px-3 lg:text-sm ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon size={20} strokeWidth={2} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="grid grid-cols-4">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <Icon size={20} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
