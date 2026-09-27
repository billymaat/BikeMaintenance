// Supabase Edge Function: send-reminders
//
// Checks every bike's tracked tasks and sends a Web Push notification when a
// task's status transitions into "due_soon" or "overdue" (only on the
// transition, so users aren't re-notified every run). Meant to be invoked on
// a schedule — see README.md for how to wire up a cron trigger.
//
// Required secrets (set with `supabase secrets set`):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@example.com)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const DUE_SOON_THRESHOLD = 0.1

type ReminderStatus = 'ok' | 'due_soon' | 'overdue' | 'not_tracked'

interface Bike {
  id: string
  user_id: string
  name: string
  current_mileage: number
}

interface TaskType {
  id: string
  name: string
  default_interval_miles: number | null
  default_interval_days: number | null
}

interface ReminderRule {
  id: string
  bike_id: string
  task_type_id: string
  position: string
  interval_miles: number | null
  interval_days: number | null
  last_notified_status: ReminderStatus | null
}

interface MaintenanceLog {
  bike_id: string
  task_type_id: string
  position: string | null
  date_performed: string
  mileage_at_service: number | null
}

function computeStatus(
  bike: Bike,
  intervalMiles: number | null,
  intervalDays: number | null,
  lastLog: MaintenanceLog | undefined,
): ReminderStatus {
  if (!lastLog || (!intervalMiles && !intervalDays)) return 'not_tracked'

  let milesRemaining: number | null = null
  if (intervalMiles && lastLog.mileage_at_service != null) {
    milesRemaining = lastLog.mileage_at_service + intervalMiles - bike.current_mileage
  }

  let daysRemaining: number | null = null
  if (intervalDays) {
    const due = new Date(lastLog.date_performed)
    due.setDate(due.getDate() + intervalDays)
    daysRemaining = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

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

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return new Response('Missing VAPID secrets', { status: 500 })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const [{ data: bikes }, { data: taskTypes }, { data: rules }, { data: logs }, { data: subs }] = await Promise.all([
    supabase.from('bikes').select('id, user_id, name, current_mileage').eq('archived', false),
    supabase.from('task_types').select('id, name, default_interval_miles, default_interval_days'),
    supabase.from('reminder_rules').select('id, bike_id, task_type_id, position, interval_miles, interval_days, last_notified_status'),
    supabase.from('maintenance_logs').select('bike_id, task_type_id, position, date_performed, mileage_at_service'),
    supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth'),
  ])

  const bikesById = new Map((bikes ?? []).map((b: Bike) => [b.id, b]))
  const taskTypesById = new Map((taskTypes ?? []).map((t: TaskType) => [t.id, t]))
  const subsByUser = new Map<string, typeof subs>()
  for (const sub of subs ?? []) {
    const list = subsByUser.get(sub.user_id) ?? []
    list.push(sub)
    subsByUser.set(sub.user_id, list)
  }

  let sent = 0
  let updated = 0

  for (const rule of (rules ?? []) as ReminderRule[]) {
    const bike = bikesById.get(rule.bike_id)
    const taskType = taskTypesById.get(rule.task_type_id)
    if (!bike || !taskType) continue

    // A log without a position covers every position of the task.
    const matchingLogs = (logs ?? []).filter(
      (l: MaintenanceLog) =>
        l.bike_id === rule.bike_id &&
        l.task_type_id === rule.task_type_id &&
        (!rule.position || !l.position || l.position === rule.position),
    )
    matchingLogs.sort((a, b) => new Date(b.date_performed).getTime() - new Date(a.date_performed).getTime())
    const lastLog = matchingLogs[0]

    const intervalMiles = rule.interval_miles ?? taskType.default_interval_miles
    const intervalDays = rule.interval_days ?? taskType.default_interval_days
    const status = computeStatus(bike, intervalMiles, intervalDays, lastLog)

    if (status === rule.last_notified_status) continue

    if (status === 'due_soon' || status === 'overdue') {
      const userSubs = subsByUser.get(bike.user_id) ?? []
      const label = rule.position ? `${taskType.name} (${rule.position})` : taskType.name
      const title = status === 'overdue' ? `${label} overdue` : `${label} due soon`
      const body = `${bike.name}: ${label} is ${status === 'overdue' ? 'overdue' : 'coming up'}.`

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body, url: `/bikes/${bike.id}`, tag: rule.id }),
          )
          sent++
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          } else {
            console.error('push send failed', err)
          }
        }
      }
    }

    await supabase.from('reminder_rules').update({ last_notified_status: status }).eq('id', rule.id)
    updated++
  }

  return new Response(JSON.stringify({ ok: true, sent, updated }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
