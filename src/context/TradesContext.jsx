import { createContext, useContext, useState, useEffect } from 'react'

// trades: { "YYYY-MM-DD": [ { id, ticker, grossProfit, grossLoss, fees }, ... ] }

const TradesContext = createContext(null)

const STORAGE_KEY = 'pnl_journal_trades'

export function TradesProvider({ children }) {
  const [trades, setTrades] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
  }, [trades])

  function saveDayTrades(dateKey, dayTrades) {
    setTrades(prev => {
      const next = { ...prev }
      if (!dayTrades || dayTrades.length === 0) {
        delete next[dateKey]
      } else {
        next[dateKey] = dayTrades
      }
      return next
    })
  }

  function getDayTrades(dateKey) {
    return trades[dateKey] || []
  }

  function getDayNet(dateKey) {
    const dayTrades = trades[dateKey] || []
    return dayTrades.reduce((sum, t) => {
      const gp = parseFloat(t.grossProfit) || 0
      const gl = parseFloat(t.grossLoss) || 0
      const f = parseFloat(t.fees) || 0
      return sum + gp - gl - f
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
          const f = parseFloat(t.fees) || 0
          totalGrossProfit += gp
          totalGrossLoss += gl
          totalFees += f
          totalNet += gp - gl - f
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
      const dayTrades = trades[key] || []
      dayTrades.forEach(t => {
        const gp = parseFloat(t.grossProfit) || 0
        const gl = parseFloat(t.grossLoss) || 0
        const f = parseFloat(t.fees) || 0
        totalGrossProfit += gp
        totalGrossLoss += gl
        totalFees += f
        totalNet += gp - gl - f
      })
    })
    return { totalNet, totalGrossProfit, totalGrossLoss, totalFees }
  }

  function getAllYears() {
    const years = new Set()
    Object.keys(trades).forEach(key => {
      years.add(new Date(key + 'T00:00:00').getFullYear())
    })
    return Array.from(years).sort((a, b) => b - a)
  }

  function clearAllTrades() {
    setTrades({})
  }

  return (
    <TradesContext.Provider value={{
      trades,
      saveDayTrades,
      clearAllTrades,
      getDayTrades,
      getDayNet,
      getMonthSummary,
      getWeekSummary,
      getAllYears,
    }}>
      {children}
    </TradesContext.Provider>
  )
}

export function useTrades() {
  return useContext(TradesContext)
}

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
