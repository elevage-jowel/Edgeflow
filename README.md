# Edgeflow

Daily trading key-level automation tool.

Fetches PDH, PDL, PDC, DO, PWH, PWL, PWC, CWH, CWL, PMH, PML from TradingView
every morning at 07:00 for **EURUSD, GBPUSD, XAUUSD, DXY** and generates
`report.txt`, `report.json`, `report.csv`, and TradingView chart screenshots.

## Quick start

```bash
pip install -r requirements.txt
playwright install chromium        # for screenshots
# Edit config.json → add TradingView credentials
python main.py --test              # verify with mock data
python main.py                     # live run
python setup_scheduler.py          # register Windows Task Scheduler (as Admin)
```

See **[docs/SETUP_WINDOWS.md](docs/SETUP_WINDOWS.md)** for the full installation guide.

## Project structure

```
Edgeflow/
├── main.py                  Entry point (CLI)
├── config.json              User configuration (credentials, symbols, paths)
├── requirements.txt
├── setup_scheduler.py       Register Windows Task Scheduler task
├── src/
│   ├── data_fetcher.py      tvDatafeed (primary) + yfinance (fallback)
│   ├── levels_calculator.py Extracts PDH/PDL/… from OHLCV bars
│   ├── report_generator.py  Writes TXT / JSON / CSV + SUMMARY
│   ├── folder_manager.py    Creates Daily_Trading_Levels/YYYY-MM-DD/
│   ├── logger_setup.py      Console + file logging
│   └── screenshot.py        Playwright headless TradingView screenshots
└── docs/
    └── SETUP_WINDOWS.md     Full Windows installation guide
```
