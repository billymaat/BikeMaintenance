export type Unit = 'mi' | 'km'
export type IntervalType = 'mileage' | 'time' | 'both'
export type PerformedBy = 'diy' | 'shop'
export type ReminderStatus = 'ok' | 'due_soon' | 'overdue' | 'not_tracked'
export type Theme = 'light' | 'dark' | 'system'

export interface Profile {
  id: string
  unit_preference: Unit
  created_at: string
}

export interface Bike {
  id: string
  user_id: string
  name: string
  bike_type: string
  photo_url: string | null
  current_mileage: number
  unit_override: Unit | null
  notes: string | null
  archived: boolean
  created_at: string
}

export interface TaskType {
  id: string
  user_id: string
  name: string
  default_interval_type: IntervalType
  default_interval_miles: number | null
  default_interval_days: number | null
  /** Parts tracked separately, e.g. ['Front', 'Rear']. Null/empty = single item. */
  positions: string[] | null
  is_preset: boolean
  created_at: string
}

export interface MaintenanceLog {
  id: string
  bike_id: string
  task_type_id: string
  date_performed: string
  mileage_at_service: number | null
  performed_by: PerformedBy
  /** Null means the whole task, which counts towards every position. */
  position: string | null
  part_details: string | null
  notes: string | null
  created_at: string
}

export interface ReminderRule {
  id: string
  bike_id: string
  task_type_id: string
  /** '' when the task type has no positions. */
  position: string
  interval_miles: number | null
  interval_days: number | null
  last_notified_status: ReminderStatus | null
  created_at: string
}

export interface PushSubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export interface TaskStatus {
  taskTypeId: string
  taskTypeName: string
  position: string | null
  status: ReminderStatus
  lastServiceDate: string | null
  lastServiceMileage: number | null
  nextDueMileage: number | null
  nextDueDate: string | null
  milesRemaining: number | null
  daysRemaining: number | null
}
