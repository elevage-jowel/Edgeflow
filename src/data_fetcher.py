"""
data_fetcher.py
Fetches OHLCV data from TradingView via tvDatafeed.
Falls back to yfinance if tvDatafeed is unavailable or fails.

For each symbol, three DataFrames are returned (one per timeframe):
  daily, weekly, monthly

All DataFrames are normalised to lowercase column names
(open, high, low, close, volume) and sorted ascending by date.
"""

import logging
from typing import Dict, Optional

import pandas as pd

logger = logging.getLogger("edgeflow")

# ── Mock data used in --test mode ───────────────────────────────────────────

MOCK_LEVELS: Dict[str, Dict] = {
    "EURUSD": {
        "PDH": 1.09234,
        "PDL": 1.08876,
        "PDC": 1.09012,
        "DO":  1.09056,
        "PWH": 1.09876,
        "PWL": 1.08234,
        "PWC": 1.09100,
        "CWH": 1.09234,
        "CWL": 1.08876,
        "PMH": 1.10234,
        "PML": 1.07890,
        "current_price": 1.09012,
        "source": "MOCK",
    },
    "GBPUSD": {
        "PDH": 1.29876,
        "PDL": 1.29234,
        "PDC": 1.29600,
        "DO":  1.29650,
        "PWH": 1.30500,
        "PWL": 1.28900,
        "PWC": 1.29700,
        "CWH": 1.29876,
        "CWL": 1.29234,
        "PMH": 1.31200,
        "PML": 1.27800,
        "current_price": 1.29600,
        "source": "MOCK",
    },
    "XAUUSD": {
        "PDH": 2345.60,
        "PDL": 2318.40,
        "PDC": 2332.10,
        "DO":  2334.50,
        "PWH": 2360.00,
        "PWL": 2298.00,
        "PWC": 2340.00,
        "CWH": 2345.60,
        "CWL": 2318.40,
        "PMH": 2400.00,
        "PML": 2280.00,
        "current_price": 2332.10,
        "source": "MOCK",
    },
    "DXY": {
        "PDH": 104.456,
        "PDL": 103.876,
        "PDC": 104.120,
        "DO":  104.050,
        "PWH": 105.200,
        "PWL": 103.400,
        "PWC": 104.300,
        "CWH": 104.456,
        "CWL": 103.876,
        "PMH": 106.000,
        "PML": 102.800,
        "current_price": 104.120,
        "source": "MOCK",
    },
}


# ── Helper ───────────────────────────────────────────────────────────────────

def _normalise_df(df: pd.DataFrame) -> pd.DataFrame:
    """Lowercase columns, keep only OHLCV, sort ascending."""
    df = df.copy()
    df.columns = [c.lower() for c in df.columns]
    keep = [c for c in ("open", "high", "low", "close", "volume") if c in df.columns]
    df = df[keep].sort_index(ascending=True)
    return df


# ── tvDatafeed fetcher ───────────────────────────────────────────────────────

class TvDatafeedFetcher:
    """Wraps tvDatafeed to get daily / weekly / monthly OHLCV."""

    def __init__(self, username: str = "", password: str = ""):
        self._tv = None
        self._init(username, password)

    def _init(self, username: str, password: str) -> None:
        try:
            from tvDatafeed import TvDatafeed  # type: ignore
            if username and password:
                self._tv = TvDatafeed(username=username, password=password)
                logger.info("tvDatafeed: authenticated session")
            else:
                self._tv = TvDatafeed()
                logger.info("tvDatafeed: anonymous session (limited history)")
        except Exception as exc:
            logger.warning(f"tvDatafeed init failed: {exc}")

    def available(self) -> bool:
        return self._tv is not None

    def fetch(
        self,
        tv_symbol: str,
        tv_exchange: str,
        n_bars: int = 15,
    ) -> Dict[str, pd.DataFrame]:
        """
        Returns {'daily': df, 'weekly': df, 'monthly': df}.
        Raises RuntimeError on failure so caller can fall back.
        """
        from tvDatafeed import Interval  # type: ignore

        results: Dict[str, pd.DataFrame] = {}

        mapping = {
            "daily":   Interval.in_daily,
            "weekly":  Interval.in_weekly,
            "monthly": Interval.in_monthly,
        }

        for tf_name, interval in mapping.items():
            df = self._tv.get_hist(
                symbol=tv_symbol,
                exchange=tv_exchange,
                interval=interval,
                n_bars=n_bars,
            )
            if df is None or df.empty:
                raise RuntimeError(
                    f"tvDatafeed returned empty data for {tv_exchange}:{tv_symbol} [{tf_name}]"
                )
            results[tf_name] = _normalise_df(df)
            logger.debug(f"  tvDatafeed {tv_symbol} {tf_name}: {len(results[tf_name])} bars")

        return results


# ── yfinance fetcher ─────────────────────────────────────────────────────────

class YFinanceFetcher:
    """Fallback data source using yfinance."""

    @staticmethod
    def fetch(yf_symbol: str, n_bars: int = 15) -> Dict[str, pd.DataFrame]:
        """
        Returns {'daily': df, 'weekly': df, 'monthly': df}.
        Raises RuntimeError on failure.
        """
        try:
            import yfinance as yf  # type: ignore
        except ImportError:
            raise RuntimeError("yfinance is not installed")

        ticker = yf.Ticker(yf_symbol)

        configs = {
            "daily":   {"period": "20d",  "interval": "1d"},
            "weekly":  {"period": "6mo",  "interval": "1wk"},
            "monthly": {"period": "3y",   "interval": "1mo"},
        }

        results: Dict[str, pd.DataFrame] = {}
        for tf_name, opts in configs.items():
            df = ticker.history(**opts)
            if df is None or df.empty:
                raise RuntimeError(
                    f"yfinance returned empty data for {yf_symbol} [{tf_name}]"
                )
            results[tf_name] = _normalise_df(df)
            logger.debug(f"  yfinance {yf_symbol} {tf_name}: {len(results[tf_name])} bars")

        return results


# ── Main DataFetcher class ───────────────────────────────────────────────────

class DataFetcher:
    """
    Orchestrates data retrieval for all configured symbols.

    Priority:
      1. tvDatafeed  (TradingView data, same as chart)
      2. yfinance    (fallback, independent source)
    """

    def __init__(self, config: dict):
        self.config = config
        tv_cfg = config.get("tradingview", {})
        self._tv_fetcher = TvDatafeedFetcher(
            username=tv_cfg.get("username", ""),
            password=tv_cfg.get("password", ""),
        )
        self._yf_fetcher = YFinanceFetcher()

    def fetch_symbol(self, symbol_key: str) -> Dict:
        """
        Fetch all timeframes for one symbol and return a flat levels dict
        {'PDH': ..., 'PDL': ..., ..., 'current_price': ..., 'source': ...}.
        Returns a dict with 'error' key if all sources fail.
        """
        sym_cfg = self.config["symbol_config"].get(symbol_key, {})
        tv_exchange = sym_cfg.get("tv_exchange", "FX_IDC")
        tv_symbol   = sym_cfg.get("tv_symbol", symbol_key)
        yf_symbol   = sym_cfg.get("yf_symbol", "")
        decimals    = sym_cfg.get("decimals", 5)
        n_bars      = self.config.get("lookback_bars", 15)

        raw_dfs: Optional[Dict[str, pd.DataFrame]] = None
        source_used = "UNKNOWN"

        # ── Attempt 1: tvDatafeed ────────────────────────────────────────────
        if self._tv_fetcher.available():
            try:
                raw_dfs = self._tv_fetcher.fetch(tv_symbol, tv_exchange, n_bars=n_bars)
                source_used = f"TradingView/{tv_exchange}:{tv_symbol}"
                logger.info(f"  {symbol_key}: data from tvDatafeed ({tv_exchange}:{tv_symbol})")
            except Exception as exc:
                logger.warning(f"  {symbol_key}: tvDatafeed failed ({exc}), trying yfinance …")

        # ── Attempt 2: yfinance fallback ─────────────────────────────────────
        if raw_dfs is None and yf_symbol:
            try:
                raw_dfs = self._yf_fetcher.fetch(yf_symbol, n_bars=n_bars)
                source_used = f"yfinance/{yf_symbol}"
                logger.info(f"  {symbol_key}: data from yfinance ({yf_symbol})")
            except Exception as exc:
                logger.error(f"  {symbol_key}: yfinance also failed ({exc})")

        if raw_dfs is None:
            return {
                "error": "All data sources failed. Check logs and internet connection.",
                "source": "N/A",
            }

        from src.levels_calculator import calculate_levels
        levels = calculate_levels(
            daily_df=raw_dfs["daily"],
            weekly_df=raw_dfs["weekly"],
            monthly_df=raw_dfs["monthly"],
            decimals=decimals,
        )
        levels["source"] = source_used
        return levels
