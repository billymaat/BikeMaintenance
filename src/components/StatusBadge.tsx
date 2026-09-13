import type { ReminderStatus } from '../types'

const STYLES: Record<ReminderStatus, string> = {
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  due_soon: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  not_tracked: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const LABELS: Record<ReminderStatus, string> = {
  overdue: 'Overdue',
  due_soon: 'Due soon',
  ok: 'OK',
  not_tracked: 'Not tracked',
}

export function StatusBadge({ status, className = '' }: { status: ReminderStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]} ${className}`}
    >
      {LABELS[status]}
    </span>
  )
}

export function worstStatus(statuses: ReminderStatus[]): ReminderStatus {
  if (statuses.includes('overdue')) return 'overdue'
  if (statuses.includes('due_soon')) return 'due_soon'
  if (statuses.some((s) => s === 'ok')) return 'ok'
  return 'not_tracked'
}
