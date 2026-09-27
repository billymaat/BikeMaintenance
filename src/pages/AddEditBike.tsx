import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import type { Unit } from '../types'

const BIKE_TYPES = ['Road', 'Gravel', 'Mountain', 'Hybrid', 'E-bike', 'Commuter', 'Other']

export function AddEditBike() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { bikes, createBike, updateBike, deleteBike } = useData()
  const { profile } = useAuth()

  const existing = id ? bikes.find((b) => b.id === id) : undefined
  const isEdit = Boolean(existing)

  const [name, setName] = useState(existing?.name ?? '')
  const [bikeType, setBikeType] = useState(existing?.bike_type ?? BIKE_TYPES[0])
  const [currentMileage, setCurrentMileage] = useState(String(existing?.current_mileage ?? 0))
  const [unitOverride, setUnitOverride] = useState<Unit | ''>(existing?.unit_override ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [photoUrl, setPhotoUrl] = useState(existing?.photo_url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const payload = {
        name: name.trim(),
        bike_type: bikeType,
        current_mileage: Number(currentMileage) || 0,
        unit_override: unitOverride || null,
        notes: notes.trim() || null,
        photo_url: photoUrl.trim() || null,
      }

      if (isEdit && existing) {
        await updateBike(existing.id, payload)
        navigate(`/bikes/${existing.id}`)
      } else {
        const bike = await createBike(payload)
        navigate(`/bikes/${bike.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleArchiveToggle() {
    if (!existing) return
    await updateBike(existing.id, { archived: !existing.archived })
    navigate('/')
  }

  async function handleDelete() {
    if (!existing) return
    if (!confirm(`Permanently delete ${existing.name}? This will remove all its maintenance history.`)) return
    await deleteBike(existing.id)
    navigate('/')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-2">
        <Link to={isEdit ? `/bikes/${id}` : '/'} className="rounded-full p-1 hover:bg-slate-200 dark:hover:bg-slate-800">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {isEdit ? 'Edit Bike' : 'Add Bike'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="e.g. Gravel Beast"
          />
        </Field>

        <Field label="Type">
          <select value={bikeType} onChange={(e) => setBikeType(e.target.value)} className={inputClass}>
            {BIKE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Photo URL (optional)">
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className={inputClass}
            placeholder="https://…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Current mileage">
            <input
              type="number"
              min={0}
              step="0.1"
              required
              value={currentMileage}
              onChange={(e) => setCurrentMileage(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Unit">
            <select
              value={unitOverride}
              onChange={(e) => setUnitOverride(e.target.value as Unit | '')}
              className={inputClass}
            >
              <option value="">Account default ({profile?.unit_preference ?? 'mi'})</option>
              <option value="mi">Miles</option>
              <option value="km">Kilometers</option>
            </select>
          </Field>
        </div>

        <Field label="Notes (specs, tire pressure, reminders to self)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className={inputClass}
            placeholder="Freeform notes…"
          />
        </Field>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add bike'}
        </button>
      </form>

      {isEdit && existing && (
        <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            onClick={handleArchiveToggle}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {existing.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            {existing.archived ? 'Restore bike' : 'Archive bike'}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-300 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <Trash2 size={16} /> Delete bike permanently
          </button>
        </div>
      )}
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
