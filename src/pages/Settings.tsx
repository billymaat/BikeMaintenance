import { useEffect, useState, type ReactNode } from 'react'
import { LogOut, Moon, Sun, Monitor, Bell, BellOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
import { getPushPermissionState, isSubscribedToPush, subscribeToPush, unsubscribeFromPush, isPushSupported } from '../lib/push'
import type { Unit } from '../types'

export function Settings() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')

  useEffect(() => {
    isSubscribedToPush().then(setPushSubscribed)
    getPushPermissionState().then(setPermission)
  }, [])

  async function handleUnitChange(unit: Unit) {
    if (!user) return
    await supabase.from('profiles').update({ unit_preference: unit }).eq('id', user.id)
    await refreshProfile()
  }

  async function handlePushToggle() {
    if (!user) return
    setPushError(null)
    setPushBusy(true)
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush()
        setPushSubscribed(false)
      } else {
        await subscribeToPush(user.id)
        setPushSubscribed(true)
      }
      setPermission(await getPushPermissionState())
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPushBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>

      <Section title="Appearance">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'system', label: 'System', icon: Monitor },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium ${
                theme === value
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Units">
        <div className="grid grid-cols-2 gap-2">
          {(['mi', 'km'] as const).map((unit) => (
            <button
              key={unit}
              onClick={() => handleUnitChange(unit)}
              className={`rounded-lg border py-2.5 text-sm font-medium ${
                profile?.unit_preference === unit
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              {unit === 'mi' ? 'Miles' : 'Kilometers'}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Default for new bikes. Each bike can override this.
        </p>
      </Section>

      <Section title="Notifications">
        {!isPushSupported() ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Push notifications aren't supported in this browser. On iOS, add this app to your home screen first
            (Share → Add to Home Screen), then open it from there.
          </p>
        ) : (
          <>
            <button
              onClick={handlePushToggle}
              disabled={pushBusy || permission === 'denied'}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {pushSubscribed ? <BellOff size={16} /> : <Bell size={16} />}
              {pushBusy ? 'Please wait…' : pushSubscribed ? 'Disable reminders' : 'Enable push reminders'}
            </button>
            {permission === 'denied' && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                Notifications are blocked for this site in your browser settings.
              </p>
            )}
            {pushError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{pushError}</p>}
          </>
        )}
      </Section>

      <button
        onClick={signOut}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        <LogOut size={16} /> Sign out
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-medium text-slate-900 dark:text-slate-100">{title}</h2>
      {children}
    </div>
  )
}
