import { useState, type FormEvent } from 'react'
import { Lock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import type { IntervalType, TaskType } from '../types'

export function TaskTypes() {
  const { taskTypes, createTaskType, updateTaskType, deleteTaskType } = useData()
  const [editing, setEditing] = useState<TaskType | 'new' | null>(null)

  const sorted = [...taskTypes].sort((a, b) => a.name.localeCompare(b.name))

  async function handleDelete(taskType: TaskType) {
    if (!confirm(`Delete "${taskType.name}"? Any tracked tasks using it will lose their reminder.`)) return
    await deleteTaskType(taskType.id)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Task Types</h1>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <p className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                {t.name}
                {t.is_preset && (
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Lock size={11} /> Default
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {describeInterval(t)}
                {t.positions?.length ? ` · ${t.positions.join(' / ')}` : ''}
              </p>
            </div>
            {!t.is_preset && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(t)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(t)}
                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <TaskTypeDialog
          taskType={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            if (editing === 'new') await createTaskType(payload)
            else await updateTaskType(editing.id, payload)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function describeInterval(t: TaskType): string {
  const parts: string[] = []
  if (t.default_interval_miles) parts.push(`every ${t.default_interval_miles.toLocaleString()} mi/km`)
  if (t.default_interval_days) parts.push(`every ${t.default_interval_days} days`)
  return parts.length ? parts.join(' or ') : 'No default interval'
}

const POSITION_PRESETS: { label: string; positions: string[] }[] = [
  { label: 'None', positions: [] },
  { label: 'Front / Rear', positions: ['Front', 'Rear'] },
  { label: 'Fork / Shock', positions: ['Fork', 'Shock'] },
  { label: 'Brake & shift cables', positions: ['Front brake', 'Rear brake', 'Front shift', 'Rear shift'] },
]

function parsePositions(text: string): string[] {
  return [...new Set(text.split(',').map((p) => p.trim()).filter(Boolean))]
}

function TaskTypeDialog({
  taskType,
  onClose,
  onSave,
}: {
  taskType: TaskType | null
  onClose: () => void
  onSave: (payload: {
    name: string
    default_interval_type: IntervalType
    default_interval_miles: number | null
    default_interval_days: number | null
    positions: string[] | null
  }) => void
}) {
  const [positionsText, setPositionsText] = useState(taskType?.positions?.join(', ') ?? '')
  const positions = parsePositions(positionsText)
  const removedPositions = (taskType?.positions ?? []).filter((p) => !positions.includes(p))
  const [name, setName] = useState(taskType?.name ?? '')
  const [miles, setMiles] = useState(taskType?.default_interval_miles != null ? String(taskType.default_interval_miles) : '')
  const [days, setDays] = useState(taskType?.default_interval_days != null ? String(taskType.default_interval_days) : '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    const intervalMiles = miles ? Number(miles) : null
    const intervalDays = days ? Number(days) : null
    const intervalType: IntervalType = intervalMiles && intervalDays ? 'both' : intervalMiles ? 'mileage' : 'time'

    onSave({
      name: name.trim(),
      default_interval_type: intervalType,
      default_interval_miles: intervalMiles,
      default_interval_days: intervalDays,
      positions: positions.length ? positions : null,
    })
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">{taskType ? 'Edit task type' : 'New task type'}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="e.g. Chain replacement"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Default interval (mi/km)
            </span>
            <input
              type="number"
              min={0}
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Default interval (days)
            </span>
            <input
              type="number"
              min={0}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Track separately for (comma-separated, optional)
          </span>
          <input
            value={positionsText}
            onChange={(e) => setPositionsText(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="e.g. Front, Rear"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {POSITION_PRESETS.map((preset) => {
            const selected = preset.positions.join(',') === positions.join(',')
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setPositionsText(preset.positions.join(', '))}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  selected
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
        {removedPositions.length > 0 && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            Removing {removedPositions.join(', ')} stops tracking it on every bike. Its past logs are kept.
          </p>
        )}

        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button type="submit" className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
