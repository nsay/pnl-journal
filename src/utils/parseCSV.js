/**
 * Fetches and parses /data/trades.csv
 *
 * Expected columns (case-insensitive, any order):
 *   date, ticker, grossProfit, grossLoss, fees
 *
 * Returns:
 *   { data: { [dateKey]: trade[] }, totalTrades, totalDays, errors }
 */
export async function fetchAndParseCSV(path = `${import.meta.env.BASE_URL}data/day-trades.csv`) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`)
  const text = await res.text()
  return parseCSVText(text)
}

export function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return { data: {}, totalTrades: 0, totalDays: 0, errors: [], empty: true }

  // Parse header — normalise to camelCase keys
  const headers = lines[0].split(',').map(h => normaliseHeader(h.trim()))
  const required = ['date', 'ticker', 'grossProfit', 'grossLoss', 'fees']
  const missing = required.filter(k => !headers.includes(k))
  if (missing.length) throw new Error(`CSV missing columns: ${missing.join(', ')}`)

  const data = {}
  const errors = []

  lines.slice(1).forEach((line, i) => {
    const values = line.split(',').map(v => v.trim())
    const row = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })

    if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      errors.push(`Row ${i + 2}: invalid date "${row.date}"`)
      return
    }

    if (!data[row.date]) data[row.date] = []

    data[row.date].push({
      id: crypto.randomUUID(),
      ticker: (row.ticker || '').toUpperCase(),
      grossProfit: row.grossProfit || '',
      grossLoss: row.grossLoss || '',
      fees: row.fees || '',
    })
  })

  const totalDays = Object.keys(data).length
  const totalTrades = Object.values(data).reduce((s, t) => s + t.length, 0)

  return { data, totalTrades, totalDays, errors }
}

/**
 * Fetches and parses /data/notes.csv
 *
 * Expected columns: month (YYYY-MM), notes
 *
 * Returns:
 *   { data: { [monthKey]: string }, totalMonths, errors }
 */
export async function fetchAndParseNotesCSV(path = `${import.meta.env.BASE_URL}data/notes.csv`) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`)
  const text = await res.text()
  return parseNotesCSVText(text)
}

export function parseNotesCSVText(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error('Notes CSV has no data rows')

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())
  if (!headers.includes('month') || !headers.includes('notes')) {
    throw new Error('Notes CSV must have "month" and "notes" columns')
  }

  const monthIdx = headers.indexOf('month')
  const notesIdx = headers.indexOf('notes')
  const data = {}
  const errors = []

  lines.slice(1).forEach((line, i) => {
    const values = parseCSVLine(line)
    const month = (values[monthIdx] || '').trim()
    const notes = (values[notesIdx] || '').trim()

    if (!/^\d{4}-\d{2}$/.test(month)) {
      errors.push(`Row ${i + 2}: invalid month "${month}" — expected YYYY-MM`)
      return
    }
    if (notes) data[month] = notes
  })

  return { data, totalMonths: Object.keys(data).length, errors }
}

// Handles quoted fields (e.g. "text with, commas")
function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

function normaliseHeader(h) {
  // Map common variants to camelCase field names
  const map = {
    date: 'date',
    ticker: 'ticker',
    symbol: 'ticker',
    grossprofit: 'grossProfit',
    gross_profit: 'grossProfit',
    profit: 'grossProfit',
    grossloss: 'grossLoss',
    gross_loss: 'grossLoss',
    loss: 'grossLoss',
    fees: 'fees',
    fee: 'fees',
    commission: 'fees',
    commissions: 'fees',
  }
  return map[h.toLowerCase().replace(/\s+/g, '')] ?? h
}
