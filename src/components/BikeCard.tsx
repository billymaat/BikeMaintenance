import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Bike, TaskStatus } from '../types'
import { StatusBadge, worstStatus } from './StatusBadge'
import { summarizeStatuses } from '../lib/reminders'

export function BikeCard({ bike, statuses }: { bike: Bike; statuses: TaskStatus[] }) {
  const summary = summarizeStatuses(statuses)
  const overall = worstStatus(statuses.map((s) => s.status))
  const unit = bike.unit_override ?? 'mi'

  return (
    <Link
      to={`/bikes/${bike.id}`}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        {bike.photo_url ? (
          <img src={bike.photo_url} alt={bike.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-semibold text-slate-400">{bike.name.slice(0, 1).toUpperCase()}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-medium text-slate-900 dark:text-slate-100">{bike.name}</h3>
          <StatusBadge status={overall} />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {bike.bike_type} · {bike.current_mileage.toLocaleString()} {unit}
        </p>
        {(summary.overdue > 0 || summary.dueSoon > 0) && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {summary.overdue > 0 && <span className="text-red-600 dark:text-red-400">{summary.overdue} overdue</span>}
            {summary.overdue > 0 && summary.dueSoon > 0 && ' · '}
            {summary.dueSoon > 0 && (
              <span className="text-amber-600 dark:text-amber-400">{summary.dueSoon} due soon</span>
            )}
          </p>
        )}
      </div>

      <ChevronRight size={18} className="shrink-0 text-slate-400" />
    </Link>
  )
}
