'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const USER_ID = 'default' // Single user app — change this if you add auth later

export function useTracker() {
  const [trades, setTrades] = useState([])
  const [gameplan, setGameplan] = useState({})
  const [checklists, setChecklists] = useState({})
  const [dayTypes, setDayTypes] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const today = () => new Date().toISOString().slice(0, 10)

  // ── LOAD ALL DATA ──────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tradesRes, gpRes, clRes, dtRes] = await Promise.all([
        supabase.from('trades').select('*').eq('user_id', USER_ID).order('date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('game_plans').select('*').eq('user_id', USER_ID),
        supabase.from('checklists').select('*').eq('user_id', USER_ID),
        supabase.from('day_types').select('*').eq('user_id', USER_ID),
      ])

      if (tradesRes.error) throw tradesRes.error
      if (gpRes.error) throw gpRes.error
      if (clRes.error) throw clRes.error
      if (dtRes.error) throw dtRes.error

      // Normalize trade data (snake_case → camelCase)
      const normalized = (tradesRes.data || []).map(normalizeTrade)
      setTrades(normalized)

      // Game plans keyed by date
      const gpMap = {}
      ;(gpRes.data || []).forEach(g => { gpMap[g.date] = g })
      setGameplan(gpMap)

      // Checklists keyed by date
      const clMap = {}
      ;(clRes.data || []).forEach(c => { clMap[c.date] = c.data || {} })
      setChecklists(clMap)

      // Day types keyed by date
      const dtMap = {}
      ;(dtRes.data || []).forEach(d => { dtMap[d.date] = d.type })
      setDayTypes(dtMap)

    } catch (err) {
      console.error('Load error:', err)
      setError('Failed to load data. Check your Supabase connection.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── NORMALIZE ──────────────────────────────────────────────
  function normalizeTrade(t) {
    return {
      id: t.id,
      date: t.date,
      time: t.time,
      dir: t.dir,
      setup: t.setup,
      dayType: t.day_type,
      outcome: t.outcome,
      entry: t.entry,
      stop: t.stop_price,
      exit: t.exit_price,
      shares: t.shares,
      pnl: t.pnl,
      rr: t.rr,
      rules: t.rules,
      emotion: t.emotion,
      good: t.good,
      improve: t.improve,
      createdAt: t.created_at,
    }
  }

  function denormalizeTrade(t) {
    return {
      id: t.id,
      user_id: USER_ID,
      date: t.date || null,
      time: t.time || null,
      dir: t.dir || null,
      setup: t.setup || null,
      day_type: t.dayType || null,
      outcome: t.outcome || null,
      entry: t.entry !== '' ? Number(t.entry) : null,
      stop_price: t.stop !== '' ? Number(t.stop) : null,
      exit_price: t.exit !== '' ? Number(t.exit) : null,
      shares: t.shares !== '' ? Number(t.shares) : null,
      pnl: t.pnl !== '' && t.pnl !== null && t.pnl !== undefined ? Number(t.pnl) : null,
      rr: t.rr || null,
      rules: t.rules || null,
      emotion: t.emotion || null,
      good: t.good || null,
      improve: t.improve || null,
      updated_at: new Date().toISOString(),
    }
  }

  // ── TRADE OPS ──────────────────────────────────────────────
  const saveTrade = async (tradeData) => {
    setSaving(true)
    try {
      const isNew = !trades.find(t => t.id === tradeData.id)
      const row = denormalizeTrade(tradeData)

      const { data, error } = await supabase
        .from('trades')
        .upsert(row, { onConflict: 'id' })
        .select()

      if (error) throw error

      const saved = normalizeTrade(data[0])
      if (isNew) {
        setTrades(prev => [saved, ...prev])
      } else {
        setTrades(prev => prev.map(t => t.id === saved.id ? saved : t))
      }
      return { success: true }
    } catch (err) {
      console.error('Save trade error:', err)
      return { success: false, error: err.message }
    } finally {
      setSaving(false)
    }
  }

  const deleteTrade = async (id) => {
    setSaving(true)
    try {
      const { error } = await supabase.from('trades').delete().eq('id', id).eq('user_id', USER_ID)
      if (error) throw error
      setTrades(prev => prev.filter(t => t.id !== id))
      return { success: true }
    } catch (err) {
      console.error('Delete error:', err)
      return { success: false, error: err.message }
    } finally {
      setSaving(false)
    }
  }

  // ── GAME PLAN ──────────────────────────────────────────────
  const saveGameplan = async (date, field, value) => {
    const existing = gameplan[date] || {}
    const updated = { ...existing, [field]: value }
    setGameplan(prev => ({ ...prev, [date]: updated }))

    try {
      await supabase.from('game_plans').upsert({
        user_id: USER_ID,
        date,
        bias: updated.bias || null,
        account: updated.account ? Number(updated.account) : null,
        maxloss: updated.maxloss ? Number(updated.maxloss) : null,
        level: updated.level || null,
        setups: updated.setups || null,
        notes: updated.notes || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' })
    } catch (err) {
      console.error('Gameplan save error:', err)
    }
  }

  // ── CHECKLISTS ──────────────────────────────────────────────
  const toggleChecklist = async (date, group, idx) => {
    const existing = checklists[date] || {}
    const groupData = existing[group] || {}
    const updated = {
      ...existing,
      [group]: { ...groupData, [idx]: !groupData[idx] }
    }
    setChecklists(prev => ({ ...prev, [date]: updated }))

    try {
      await supabase.from('checklists').upsert({
        user_id: USER_ID,
        date,
        data: updated,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' })
    } catch (err) {
      console.error('Checklist save error:', err)
    }
  }

  const resetChecklist = async (date) => {
    setChecklists(prev => ({ ...prev, [date]: {} }))
    try {
      await supabase.from('checklists').upsert({
        user_id: USER_ID, date, data: {}, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' })
    } catch (err) {
      console.error('Reset error:', err)
    }
  }

  // ── DAY TYPE ──────────────────────────────────────────────
  const saveDayType = async (date, type) => {
    setDayTypes(prev => ({ ...prev, [date]: type }))
    try {
      await supabase.from('day_types').upsert({
        user_id: USER_ID, date, type,
      }, { onConflict: 'user_id,date' })
    } catch (err) {
      console.error('Day type save error:', err)
    }
  }

  // ── EXPORT / IMPORT ──────────────────────────────────────────
  const exportBackup = () => {
    const data = { trades, gameplan, checklists, dayTypes, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `spy-tracker-backup-${today()}.json`
    a.click()
  }

  const exportCSV = () => {
    const headers = ['Date','Time','Dir','Setup','DayType','Outcome','Entry','Stop','Exit','Shares','PnL','RR','Rules','Emotion','Good','Improve']
    const rows = trades.map(t => [t.date,t.time,t.dir,t.setup,t.dayType,t.outcome,t.entry,t.stop,t.exit,t.shares,t.pnl,t.rr,t.rules,t.emotion,`"${(t.good||'').replace(/"/g,"'")}"`,`"${(t.improve||'').replace(/"/g,"'")}"`].join(','))
    const blob = new Blob([[headers.join(','),...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `spy-trades-${today()}.csv`
    a.click()
  }

  const importBackup = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result)
          if (!data.trades) { resolve({ success: false, error: 'Invalid backup file' }); return }
          // Upsert all trades
          const rows = data.trades.map(denormalizeTrade)
          const { error } = await supabase.from('trades').upsert(rows, { onConflict: 'id' })
          if (error) throw error
          await loadAll()
          resolve({ success: true, count: data.trades.length })
        } catch (err) {
          resolve({ success: false, error: err.message })
        }
      }
      reader.readAsText(file)
    })
  }

  return {
    trades, gameplan, checklists, dayTypes,
    loading, saving, error,
    saveTrade, deleteTrade,
    saveGameplan, toggleChecklist, resetChecklist, saveDayType,
    exportBackup, exportCSV, importBackup,
    reload: loadAll,
  }
}
