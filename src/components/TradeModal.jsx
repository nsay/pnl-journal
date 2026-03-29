import { useState, useEffect } from 'react'
import { useTrades, formatDateKey, formatCurrency } from '../context/TradesContext'

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function newTrade() {
  return { id: crypto.randomUUID(), ticker: '', grossProfit: '', grossLoss: '', fees: '' }
}

export default function TradeModal({ date, onClose }) {
  const { getDayTrades, saveDayTrades } = useTrades()
  const dateKey = formatDateKey(date)

  const [rows, setRows] = useState(() => {
    const existing = getDayTrades(dateKey)
    return existing.length > 0 ? existing.map(t => ({ ...t })) : [newTrade()]
  })

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function updateRow(id, field, value) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function addRow() {
    setRows(prev => [...prev, newTrade()])
  }

  function removeRow(id) {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id)
      return next.length === 0 ? [newTrade()] : next
    })
  }

  function handleSave() {
    const cleaned = rows.filter(r =>
      r.ticker.trim() || r.grossProfit || r.grossLoss || r.fees
    )
    saveDayTrades(dateKey, cleaned)
    onClose()
  }

  function handleClear() {
    saveDayTrades(dateKey, [])
    onClose()
  }

  // Calculated totals
  const totals = rows.reduce((acc, r) => {
    acc.gp += parseFloat(r.grossProfit) || 0
    acc.gl += parseFloat(r.grossLoss) || 0
    acc.fees += parseFloat(r.fees) || 0
    return acc
  }, { gp: 0, gl: 0, fees: 0 })
  const net = totals.gp - totals.gl - totals.fees

  const dateLabel = `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  const hasExisting = getDayTrades(dateKey).length > 0

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Trade Journal</div>
            <div className="modal-date">{dateLabel}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="trades-table-wrap">
            <table className="trades-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Ticker</th>
                  <th style={{ width: 120 }}>Gross Profit</th>
                  <th style={{ width: 120 }}>Gross Loss</th>
                  <th style={{ width: 100 }}>Fees</th>
                  <th style={{ width: 90 }}>Net P&amp;L</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const rowNet = (parseFloat(row.grossProfit) || 0)
                    - (parseFloat(row.grossLoss) || 0)
                    - (parseFloat(row.fees) || 0)
                  const rowNetClass = rowNet > 0 ? 'positive' : rowNet < 0 ? 'negative' : ''
                  return (
                    <tr key={row.id}>
                      <td>
                        <input
                          className="trade-input ticker-input"
                          type="text"
                          placeholder="AAPL"
                          value={row.ticker}
                          onChange={e => updateRow(row.id, 'ticker', e.target.value.toUpperCase())}
                          maxLength={10}
                        />
                      </td>
                      <td>
                        <input
                          className="trade-input num-input"
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={row.grossProfit}
                          onChange={e => updateRow(row.id, 'grossProfit', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="trade-input num-input"
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={row.grossLoss}
                          onChange={e => updateRow(row.id, 'grossLoss', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="trade-input num-input"
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={row.fees}
                          onChange={e => updateRow(row.id, 'fees', e.target.value)}
                        />
                      </td>
                      <td style={{ paddingLeft: 8 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            color: rowNet > 0
                              ? 'var(--green)'
                              : rowNet < 0
                              ? 'var(--red)'
                              : 'var(--text-muted)'
                          }}
                        >
                          {rowNet !== 0
                            ? formatCurrency(rowNet)
                            : <span style={{ color: 'var(--text-muted)' }}>—</span>
                          }
                        </span>
                      </td>
                      <td>
                        <button
                          className="trade-delete-btn"
                          onClick={() => removeRow(row.id)}
                          title="Remove row"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button className="add-trade-btn" onClick={addRow}>
            <span>+</span> Add Trade
          </button>

          {/* Summary */}
          <div className="modal-summary">
            <div className="modal-summary-rows">
              <div className="summary-stat">
                <div className="summary-stat-label">Gross Profit</div>
                <div className={`summary-stat-value ${totals.gp > 0 ? 'positive' : ''}`}>
                  ${totals.gp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="summary-stat">
                <div className="summary-stat-label">Gross Loss</div>
                <div className={`summary-stat-value ${totals.gl > 0 ? 'negative' : ''}`}>
                  ${totals.gl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="summary-stat">
                <div className="summary-stat-label">Fees</div>
                <div className="summary-stat-value">
                  ${totals.fees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            <div className="modal-net-pnl">
              <span className="net-pnl-label">Net P&amp;L</span>
              <span className={`net-pnl-value ${net > 0 ? 'positive' : net < 0 ? 'negative' : 'zero'}`}>
                {formatCurrency(net)}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-footer-left">
            {hasExisting && (
              <button className="btn btn-danger" onClick={handleClear}>
                Clear Day
              </button>
            )}
          </div>
          <div className="modal-footer-right">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save Trades</button>
          </div>
        </div>
      </div>
    </div>
  )
}
