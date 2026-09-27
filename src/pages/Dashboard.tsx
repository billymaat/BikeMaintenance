import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { BikeCard } from '../components/BikeCard'
import { computeBikeStatuses } from '../lib/reminders'

export function Dashboard() {
  const { bikes, taskTypes, rules, logs, loading } = useData()
  const activeBikes = bikes.filter((b) => !b.archived)

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Your Fleet</h1>
        <Link
          to="/bikes/new"
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} /> Add bike
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : activeBikes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No bikes yet. Add your first bike to start tracking maintenance.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {activeBikes.map((bike) => (
            <BikeCard
              key={bike.id}
              bike={bike}
              statuses={computeBikeStatuses({ bike, taskTypes, rules, logs })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
