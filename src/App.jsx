import { useState, useEffect } from 'react'
import { TradesProvider } from './context/TradesContext'
import CalendarTab from './components/CalendarTab'
import './App.css'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const now = new Date()
const dateString = `${DOW_SHORT[now.getDay()]}, ${MONTHS_SHORT[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('pnl_theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pnl_theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <TradesProvider>
      <div className="app">
        <nav className="navbar">
          <div className="navbar-brand">
            <div className="brand-icon">📈</div>
            PnL Journal
          </div>

          <div className="navbar-right">
            <span className="navbar-date">{dateString}</span>
            <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </nav>

        <main className="page">
          <CalendarTab />
        </main>
      </div>
    </TradesProvider>
  )
}
