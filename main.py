"""
main.py
Edgeflow — Daily Trading Levels Fetcher
Entry point for manual and scheduled execution.

Usage:
  python main.py                         # normal run
  python main.py --test                  # mock data, no API calls
  python main.py --dry-run               # fetch data but print only, no files
  python main.py --symbols EURUSD DXY    # override symbol list
  python main.py --date 2026-04-05       # generate report for a specific date
  python main.py --config my_config.json # use alternate config file
"""

import argparse
import json
import os
import sys
from datetime import datetime


def load_config(path: str) -> dict:
    if not os.path.exists(path):
        print(f"[ERROR] Config file not found: {path}")
        sys.exit(1)
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def print_levels_console(symbol: str, levels: dict, decimals: int = 5) -> None:
    """Pretty-print a single symbol's levels to stdout."""
    print(f"\n  {symbol}")
    print("  " + "-" * 50)
    if "error" in levels:
        print(f"  !! ERROR: {levels['error']}")
        return
    keys = ["PDH", "PDL", "PDC", "DO", "PWH", "PWL", "PWC", "CWH", "CWL", "PMH", "PML"]
    for k in keys:
        v = levels.get(k)
        val_str = f"{v:.{decimals}f}" if v is not None else "N/A  ← data unavailable"
        print(f"  {k:<6} : {val_str}")
    cp = levels.get("current_price")
    print(f"  {'price':<6} : {cp:.{decimals}f}" if cp else "  price  : N/A")


def run(config: dict, args: argparse.Namespace) -> None:
    import pytz
    from src.logger_setup import setup_logger, attach_file_handler
    from src.folder_manager import FolderManager
    from src.data_fetcher import DataFetcher, MOCK_LEVELS
    from src.report_generator import ReportGenerator
    from src.screenshot import take_screenshots

    logger = setup_logger(config)

    tz = pytz.timezone(config.get("timezone", "Europe/London"))
    now_str = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S %Z")

    logger.info("=" * 60)
    logger.info("  EDGEFLOW — Daily Trading Levels")
    logger.info(f"  {now_str}")
    if args.test:
        logger.info("  MODE: TEST  (mock data, no API calls)")
    elif args.dry_run:
        logger.info("  MODE: DRY-RUN  (data fetched, files NOT saved)")
    else:
        logger.info("  MODE: LIVE")
    logger.info("=" * 60)

    # ── Determine symbols ────────────────────────────────────────────────────
    symbols = args.symbols if args.symbols else config.get("symbols", [])
    if not symbols:
        logger.error("No symbols configured. Check config.json → symbols.")
        sys.exit(1)

    # ── Fetch levels ─────────────────────────────────────────────────────────
    if args.test:
        all_levels = {s: MOCK_LEVELS[s] for s in symbols if s in MOCK_LEVELS}
        missing = [s for s in symbols if s not in MOCK_LEVELS]
        for s in missing:
            logger.warning(f"  No mock data for {s} — skipped")
        data_source = "TEST (mock data)"
    else:
        fetcher = DataFetcher(config)
        all_levels: dict = {}
        for symbol in symbols:
            logger.info(f"Fetching {symbol} …")
            levels = fetcher.fetch_symbol(symbol)
            all_levels[symbol] = levels
            if "error" in levels:
                logger.error(f"  {symbol}: FAILED — {levels['error']}")
            else:
                cp = levels.get("current_price")
                logger.info(f"  {symbol}: OK  (price ≈ {cp})")
        data_source = "TradingView (tvDatafeed) / yfinance fallback"

    # ── Dry-run: print to console and exit ───────────────────────────────────
    if args.dry_run:
        print("\n" + "=" * 60)
        print("  DRY-RUN — levels fetched (not saved)")
        print("=" * 60)
        for symbol, levels in all_levels.items():
            dec = config.get("symbol_config", {}).get(symbol, {}).get("decimals", 5)
            print_levels_console(symbol, levels, dec)
        print()
        return

    # ── Create output folder ─────────────────────────────────────────────────
    folder_mgr = FolderManager(config)
    output_dir = folder_mgr.create_daily_folder(date_str=args.date)
    attach_file_handler(logger, output_dir)
    logger.info(f"Output folder: {output_dir}")

    # ── Write reports ────────────────────────────────────────────────────────
    reporter = ReportGenerator(config)
    reporter.generate_all(all_levels, output_dir, data_source)

    # ── Screenshots ──────────────────────────────────────────────────────────
    if config.get("screenshot", False) and not args.test:
        logger.info("Taking TradingView screenshots …")
        take_screenshots(config, all_levels, output_dir)
    elif args.test and config.get("screenshot", False):
        logger.info("Screenshots skipped in test mode.")

    logger.info("=" * 60)
    logger.info("  Run complete.")
    logger.info(f"  Reports saved to: {output_dir}")
    logger.info("=" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Edgeflow — Daily Trading Levels Fetcher",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                         Normal daily run
  python main.py --test                  Use mock data (no network)
  python main.py --dry-run               Fetch and print, no files saved
  python main.py --symbols EURUSD DXY    Only these symbols
  python main.py --date 2026-04-05       Override output folder date
        """,
    )
    parser.add_argument(
        "--test", action="store_true",
        help="Use built-in mock data (no TradingView / network access required)",
    )
    parser.add_argument(
        "--dry-run", dest="dry_run", action="store_true",
        help="Fetch live data but only print to console — no files written",
    )
    parser.add_argument(
        "--symbols", nargs="+", metavar="SYM",
        help="Override symbol list from config (e.g. --symbols EURUSD XAUUSD)",
    )
    parser.add_argument(
        "--date", default=None, metavar="YYYY-MM-DD",
        help="Force the output folder date (default: today)",
    )
    parser.add_argument(
        "--config", default="config.json", metavar="FILE",
        help="Path to config file (default: config.json)",
    )

    args = parser.parse_args()

    # Resolve config relative to script location so it works
    # regardless of the working directory (important for Task Scheduler)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, args.config)

    config = load_config(config_path)
    run(config, args)


if __name__ == "__main__":
    main()
