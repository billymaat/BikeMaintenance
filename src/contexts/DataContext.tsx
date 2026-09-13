import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Bike, MaintenanceLog, ReminderRule, TaskType } from '../types'

interface DataContextValue {
  bikes: Bike[]
  taskTypes: TaskType[]
  logs: MaintenanceLog[]
  rules: ReminderRule[]
  loading: boolean
  refresh: () => Promise<void>

  createBike: (bike: Partial<Bike>) => Promise<Bike>
  updateBike: (id: string, patch: Partial<Bike>) => Promise<void>
  deleteBike: (id: string) => Promise<void>

  createTaskType: (taskType: Partial<TaskType>) => Promise<TaskType>
  updateTaskType: (id: string, patch: Partial<TaskType>) => Promise<void>
  deleteTaskType: (id: string) => Promise<void>

  createLog: (log: Partial<MaintenanceLog>) => Promise<MaintenanceLog>
  updateLog: (id: string, patch: Partial<MaintenanceLog>) => Promise<void>
  deleteLog: (id: string) => Promise<void>

  upsertRule: (rule: Partial<ReminderRule> & { bike_id: string; task_type_id: string }) => Promise<void>
  deleteRule: (id: string) => Promise<void>
}

const DataContext = createContext<DataContextValue | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [bikes, setBikes] = useState<Bike[]>([])
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [rules, setRules] = useState<ReminderRule[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setBikes([])
      setTaskTypes([])
      setLogs([])
      setRules([])
      setLoading(false)
      return
    }

    setLoading(true)
    const [bikesRes, taskTypesRes, logsRes, rulesRes] = await Promise.all([
      supabase.from('bikes').select('*').order('created_at', { ascending: true }),
      supabase.from('task_types').select('*').order('name', { ascending: true }),
      supabase.from('maintenance_logs').select('*').order('date_performed', { ascending: false }),
      supabase.from('reminder_rules').select('*'),
    ])

    setBikes(bikesRes.data ?? [])
    setTaskTypes(taskTypesRes.data ?? [])
    setLogs(logsRes.data ?? [])
    setRules(rulesRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function createBike(bike: Partial<Bike>): Promise<Bike> {
    if (!user) throw new Error('Not signed in')
    const { data, error } = await supabase
      .from('bikes')
      .insert({ ...bike, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    await refresh()
    return data
  }

  async function updateBike(id: string, patch: Partial<Bike>) {
    const { error } = await supabase.from('bikes').update(patch).eq('id', id)
    if (error) throw error
    await refresh()
  }

  async function deleteBike(id: string) {
    const { error } = await supabase.from('bikes').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  async function createTaskType(taskType: Partial<TaskType>): Promise<TaskType> {
    if (!user) throw new Error('Not signed in')
    const { data, error } = await supabase
      .from('task_types')
      .insert({ ...taskType, user_id: user.id, is_preset: false })
      .select()
      .single()
    if (error) throw error
    await refresh()
    return data
  }

  async function updateTaskType(id: string, patch: Partial<TaskType>) {
    const { error } = await supabase.from('task_types').update(patch).eq('id', id)
    if (error) throw error
    await refresh()
  }

  async function deleteTaskType(id: string) {
    const { error } = await supabase.from('task_types').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  async function createLog(log: Partial<MaintenanceLog>): Promise<MaintenanceLog> {
    const { data, error } = await supabase.from('maintenance_logs').insert(log).select().single()
    if (error) throw error

    if (log.bike_id && log.task_type_id) {
      const existingRule = rules.find((r) => r.bike_id === log.bike_id && r.task_type_id === log.task_type_id)
      if (!existingRule) {
        const taskType = taskTypes.find((t) => t.id === log.task_type_id)
        if (taskType) {
          await supabase.from('reminder_rules').insert({
            bike_id: log.bike_id,
            task_type_id: log.task_type_id,
            interval_miles: taskType.default_interval_miles,
            interval_days: taskType.default_interval_days,
          })
        }
      }
    }

    await refresh()
    return data
  }

  async function updateLog(id: string, patch: Partial<MaintenanceLog>) {
    const { error } = await supabase.from('maintenance_logs').update(patch).eq('id', id)
    if (error) throw error
    await refresh()
  }

  async function deleteLog(id: string) {
    const { error } = await supabase.from('maintenance_logs').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  async function upsertRule(rule: Partial<ReminderRule> & { bike_id: string; task_type_id: string }) {
    const { error } = await supabase
      .from('reminder_rules')
      .upsert(rule, { onConflict: 'bike_id,task_type_id' })
    if (error) throw error
    await refresh()
  }

  async function deleteRule(id: string) {
    const { error } = await supabase.from('reminder_rules').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  return (
    <DataContext.Provider
      value={{
        bikes,
        taskTypes,
        logs,
        rules,
        loading,
        refresh,
        createBike,
        updateBike,
        deleteBike,
        createTaskType,
        updateTaskType,
        deleteTaskType,
        createLog,
        updateLog,
        deleteLog,
        upsertRule,
        deleteRule,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
