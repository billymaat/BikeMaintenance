import type { Bike, MaintenanceLog, ReminderRule, TaskStatus, TaskType } from '../types'

const DUE_SOON_THRESHOLD = 0.1 // within 10% of interval counts as "due soon"

interface ComputeArgs {
  bike: Bike
  taskType: TaskType
  rule: ReminderRule | undefined
  logs: MaintenanceLog[]
  now?: Date
}

export function hasPositions(taskType: TaskType): boolean {
  return (taskType.positions?.length ?? 0) > 0
}

/** "Tire replacement · Rear", or just the task name when there's no position. */
export function taskLabel(taskTypeName: string, position: string | null | undefined): string {
  return position ? `${taskTypeName} · ${position}` : taskTypeName
}

/** Whether a log counts towards a position. Logs without a position cover every position. */
export function logCoversPosition(log: MaintenanceLog, position: string | null): boolean {
  return !position || !log.position || log.position === position
}

/**
 * Computes the status of a single (bike, task type, position) from the most
 * recent matching log entry plus the effective interval (rule override,
 * falling back to the task type default).
 */
export function computeTaskStatus({ bike, taskType, rule, logs, now = new Date() }: ComputeArgs): TaskStatus {
  const intervalMiles = rule?.interval_miles ?? taskType.default_interval_miles ?? null
  const intervalDays = rule?.interval_days ?? taskType.default_interval_days ?? null
  const position = rule?.position || null

  const matchingLogs = logs
    .filter((log) => log.task_type_id === taskType.id && logCoversPosition(log, position))
    .sort((a, b) => new Date(b.date_performed).getTime() - new Date(a.date_performed).getTime())

  const lastLog = matchingLogs[0]

  const base: TaskStatus = {
    taskTypeId: taskType.id,
    taskTypeName: taskType.name,
    position,
    status: 'not_tracked',
    lastServiceDate: lastLog?.date_performed ?? null,
    lastServiceMileage: lastLog?.mileage_at_service ?? null,
    nextDueMileage: null,
    nextDueDate: null,
    milesRemaining: null,
    daysRemaining: null,
  }

  if (!lastLog || (!intervalMiles && !intervalDays)) {
    return base
  }

  let nextDueMileage: number | null = null
  let milesRemaining: number | null = null
  if (intervalMiles && lastLog.mileage_at_service != null) {
    nextDueMileage = lastLog.mileage_at_service + intervalMiles
    milesRemaining = nextDueMileage - bike.current_mileage
  }

  let nextDueDate: string | null = null
  let daysRemaining: number | null = null
  if (intervalDays) {
    const due = new Date(lastLog.date_performed)
    due.setDate(due.getDate() + intervalDays)
    nextDueDate = due.toISOString().slice(0, 10)
    daysRemaining = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  const status = deriveStatus({ intervalMiles, milesRemaining, intervalDays, daysRemaining })

  return {
    ...base,
    status,
    nextDueMileage,
    nextDueDate,
    milesRemaining,
    daysRemaining,
  }
}

function deriveStatus({
  intervalMiles,
  milesRemaining,
  intervalDays,
  daysRemaining,
}: {
  intervalMiles: number | null
  milesRemaining: number | null
  intervalDays: number | null
  daysRemaining: number | null
}): TaskStatus['status'] {
  const mileageOverdue = intervalMiles != null && milesRemaining != null && milesRemaining <= 0
  const timeOverdue = intervalDays != null && daysRemaining != null && daysRemaining <= 0
  if (mileageOverdue || timeOverdue) return 'overdue'

  const mileageDueSoon =
    intervalMiles != null && milesRemaining != null && milesRemaining <= intervalMiles * DUE_SOON_THRESHOLD
  const timeDueSoon =
    intervalDays != null && daysRemaining != null && daysRemaining <= intervalDays * DUE_SOON_THRESHOLD
  if (mileageDueSoon || timeDueSoon) return 'due_soon'

  return 'ok'
}

/** Computes statuses for every (task type, position) a bike has a reminder rule for. */
export function computeBikeStatuses(args: {
  bike: Bike
  taskTypes: TaskType[]
  rules: ReminderRule[]
  logs: MaintenanceLog[]
  now?: Date
}): TaskStatus[] {
  const { bike, taskTypes, rules, logs, now } = args
  const bikeRules = rules.filter((r) => r.bike_id === bike.id)

  return bikeRules
    .map((rule) => {
      const taskType = taskTypes.find((t) => t.id === rule.task_type_id)
      if (!taskType) return null
      return computeTaskStatus({ bike, taskType, rule, logs: logs.filter((l) => l.bike_id === bike.id), now })
    })
    .filter((s): s is TaskStatus => s !== null)
}

export function summarizeStatuses(statuses: TaskStatus[]): { overdue: number; dueSoon: number; ok: number } {
  return statuses.reduce(
    (acc, s) => {
      if (s.status === 'overdue') acc.overdue += 1
      else if (s.status === 'due_soon') acc.dueSoon += 1
      else if (s.status === 'ok') acc.ok += 1
      return acc
    },
    { overdue: 0, dueSoon: 0, ok: 0 },
  )
}
