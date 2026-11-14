import { useCallback, useEffect, useState } from 'react'
import { friendlyError, supabase } from './supabase'
import type { DailyRecord, Menu } from './types'

const MENU_COLS = 'id, outlet_id, name, price, hpp, unit, is_active, created_at'

export async function fetchMenus(outletId: string, includeInactive = false, withPhoto = false): Promise<Menu[]> {
  let q = supabase.from('menus').select(withPhoto ? `${MENU_COLS}, photo_url` : MENU_COLS).eq('outlet_id', outletId).order('created_at')
  if (!includeInactive) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw new Error(friendlyError(error))
  return (data ?? []) as unknown as Menu[]
}

/** Ambil catatan harian dalam rentang tanggal (inklusif), dengan paginasi agar tidak terpotong 1000 baris. */
export async function fetchRecords(outletId: string, from: string, to: string): Promise<DailyRecord[]> {
  const pageSize = 1000
  const all: DailyRecord[] = []
  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase
      .from('daily_records')
      .select('outlet_id, menu_id, record_date, produced, sold, leftover')
      .eq('outlet_id', outletId)
      .gte('record_date', from)
      .lte('record_date', to)
      .order('record_date')
      .range(page * pageSize, page * pageSize + pageSize - 1)
    if (error) throw new Error(friendlyError(error))
    all.push(...((data ?? []) as DailyRecord[]))
    if (!data || data.length < pageSize) break
  }
  return all
}

/** Hook sederhana untuk memuat data async dengan state loading/error. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)
  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await run())
    } catch (e) {
      setError(e instanceof Error ? e.message : friendlyError(e))
    } finally {
      setLoading(false)
    }
  }, [run])
  useEffect(() => {
    reload()
  }, [reload])
  return { data, error, loading, reload, setData }
}

export function downloadText(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
