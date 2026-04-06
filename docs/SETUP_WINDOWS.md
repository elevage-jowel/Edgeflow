# Edgeflow — Installation & Setup Guide (Windows)

## What this tool does

Every morning at **07:00** (Europe/London time), Edgeflow:

1. Connects to **TradingView** via `tvDatafeed` (same data as your charts, no browser needed)
2. Pulls OHLCV bars for EURUSD, GBPUSD, XAUUSD, DXY across **daily / weekly / monthly** timeframes
3. Calculates all key levels: PDH, PDL, PDC, DO, PWH, PWL, PWC, CWH, CWL, PMH, PML
4. Creates `Daily_Trading_Levels/YYYY-MM-DD/` and writes:
   - `report.txt` — human-readable report
   - `report.json` — structured data (for other tools)
   - `report.csv` — spreadsheet-ready
   - `log.txt` — execution log
   - `SYMBOL_chart.png` — TradingView Daily chart screenshots *(if enabled)*

---

## Prerequisites

| Requirement | Minimum version |
|---|---|
| Python | 3.10+ |
| pip | latest |
| Internet access | required at run time |
| TradingView account | free works; Pro recommended |

---

## Step 1 — Install Python

Download from https://www.python.org/downloads/ (3.11 recommended).

During installation, check **"Add Python to PATH"**.

Verify:
```
python --version
```

---

## Step 2 — Download the project

```
git clone <your-repo-url> C:\Edgeflow
cd C:\Edgeflow
```

Or copy the folder manually to e.g. `C:\Edgeflow`.

---

## Step 3 — Create a virtual environment (recommended)

```
cd C:\Edgeflow
python -m venv .venv
.venv\Scripts\activate
```

---

## Step 4 — Install Python dependencies

```
pip install -r requirements.txt
```

---

## Step 5 — Install Playwright browser (for screenshots)

```
playwright install chromium
```

This downloads a ~150 MB headless Chromium binary once.  
Skip this step if you set `"screenshot": false` in `config.json`.

---

## Step 6 — Configure the tool

Open `config.json` in a text editor and fill in:

```json
{
  "timezone":   "Europe/London",
  "run_time":   "07:00",
  "output_path": "Daily_Trading_Levels",
  "symbols": ["EURUSD", "GBPUSD", "XAUUSD", "DXY"],

  "tradingview": {
    "username": "your_tv_email@example.com",
    "password": "your_tv_password"
  },

  "screenshot": true
}
```

**Important**: keep `config.json` private — it contains your TradingView credentials.  
It is listed in `.gitignore` by default.

### Symbol configuration

Each symbol has an entry under `symbol_config`:

| Field | Meaning |
|---|---|
| `tv_exchange` | TradingView exchange prefix (e.g. `FX_IDC`, `TVC`) |
| `tv_symbol` | TradingView ticker (e.g. `GOLD` for XAUUSD on TVC) |
| `yf_symbol` | Yahoo Finance ticker used as fallback |
| `decimals` | Decimal places in reports |

---

## Step 7 — Test manually

```
cd C:\Edgeflow
.venv\Scripts\activate

# Test with mock data (no internet needed)
python main.py --test

# Dry-run: fetch live data, print to console only
python main.py --dry-run

# Full live run
python main.py
```

Check `Daily_Trading_Levels\YYYY-MM-DD\` for the output.

---

## Step 8 — Automate with Windows Task Scheduler

**Run PowerShell or CMD as Administrator**, then:

```
cd C:\Edgeflow
.venv\Scripts\activate
python setup_scheduler.py
```

This will:
- Generate `run_scheduler.bat` with the correct Python path
- Register a Task Scheduler task called **Edgeflow_TradingLevels**
- Set it to run **daily at 07:00**

### Verify the task

```
schtasks /Query /TN Edgeflow_TradingLevels
```

### Run the task manually (test the scheduler setup)

```
schtasks /Run /TN Edgeflow_TradingLevels
```

### Override the run time

```
python setup_scheduler.py --time 06:30
```

### Remove the task

```
python setup_scheduler.py --remove
```

---

## Folder structure after setup

```
C:\Edgeflow\
├── main.py
├── config.json                  ← edit your credentials here
├── requirements.txt
├── setup_scheduler.py
├── run_scheduler.bat            ← auto-generated, do not edit manually
├── src\
│   ├── __init__.py
│   ├── data_fetcher.py
│   ├── levels_calculator.py
│   ├── report_generator.py
│   ├── folder_manager.py
│   ├── logger_setup.py
│   └── screenshot.py
├── Daily_Trading_Levels\
│   └── 2026-04-06\
│       ├── report.txt
│       ├── report.json
│       ├── report.csv
│       ├── log.txt
│       ├── EURUSD_chart.png
│       ├── GBPUSD_chart.png
│       ├── XAUUSD_chart.png
│       └── DXY_chart.png
└── docs\
    └── SETUP_WINDOWS.md         ← this file
```

---

## Data sources — what is automated vs. what needs TradingView open

| Action | Automated? | Requires browser? |
|---|---|---|
| Fetch OHLCV levels (PDH, PDL, …) | **Yes** — tvDatafeed | **No** |
| Fallback if tvDatafeed fails | **Yes** — yfinance | **No** |
| TradingView chart screenshots | **Yes** — Playwright headless | **No** (headless) |
| TradingView login for screenshots | Automatic (stored cookies) | No after first run |

> **Note on tvDatafeed**: This is a community-maintained library that connects to
> TradingView's internal WebSocket API. It provides the same data you see on your
> charts. It does NOT scrape the UI. Anthropic / Edgeflow is not affiliated with
> TradingView — use responsibly and in accordance with TradingView's ToS.

---

## Troubleshooting

### "tvDatafeed returned empty data"
- Check internet connection
- Verify your TradingView credentials in `config.json`
- tvDatafeed may be temporarily blocked — the tool will fall back to yfinance automatically

### "playwright install chromium" fails
- Make sure you have a working internet connection
- Try running as Administrator
- Alternatively set `"screenshot": false` in config.json

### Task Scheduler does not run at 07:00
- Ensure the task is not set to run only when user is logged in
  (Windows Task Scheduler → task properties → "Run whether user is logged on or not")
- Make sure the PC is not sleeping at 07:00
  (Control Panel → Power Options → disable sleep or set wake timer)

### "Access denied" when running setup_scheduler.py
- Right-click PowerShell → "Run as Administrator"
- Re-run `python setup_scheduler.py`

---

## Example report.txt output

```
============================================================
  EDGEFLOW — DAILY TRADING LEVELS
============================================================
  DATE         : 2026-04-06
  TIME         : 07:03:42
  TIMEZONE     : Europe/London  (BST)
  SOURCE       : TradingView (tvDatafeed) / yfinance fallback
============================================================

  EURUSD
  ------------------------------------------------------------
  - PDH  (Previous Day High)   : 1.09234
  - PDL  (Previous Day Low)    : 1.08876
  - PDC  (Previous Day Close)  : 1.09012
  - DO   (Daily Open)          : 1.09056
  - PWH  (Prev Week High)      : 1.09876
  - PWL  (Prev Week Low)       : 1.08234
  - PWC  (Prev Week Close)     : 1.09100
  - CWH  (Current Week High)   : 1.09234
  - CWL  (Current Week Low)    : 1.08876
  - PMH  (Prev Month High)     : 1.10234
  - PML  (Prev Month Low)      : 1.07890
  - Current Price (approx)     : 1.09012
  - Data source                : TradingView/FX_IDC:EURUSD

  ...

============================================================
  SUMMARY
============================================================

  EURUSD
  ------------------------------------------------------------
  Current price (approx)          : 1.09012
  Closest daily level ABOVE price : PDH  @  1.09234  (+0.00222)
  Closest daily level BELOW price : DO   @  1.09056  (-0.00044)
  Closest weekly level ABOVE price: CWH  @  1.09234  (+0.00222)
  Closest weekly level BELOW price: CWL  @  1.08876  (-0.00136)
  >> MAIN LEVEL TO WATCH          : DO   @  1.09056  (dist: 0.00044)
```

---

## CLI reference

```
python main.py [OPTIONS]

  --test               Use mock data (no internet, safe to test)
  --dry-run            Fetch live data, print to console, no files saved
  --symbols S [S ...]  Override symbol list (e.g. EURUSD DXY)
  --date YYYY-MM-DD    Force output folder date (useful for back-filling)
  --config FILE        Alternate config file (default: config.json)
```
