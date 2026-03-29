import { useState } from 'react'
import { useTrades, formatDateKey, formatCurrency, formatCurrencyPlain } from '../context/TradesContext'
import TradeModal from './TradeModal'
import ImportModal from './ImportModal'
import { WeekChart, MonthChart, YearChart, AllTimeChart } from './PnLChart'

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const today = new Date()
today.setHours(0,0,0,0)

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export default function CalendarTab() {
  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(new Date(today))
  const [modalDate, setModalDate] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const { getDayNet, getMonthSummary, getWeekSummary, getAllYears, trades } = useTrades()

  function openModal(date) { setModalDate(date) }
  function closeModal() { setModalDate(null) }

  // ── Navigation ────────────────────────────────────────────────
  function goBack() {
    const d = new Date(cursor)
    if (view === 'month') d.setMonth(d.getMonth() - 1)
    else if (view === 'week') d.setDate(d.getDate() - 7)
    else if (view === 'year') d.setFullYear(d.getFullYear() - 1)
    setCursor(d)
  }

  function goForward() {
    const d = new Date(cursor)
    if (view === 'month') d.setMonth(d.getMonth() + 1)
    else if (view === 'week') d.setDate(d.getDate() + 7)
    else if (view === 'year') d.setFullYear(d.getFullYear() + 1)
    setCursor(d)
  }

  function goToday() { setCursor(new Date(today)) }

  function periodLabel() {
    if (view === 'month') return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    if (view === 'year') return `${cursor.getFullYear()}`
    if (view === 'alltime') return 'All Time'
    // week
    const start = getWeekStart(cursor)
    const end = new Date(start); end.setDate(end.getDate() + 6)
    if (start.getMonth() === end.getMonth()) {
      return `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
    }
    return `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`
  }

  // ── Summary data for current view ─────────────────────────────
  function getSummary() {
    if (view === 'month') {
      return getMonthSummary(cursor.getFullYear(), cursor.getMonth())
    }
    if (view === 'week') {
      const start = getWeekStart(cursor)
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start); d.setDate(d.getDate() + i); return d
      })
      return getWeekSummary(days)
    }
    if (view === 'year') {
      let totalNet = 0, totalGrossProfit = 0, totalGrossLoss = 0, totalFees = 0, tradeDays = 0
      for (let m = 0; m < 12; m++) {
        const s = getMonthSummary(cursor.getFullYear(), m)
        totalNet += s.totalNet
        totalGrossProfit += s.totalGrossProfit
        totalGrossLoss += s.totalGrossLoss
        totalFees += s.totalFees
        tradeDays += s.tradeDays
      }
      return { totalNet, totalGrossProfit, totalGrossLoss, totalFees, tradeDays }
    }
    // all time
    let totalNet = 0, totalGrossProfit = 0, totalGrossLoss = 0, totalFees = 0, tradeDays = 0
    Object.keys(trades).forEach(key => {
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
    })
    return { totalNet, totalGrossProfit, totalGrossLoss, totalFees, tradeDays }
  }

  const summary = getSummary()

  return (
    <div>
      {/* Header */}
      <div className="calendar-header">
        <div className="calendar-header-left">
          <div className="calendar-title">Trading Journal</div>
          <div className="calendar-subtitle">Track your daily profits and losses</div>
        </div>

        <div className="calendar-header-right">
          <button className="import-csv-btn" onClick={() => setShowImport(true)}>
            ↑ Import CSV
          </button>

          {/* View switcher */}
          <div className="view-tabs">
            {['week','month','year','alltime'].map(v => (
              <button
                key={v}
                className={`view-tab ${view === v ? 'active' : ''}`}
                onClick={() => setView(v)}
              >
                {v === 'alltime' ? 'All Time' : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Nav controls */}
          {view !== 'alltime' && (
            <div className="nav-controls">
              <button className="nav-btn" onClick={goBack}>‹</button>
              <span className="nav-period">{periodLabel()}</span>
              <button className="nav-btn" onClick={goForward}>›</button>
              <button className="today-btn" onClick={goToday}>Today</button>
            </div>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="summary-bar">
        <SummaryCard
          label="Net P&L"
          value={formatCurrency(summary.totalNet)}
          cls={summary.totalNet > 0 ? 'positive' : summary.totalNet < 0 ? 'negative' : ''}
          sub={`${summary.tradeDays ?? 0} trading day${summary.tradeDays === 1 ? '' : 's'}`}
        />
        <SummaryCard
          label="Gross Profit"
          value={`$${(summary.totalGrossProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          cls="positive"
        />
        <SummaryCard
          label="Gross Loss"
          value={`$${(summary.totalGrossLoss || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          cls={summary.totalGrossLoss > 0 ? 'negative' : ''}
        />
        <SummaryCard
          label="Total Fees"
          value={`$${(summary.totalFees || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
      </div>

      {/* Calendar body */}
      {view === 'month' && <MonthView cursor={cursor} openModal={openModal} getDayNet={getDayNet} trades={trades} />}
      {view === 'week' && <WeekView cursor={cursor} openModal={openModal} getDayNet={getDayNet} trades={trades} />}
      {view === 'year' && <YearView cursor={cursor} openModal={openModal} getDayNet={getDayNet} getMonthSummary={getMonthSummary} trades={trades} />}
      {view === 'alltime' && <AllTimeView openModal={openModal} getDayNet={getDayNet} getMonthSummary={getMonthSummary} getAllYears={getAllYears} />}

      {/* Chart */}
      <div style={{
        marginTop: 20,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px 14px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>P&amp;L Overview</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Bars = daily net &nbsp;·&nbsp; Line = cumulative
          </div>
        </div>
        {view === 'week'    && <WeekChart    cursor={cursor} trades={trades} />}
        {view === 'month'   && <MonthChart   cursor={cursor} trades={trades} />}
        {view === 'year'    && <YearChart    cursor={cursor} getMonthSummary={getMonthSummary} />}
        {view === 'alltime' && <AllTimeChart getAllYears={getAllYears} getMonthSummary={getMonthSummary} />}
      </div>

      {modalDate && <TradeModal date={modalDate} onClose={closeModal} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}

function SummaryCard({ label, value, cls = '', sub }) {
  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>
      <div className={`summary-value ${cls}`}>{value}</div>
      {sub && <div className="summary-sub">{sub}</div>}
    </div>
  )
}

// ── Month View ───────────────────────────────────────────────────
function MonthView({ cursor, openModal, getDayNet, trades }) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()

  const cells = []
  // Leading empty days
  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month, 1 - startPad + i)
    cells.push({ date: d, otherMonth: true })
  }
  // Days in month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ date: new Date(year, month, d), otherMonth: false })
  }
  // Trailing days
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push({ date: new Date(year, month + 1, i), otherMonth: true })
    }
  }

  return (
    <div className="calendar-grid">
      <div className="calendar-dow-header">
        {DOW.map(d => <div key={d} className="calendar-dow">{d}</div>)}
      </div>
      <div className="calendar-days">
        {cells.map(({ date, otherMonth }, idx) => {
          const key = formatDateKey(date)
          const dayTrades = trades[key] || []
          const net = getDayNet(key)
          const hasTrades = dayTrades.length > 0
          const isToday = isSameDay(date, today)

          let cls = 'calendar-day'
          if (otherMonth) cls += ' other-month'
          if (isToday) cls += ' today'
          if (hasTrades) {
            cls += ' has-trades'
            cls += net > 0 ? ' positive-day' : net < 0 ? ' negative-day' : ' neutral-day'
          }

          return (
            <div
              key={idx}
              className={cls}
              onClick={() => !otherMonth && openModal(date)}
            >
              <div className="day-number">{date.getDate()}</div>
              {hasTrades && (
                <>
                  <div className={`day-pnl ${net >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(net)}
                  </div>
                  <div className="day-trade-count">
                    {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Week helpers ─────────────────────────────────────────────────
function getWeekStart(date) {
  const d = new Date(date)
  d.setHours(0,0,0,0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

// ── Week View ────────────────────────────────────────────────────
function WeekView({ cursor, openModal, getDayNet, trades }) {
  const start = getWeekStart(cursor)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d
  })

  return (
    <div className="week-grid">
      <div className="week-columns">
        {days.map((date, i) => {
          const key = formatDateKey(date)
          const dayTrades = trades[key] || []
          const net = getDayNet(key)
          const hasTrades = dayTrades.length > 0
          const isToday = isSameDay(date, today)

          const gp = dayTrades.reduce((s, t) => s + (parseFloat(t.grossProfit) || 0), 0)
          const gl = dayTrades.reduce((s, t) => s + (parseFloat(t.grossLoss) || 0), 0)
          const fees = dayTrades.reduce((s, t) => s + (parseFloat(t.fees) || 0), 0)

          let hdrCls = 'week-col-header'
          if (isToday) hdrCls += ' today'
          if (hasTrades) {
            hdrCls += ' has-trades'
            hdrCls += net > 0 ? ' positive-day' : ' negative-day'
          }

          return (
            <div key={i} className="week-column">
              <div className={hdrCls} onClick={() => openModal(date)}>
                <div className="week-dow">{DOW[date.getDay()]}</div>
                <div className="week-date-num">{date.getDate()}</div>
              </div>
              <div className="week-col-body">
                {hasTrades ? (
                  <>
                    <div className={`week-pnl-large ${net >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(net)}
                    </div>
                    <div className="week-stats">
                      <div className="week-stat-row">
                        <span className="week-stat-label">Profit</span>
                        <span className="week-stat-value" style={{ color: 'var(--green)' }}>
                          ${gp.toFixed(2)}
                        </span>
                      </div>
                      <div className="week-stat-row">
                        <span className="week-stat-label">Loss</span>
                        <span className="week-stat-value" style={{ color: 'var(--red)' }}>
                          ${gl.toFixed(2)}
                        </span>
                      </div>
                      <div className="week-stat-row">
                        <span className="week-stat-label">Fees</span>
                        <span className="week-stat-value">${fees.toFixed(2)}</span>
                      </div>
                      <div className="week-stat-row" style={{ marginTop: 2 }}>
                        <span className="week-stat-label">Trades</span>
                        <span className="week-stat-value">{dayTrades.length}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="week-no-trades">No trades</div>
                )}
                <button className="week-add-btn" onClick={() => openModal(date)}>
                  {hasTrades ? 'Edit trades' : '+ Add trades'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Year View ────────────────────────────────────────────────────
function YearView({ cursor, openModal, getDayNet, getMonthSummary, trades }) {
  const year = cursor.getFullYear()

  return (
    <div className="year-grid">
      {Array.from({ length: 12 }, (_, m) => {
        const summary = getMonthSummary(year, m)
        const hasTrades = summary.tradeDays > 0
        const netCls = hasTrades
          ? (summary.totalNet > 0 ? 'positive' : summary.totalNet < 0 ? 'negative' : 'neutral')
          : 'neutral'

        const firstDay = new Date(year, m, 1)
        const lastDay = new Date(year, m + 1, 0)
        const startPad = firstDay.getDay()
        const cells = []
        for (let i = 0; i < startPad; i++) cells.push(null)
        for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, m, d))
        const rem = 7 - (cells.length % 7)
        if (rem < 7) for (let i = 0; i < rem; i++) cells.push(null)

        return (
          <div key={m} className="year-month-card">
            <div className="year-month-header">
              <div className="year-month-name">{MONTHS[m]}</div>
              <div className={`year-month-total ${netCls}`}>
                {hasTrades ? formatCurrency(summary.totalNet) : '—'}
              </div>
            </div>
            <div className="year-month-mini-grid">
              {DOW.map(d => <div key={d} className="year-mini-dow">{d[0]}</div>)}
              {cells.map((date, idx) => {
                if (!date) return <div key={idx} className="year-mini-day empty" />
                const key = formatDateKey(date)
                const dayTrades = trades[key] || []
                const net = getDayNet(key)
                const hasDayTrades = dayTrades.length > 0
                const isToday = isSameDay(date, today)

                let cls = 'year-mini-day'
                if (hasDayTrades) cls += net >= 0 ? ' has-trades positive' : ' has-trades negative'
                if (isToday) cls += ' today'

                return (
                  <div
                    key={idx}
                    className={cls}
                    title={`${MONTHS_SHORT[m]} ${date.getDate()}${hasDayTrades ? ': ' + formatCurrencyPlain(net) : ''}`}
                    onClick={() => openModal(date)}
                  >
                    {date.getDate()}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── All Time View ────────────────────────────────────────────────
function AllTimeView({ openModal, getDayNet, getMonthSummary, getAllYears }) {
  const years = getAllYears()

  if (years.length === 0) {
    return (
      <div className="alltime-container">
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 14
        }}>
          No trade data yet. Start by clicking a day on the Month or Week view.
        </div>
      </div>
    )
  }

  return (
    <div className="alltime-container">
      {years.map(year => {
        let yearTotal = 0
        const months = Array.from({ length: 12 }, (_, m) => {
          const s = getMonthSummary(year, m)
          yearTotal += s.totalNet
          return { m, s }
        })

        return (
          <div key={year} className="alltime-year-section">
            <div className="alltime-year-header">
              <span className="alltime-year-label">{year}</span>
              <span className={`alltime-year-total ${yearTotal > 0 ? 'positive' : yearTotal < 0 ? 'negative' : 'neutral'}`}
                style={{ color: yearTotal > 0 ? 'var(--green)' : yearTotal < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                {yearTotal !== 0 ? formatCurrency(yearTotal) : '—'}
              </span>
            </div>
            <div className="alltime-months-grid">
              {months.map(({ m, s }) => {
                const hasTrades = s.tradeDays > 0
                const netCls = hasTrades ? (s.totalNet > 0 ? 'positive' : 'negative') : 'neutral'
                return (
                  <div
                    key={m}
                    className="alltime-month-cell"
                    onClick={() => {
                      // Navigate user to month view for that month (open first day)
                      openModal(new Date(year, m, 1))
                    }}
                    title={`${MONTHS[m]} ${year}`}
                  >
                    <div className="alltime-month-name">{MONTHS_SHORT[m]}</div>
                    <div className={`alltime-month-pnl ${netCls}`}>
                      {hasTrades ? formatCurrencyPlain(s.totalNet) : '—'}
                    </div>
                    {hasTrades && (
                      <div className="alltime-month-trades">{s.tradeDays} day{s.tradeDays !== 1 ? 's' : ''}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
