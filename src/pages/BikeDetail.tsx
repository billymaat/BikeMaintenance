import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Gauge, Plus, Search, X } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { computeTaskStatus } from '../lib/reminders'
import { StatusBadge } from '../components/StatusBadge'
import type { TaskType } from '../types'

export function BikeDetail() {
  const { id } = useParams()
  const { bikes, taskTypes, logs, rules, updateBike, upsertRule } = useData()

  const bike = bikes.find((b) => b.id === id)
  const [showMileageForm, setShowMileageForm] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingRuleTaskTypeId, setEditingRuleTaskTypeId] = useState<string | null>(null)

  const bikeLogs = useMemo(() => logs.filter((l) => l.bike_id === id), [logs, id])
  const bikeRules = useMemo(() => rules.filter((r) => r.bike_id === id), [rules, id])

  if (!bike) return <Navigate to="/" replace />

  const unit = bike.unit_override ?? 'mi'
  const trackedTaskTypeIds = new Set(bikeRules.map((r) => r.task_type_id))
  const untrackedTaskTypes = taskTypes.filter((t) => !trackedTaskTypeIds.has(t.id))

  const taskStatuses = bikeRules
    .map((rule) => {
      const taskType = taskTypes.find((t) => t.id === rule.task_type_id)
      if (!taskType) return null
      return { rule, taskType, status: computeTaskStatus({ bike, taskType, rule, logs: bikeLogs }) }
    })
    .filter((x): x is { rule: (typeof bikeRules)[number]; taskType: TaskType; status: ReturnType<typeof computeTaskStatus> } => x !== null)
    .sort((a, b) => {
      const order = { overdue: 0, due_soon: 1, ok: 2, not_tracked: 3 }
      return order[a.status.status] - order[b.status.status]
    })

  return (
    <div className="px-4 pt-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="rounded-full p-1 hover:bg-slate-200 dark:hover:bg-slate-800">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{bike.name}</h1>
        </div>
        <Link to={`/bikes/${bike.id}/edit`} className="rounded-full p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800">
          <Pencil size={18} />
        </Link>
      </div>

      {bike.archived && (
        <div className="mb-4 rounded-lg bg-slate-200 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          This bike is archived
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{bike.bike_type}</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {bike.current_mileage.toLocaleString()} <span className="text-base font-normal">{unit}</span>
            </p>
          </div>
          <button
            onClick={() => setShowMileageForm(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Gauge size={16} /> Update
          </button>
        </div>

        {bike.notes && (
          <p className="mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
            {bike.notes}
          </p>
        )}
      </div>

      {showMileageForm && (
        <MileageDialog
          currentMileage={bike.current_mileage}
          unit={unit}
          onClose={() => setShowMileageForm(false)}
          onSave={async (value) => {
            await updateBike(bike.id, { current_mileage: value })
            setShowMileageForm(false)
          }}
        />
      )}

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium text-slate-900 dark:text-slate-100">Tracked tasks</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400"
            >
              <Plus size={16} /> Track task
            </button>
            <Link to={`/log?bike=${bike.id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Log task
            </Link>
          </div>
        </div>

        {taskStatuses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No tasks tracked yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {taskStatuses.map(({ rule, taskType, status }) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{taskType.name}</p>
                    <StatusBadge status={status.status} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {status.lastServiceDate
                      ? `Last: ${status.lastServiceDate}${status.lastServiceMileage != null ? ` at ${status.lastServiceMileage.toLocaleString()} ${unit}` : ''}`
                      : 'Never logged'}
                    {status.nextDueMileage != null && ` · Due at ${status.nextDueMileage.toLocaleString()} ${unit}`}
                    {status.nextDueDate && ` · Due ${status.nextDueDate}`}
                  </p>
                </div>
                <button
                  onClick={() => setEditingRuleTaskTypeId(taskType.id)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <Pencil size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddTask && (
        <TrackTaskDialog
          options={untrackedTaskTypes}
          onClose={() => setShowAddTask(false)}
          onSave={async (taskType) => {
            await upsertRule({
              bike_id: bike.id,
              task_type_id: taskType.id,
              interval_miles: taskType.default_interval_miles,
              interval_days: taskType.default_interval_days,
            })
            setShowAddTask(false)
          }}
        />
      )}

      {editingRuleTaskTypeId &&
        (() => {
          const entry = taskStatuses.find((t) => t.taskType.id === editingRuleTaskTypeId)
          if (!entry) return null
          return (
            <EditIntervalDialog
              taskTypeName={entry.taskType.name}
              intervalMiles={entry.rule.interval_miles}
              intervalDays={entry.rule.interval_days}
              unit={unit}
              onClose={() => setEditingRuleTaskTypeId(null)}
              onSave={async (intervalMiles, intervalDays) => {
                await upsertRule({
                  bike_id: bike.id,
                  task_type_id: entry.taskType.id,
                  interval_miles: intervalMiles,
                  interval_days: intervalDays,
                })
                setEditingRuleTaskTypeId(null)
              }}
            />
          )
        })()}

      <History bikeId={bike.id} unit={unit} />
    </div>
  )
}

function MileageDialog({
  currentMileage,
  unit,
  onClose,
  onSave,
}: {
  currentMileage: number
  unit: string
  onClose: () => void
  onSave: (value: number) => void
}) {
  const [value, setValue] = useState(String(currentMileage))
  return (
    <Dialog title="Update mileage" onClose={onClose}>
      <input
        type="number"
        min={0}
        step="0.1"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current odometer, in {unit}</p>
      <DialogActions onClose={onClose} onSave={() => onSave(Number(value) || 0)} />
    </Dialog>
  )
}

function TrackTaskDialog({
  options,
  onClose,
  onSave,
}: {
  options: TaskType[]
  onClose: () => void
  onSave: (taskType: TaskType) => void
}) {
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? '')
  const selected = options.find((t) => t.id === selectedId)

  return (
    <Dialog title="Track a task" onClose={onClose}>
      {options.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every task type is already tracked on this bike.
        </p>
      ) : (
        <>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {options.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <DialogActions onClose={onClose} onSave={() => selected && onSave(selected)} disabled={!selected} />
        </>
      )}
    </Dialog>
  )
}

function EditIntervalDialog({
  taskTypeName,
  intervalMiles,
  intervalDays,
  unit,
  onClose,
  onSave,
}: {
  taskTypeName: string
  intervalMiles: number | null
  intervalDays: number | null
  unit: string
  onClose: () => void
  onSave: (miles: number | null, days: number | null) => void
}) {
  const [miles, setMiles] = useState(intervalMiles != null ? String(intervalMiles) : '')
  const [days, setDays] = useState(intervalDays != null ? String(intervalDays) : '')

  return (
    <Dialog title={`${taskTypeName} interval`} onClose={onClose}>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Every N {unit}
        </span>
        <input
          type="number"
          min={0}
          value={miles}
          onChange={(e) => setMiles(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Every N days</span>
        <input
          type="number"
          min={0}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <DialogActions
        onClose={onClose}
        onSave={() => onSave(miles ? Number(miles) : null, days ? Number(days) : null)}
      />
    </Dialog>
  )
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 dark:bg-slate-900 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function DialogActions({
  onClose,
  onSave,
  disabled,
}: {
  onClose: () => void
  onSave: () => void
  disabled?: boolean
}) {
  return (
    <div className="mt-4 flex gap-2">
      <button
        onClick={onClose}
        className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={disabled}
        className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Save
      </button>
    </div>
  )
}

function History({ bikeId, unit }: { bikeId: string; unit: string }) {
  const { logs, taskTypes, deleteLog } = useData()
  const [search, setSearch] = useState('')
  const [taskTypeFilter, setTaskTypeFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const bikeLogs = logs.filter((l) => l.bike_id === bikeId)

  const filtered = bikeLogs.filter((log) => {
    if (taskTypeFilter && log.task_type_id !== taskTypeFilter) return false
    if (fromDate && log.date_performed < fromDate) return false
    if (toDate && log.date_performed > toDate) return false
    if (search) {
      const taskType = taskTypes.find((t) => t.id === log.task_type_id)
      const haystack = `${taskType?.name ?? ''} ${log.notes ?? ''}`.toLowerCase()
      if (!haystack.includes(search.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="mt-6">
      <h2 className="mb-2 font-medium text-slate-900 dark:text-slate-100">History</h2>

      <div className="mb-3 flex flex-col gap-2">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes or task…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select
            value={taskTypeFilter}
            onChange={(e) => setTaskTypeFilter(e.target.value)}
            className="col-span-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">All tasks</option>
            {taskTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No matching history.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((log) => {
            const taskType = taskTypes.find((t) => t.id === log.task_type_id)
            return (
              <div
                key={log.id}
                className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {taskType?.name ?? 'Unknown task'}
                  </p>
                  <button
                    onClick={() => confirm('Delete this log entry?') && deleteLog(log.id)}
                    className="text-xs text-red-600 hover:underline dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {log.date_performed}
                  {log.mileage_at_service != null && ` · ${log.mileage_at_service.toLocaleString()} ${unit}`}
                  {` · ${log.performed_by === 'diy' ? 'DIY' : 'Shop'}`}
                </p>
                {log.notes && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{log.notes}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
