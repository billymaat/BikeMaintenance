import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
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
    <div className="px-4 pt-6">
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
              <p className="font-medium text-slate-900 dark:text-slate-100">{t.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{describeInterval(t)}</p>
            </div>
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
  }) => void
}) {
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
    })
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 dark:bg-slate-900 sm:rounded-2xl"
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
