import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useData } from '../contexts/DataContext'

export function LogTask() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { bikes, taskTypes, createLog, updateBike } = useData()
  const activeBikes = bikes.filter((b) => !b.archived)

  const [bikeId, setBikeId] = useState(searchParams.get('bike') ?? activeBikes[0]?.id ?? '')
  const [taskTypeId, setTaskTypeId] = useState('')
  const [datePerformed, setDatePerformed] = useState(() => new Date().toISOString().slice(0, 10))
  const [mileage, setMileage] = useState('')
  const [performedBy, setPerformedBy] = useState<'diy' | 'shop'>('diy')
  const [notes, setNotes] = useState('')
  const [updateOdometer, setUpdateOdometer] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedBike = activeBikes.find((b) => b.id === bikeId)
  const sortedTaskTypes = [...taskTypes].sort((a, b) => a.name.localeCompare(b.name))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!bikeId || !taskTypeId) {
      setError('Choose a bike and a task type.')
      return
    }

    setSubmitting(true)
    try {
      const mileageValue = mileage ? Number(mileage) : null
      await createLog({
        bike_id: bikeId,
        task_type_id: taskTypeId,
        date_performed: datePerformed,
        mileage_at_service: mileageValue,
        performed_by: performedBy,
        notes: notes.trim() || null,
      })

      if (updateOdometer && mileageValue != null && selectedBike && mileageValue > selectedBike.current_mileage) {
        await updateBike(bikeId, { current_mileage: mileageValue })
      }

      navigate(`/bikes/${bikeId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (activeBikes.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Add a bike first before logging maintenance.
        </p>
        <Link to="/bikes/new" className="mt-3 inline-block text-sm font-medium text-blue-600 dark:text-blue-400">
          Add a bike →
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-2">
        <Link to="/" className="rounded-full p-1 hover:bg-slate-200 dark:hover:bg-slate-800">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Log a Task</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Bike">
          <select value={bikeId} onChange={(e) => setBikeId(e.target.value)} className={inputClass}>
            {activeBikes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Task type">
          <select
            required
            value={taskTypeId}
            onChange={(e) => setTaskTypeId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Select a task…
            </option>
            {sortedTaskTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date performed">
            <input
              type="date"
              required
              value={datePerformed}
              onChange={(e) => setDatePerformed(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={`Mileage${selectedBike?.unit_override ? ` (${selectedBike.unit_override})` : ''}`}>
            <input
              type="number"
              min={0}
              step="0.1"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              placeholder={String(selectedBike?.current_mileage ?? '')}
              className={inputClass}
            />
          </Field>
        </div>

        {mileage && (
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={updateOdometer}
              onChange={(e) => setUpdateOdometer(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700"
            />
            Update bike's current mileage to match
          </label>
        )}

        <Field label="Performed by">
          <div className="flex gap-2">
            {(['diy', 'shop'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPerformedBy(option)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize ${
                  performedBy === option
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                }`}
              >
                {option === 'diy' ? 'DIY' : 'Shop'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Parts used, cost, observations…"
          />
        </Field>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Log task'}
        </button>
      </form>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  )
}
