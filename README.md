# PnL Journal

A modern trading journal web app built with React and Vite. Track and visualize your daily profits and losses across multiple calendar views — no backend required. All data is stored locally in the browser.

## Features

- **Calendar Views** — switch between Week, Month, Year, and All Time
- **Daily Trade Entry** — click any day to log trades with ticker, gross profit, gross loss, and fees. Net P&L is calculated automatically
- **P&L Chart** — bar + cumulative line chart at the bottom of each view, scoped to the active period
- **Monthly Notes** — write notes for each month in the Month view; start with `BULLISH`, `BEARISH`, `CHOPPY`, or `FLAT` to render a colored market-condition badge
- **CSV Import** — drop a CSV into `public/data/trades.csv` and import it directly in the app (merge or replace); optionally include `public/data/notes.csv` to pre-populate monthly notes
- **Dark / Light Mode** — toggle in the top-right navbar, preference persists across sessions
- **Local Persistence** — all data is saved to `localStorage`, no account or server needed

## Getting Started

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Importing Trades via CSV

Place your CSV file at `public/data/trades.csv`. The file must include these columns (names are flexible — see variants below):

```
date,ticker,grossProfit,grossLoss,fees
2024-01-05,ES,375.00,0,4.68
2024-01-05,ES,0,250.00,4.68
```

- **date** — `YYYY-MM-DD` format
- **ticker** / `symbol` — instrument name
- **grossProfit** / `profit` — gross profit for the trade (0 if a loss)
- **grossLoss** / `loss` — gross loss for the trade (0 if a profit)
- **fees** / `commission` / `commissions` — transaction fees

Multiple rows with the same date are treated as separate trades on that day.

Once the file is in place, click the **⚙️ Settings** icon in the navbar → **Import CSV**. Choose **Merge** to add alongside existing data or **Replace All** to start fresh.

## Importing Notes via CSV

Optionally place a notes file at `public/data/notes.csv` alongside your trades CSV. It will be imported at the same time:

```
month,notes
2024-01,"CHOPPY - Fed crushed rate cut hopes early in the year."
2024-02,"BULLISH - Strong trend off the lows, momentum carried all month."
```

- **month** — `YYYY-MM` format
- **notes** — free-form text, quoted if it contains commas. Start with `BULLISH`, `BEARISH`, `CHOPPY`, or `FLAT` (optionally followed by ` - `) to display a colored badge in the Month view.

## Tech Stack

- [React](https://react.dev/) + [Vite](https://vite.dev/)
- [Recharts](https://recharts.org/) — charting
- `localStorage` — data persistence
