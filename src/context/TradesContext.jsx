import { createContext, useContext, useState, useEffect } from 'react'

// trades: { "YYYY-MM-DD": [ { id, ticker, grossProfit, grossLoss, fees }, ... ] }

const TradesContext = createContext(null)

const ACCOUNTS_KEY = 'pnl_accounts'
const CURRENT_ACCOUNT_KEY = 'pnl_current_account'

function tradesKey(accountId) { return `pnl_journal_trades_${accountId}` }
function notesKey(accountId)  { return `pnl_journal_notes_${accountId}` }

function migrateOldData() {
  // One-time migration: move legacy single-account keys → account-namespaced keys
  const old = localStorage.getItem('pnl_journal_trades')
  const oldN = localStorage.getItem('pnl_journal_notes')
  if (old  !== null) { localStorage.setItem(tradesKey('default'), old);  localStorage.removeItem('pnl_journal_trades') }
  if (oldN !== null) { localStorage.setItem(notesKey('default'),  oldN); localStorage.removeItem('pnl_journal_notes') }
}

function loadJson(key, fallback) {
  try {
    const s = localStorage.getItem(key)
    return s ? JSON.parse(s) : fallback
  } catch { return fallback }
}

export function TradesProvider({ children }) {
  const [accounts, setAccounts] = useState(() => {
    const stored = localStorage.getItem(ACCOUNTS_KEY)
    if (stored) return loadJson(ACCOUNTS_KEY, [{ id: 'default', name: 'Default' }])
    migrateOldData()
    return [{ id: 'default', name: 'Default' }]
  })

  const [currentAccountId, setCurrentAccountId] = useState(() =>
    localStorage.getItem(CURRENT_ACCOUNT_KEY) || 'default'
  )

  const [trades, setTrades] = useState(() =>
    loadJson(tradesKey(localStorage.getItem(CURRENT_ACCOUNT_KEY) || 'default'), {})
  )

  const [notes, setNotes] = useState(() =>
    loadJson(notesKey(localStorage.getItem(CURRENT_ACCOUNT_KEY) || 'default'), {})
  )

  useEffect(() => { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)) }, [accounts])
  useEffect(() => { localStorage.setItem(CURRENT_ACCOUNT_KEY, currentAccountId) }, [currentAccountId])
  useEffect(() => { localStorage.setItem(tradesKey(currentAccountId), JSON.stringify(trades)) }, [trades, currentAccountId])
  useEffect(() => { localStorage.setItem(notesKey(currentAccountId),  JSON.stringify(notes))  }, [notes,  currentAccountId])

  // ── Account management ──────────────────────────────────────────────────────

  function switchAccount(id) {
    setTrades(loadJson(tradesKey(id), {}))
    setNotes(loadJson(notesKey(id), {}))
    setCurrentAccountId(id)
  }

  function createAccount(name) {
    const id = `account_${Date.now()}`
    setAccounts(prev => [...prev, { id, name: name.trim() || 'New Account' }])
    switchAccount(id)
    return id
  }

  function renameAccount(id, name) {
    const trimmed = name.trim()
    if (!trimmed) return
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, name: trimmed } : a))
  }

  function deleteAccount(id) {
    const remaining = accounts.filter(a => a.id !== id)
    if (remaining.length === 0) return
    setAccounts(remaining)
    localStorage.removeItem(tradesKey(id))
    localStorage.removeItem(notesKey(id))
    if (id === currentAccountId) switchAccount(remaining[0].id)
  }

  // ── Notes ───────────────────────────────────────────────────────────────────

  function saveNote(monthKey, text) {
    setNotes(prev => {
      const next = { ...prev }
      if (!text.trim()) delete next[monthKey]
      else next[monthKey] = text
      return next
    })
  }

  function getNote(monthKey) { return notes[monthKey] || '' }

  // ── Trades ──────────────────────────────────────────────────────────────────

  function saveDayTrades(dateKey, dayTrades) {
    setTrades(prev => {
      const next = { ...prev }
      if (!dayTrades || dayTrades.length === 0) delete next[dateKey]
      else next[dateKey] = dayTrades
      return next
    })
  }

  function getDayTrades(dateKey) { return trades[dateKey] || [] }

  function getDayNet(dateKey) {
    return (trades[dateKey] || []).reduce((sum, t) => {
      return sum + (parseFloat(t.grossProfit) || 0) - (parseFloat(t.grossLoss) || 0) - (parseFloat(t.fees) || 0)
    }, 0)
  }

  function getMonthSummary(year, month) {
    let totalNet = 0, totalGrossProfit = 0, totalGrossLoss = 0, totalFees = 0, tradeDays = 0
    Object.keys(trades).forEach(key => {
      const d = new Date(key + 'T00:00:00')
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dayTrades = trades[key] || []
        dayTrades.forEach(t => {
          const gp = parseFloat(t.grossProfit) || 0
          const gl = parseFloat(t.grossLoss) || 0
          const f  = parseFloat(t.fees)        || 0
          totalGrossProfit += gp; totalGrossLoss += gl; totalFees += f; totalNet += gp - gl - f
        })
        if (dayTrades.length > 0) tradeDays++
      }
    })
    return { totalNet, totalGrossProfit, totalGrossLoss, totalFees, tradeDays }
  }

  function getWeekSummary(days) {
    let totalNet = 0, totalGrossProfit = 0, totalGrossLoss = 0, totalFees = 0
    days.forEach(d => {
      const key = formatDateKey(d)
      ;(trades[key] || []).forEach(t => {
        const gp = parseFloat(t.grossProfit) || 0
        const gl = parseFloat(t.grossLoss) || 0
        const f  = parseFloat(t.fees)       || 0
        totalGrossProfit += gp; totalGrossLoss += gl; totalFees += f; totalNet += gp - gl - f
      })
    })
    return { totalNet, totalGrossProfit, totalGrossLoss, totalFees }
  }

  function getAllYears() {
    const years = new Set()
    Object.keys(trades).forEach(key => years.add(new Date(key + 'T00:00:00').getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }

  function clearAllTrades() { setTrades({}); setNotes({}) }

  const currentAccount = accounts.find(a => a.id === currentAccountId) || accounts[0]

  return (
    <TradesContext.Provider value={{
      trades,
      saveDayTrades, clearAllTrades,
      getDayTrades, getDayNet, getMonthSummary, getWeekSummary, getAllYears,
      saveNote, getNote,
      accounts, currentAccount, currentAccountId,
      switchAccount, createAccount, renameAccount, deleteAccount,
    }}>
      {children}
    </TradesContext.Provider>
  )
}

export function useTrades() { return useContext(TradesContext) }

export function formatDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatCurrency(val) {
  if (val === 0) return '$0.00'
  const abs = Math.abs(val)
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (val < 0 ? '-' : '+') + '$' + formatted
}

export function formatCurrencyPlain(val) {
  const abs = Math.abs(val)
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (val < 0 ? '-$' : '$') + formatted
}
