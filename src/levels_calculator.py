"""
levels_calculator.py
Extracts named key levels from normalised OHLCV DataFrames.

Bar interpretation at 07:00 London time:
  daily_df.iloc[-1]  → current day in progress   (open = DO)
  daily_df.iloc[-2]  → previous day, complete     (PDH / PDL / PDC)
  weekly_df.iloc[-1] → current week in progress   (CWH / CWL)
  weekly_df.iloc[-2] → previous week, complete    (PWH / PWL / PWC)
  monthly_df.iloc[-1]→ current month in progress  (not used directly)
  monthly_df.iloc[-2]→ previous month, complete   (PMH / PML)

All DataFrames must be sorted ascending (oldest first).
"""

import logging
from typing import Dict, Optional

import pandas as pd

logger = logging.getLogger("edgeflow")


def _safe(val, decimals: int) -> Optional[float]:
    """Round a value; return None if NaN / None."""
    try:
        if val is None or (hasattr(val, "__float__") and pd.isna(float(val))):
            return None
        return round(float(val), decimals)
    except (TypeError, ValueError):
        return None


def calculate_levels(
    daily_df: pd.DataFrame,
    weekly_df: pd.DataFrame,
    monthly_df: pd.DataFrame,
    decimals: int = 5,
) -> Dict[str, Optional[float]]:
    """
    Return a dict with all key levels for one instrument.
    Missing / uncalculable values are set to None so the report
    can flag them explicitly instead of inventing prices.
    """
    levels: Dict[str, Optional[float]] = {
        "PDH": None, "PDL": None, "PDC": None, "DO": None,
        "PWH": None, "PWL": None, "PWC": None,
        "CWH": None, "CWL": None,
        "PMH": None, "PML": None,
        "current_price": None,
    }

    # ── Daily levels ─────────────────────────────────────────────────────────
    if daily_df is not None and len(daily_df) >= 2:
        prev = daily_df.iloc[-2]
        curr = daily_df.iloc[-1]
        levels["PDH"] = _safe(prev.get("high"),  decimals)
        levels["PDL"] = _safe(prev.get("low"),   decimals)
        levels["PDC"] = _safe(prev.get("close"), decimals)
        levels["DO"]  = _safe(curr.get("open"),  decimals)
        # Use the latest close of the in-progress bar as current price proxy
        levels["current_price"] = _safe(curr.get("close"), decimals)
    elif daily_df is not None and len(daily_df) == 1:
        logger.warning("Only 1 daily bar available – PDH/PDL/PDC cannot be calculated")
        curr = daily_df.iloc[-1]
        levels["DO"]            = _safe(curr.get("open"),  decimals)
        levels["current_price"] = _safe(curr.get("close"), decimals)
    else:
        logger.warning("No daily data – daily levels unavailable")

    # ── Weekly levels ─────────────────────────────────────────────────────────
    if weekly_df is not None and len(weekly_df) >= 2:
        prev_wk = weekly_df.iloc[-2]
        curr_wk = weekly_df.iloc[-1]
        levels["PWH"] = _safe(prev_wk.get("high"),  decimals)
        levels["PWL"] = _safe(prev_wk.get("low"),   decimals)
        levels["PWC"] = _safe(prev_wk.get("close"), decimals)
        levels["CWH"] = _safe(curr_wk.get("high"),  decimals)
        levels["CWL"] = _safe(curr_wk.get("low"),   decimals)
    else:
        logger.warning("Not enough weekly data – weekly levels unavailable")

    # ── Monthly levels ────────────────────────────────────────────────────────
    if monthly_df is not None and len(monthly_df) >= 2:
        prev_mo = monthly_df.iloc[-2]
        levels["PMH"] = _safe(prev_mo.get("high"), decimals)
        levels["PML"] = _safe(prev_mo.get("low"),  decimals)
    else:
        logger.warning("Not enough monthly data – monthly levels unavailable")

    return levels


# ── Summary calculator ────────────────────────────────────────────────────────

def calculate_summary(all_levels: Dict[str, Dict]) -> Dict[str, Dict]:
    """
    For each symbol, find the nearest named level above and below
    the current price, for both daily and weekly groups.

    Returns a dict keyed by symbol.
    """
    summaries: Dict[str, Dict] = {}

    DAILY_KEYS  = ("PDH", "PDL", "PDC", "DO")
    WEEKLY_KEYS = ("PWH", "PWL", "PWC", "CWH", "CWL")

    for symbol, levels in all_levels.items():
        if "error" in levels:
            summaries[symbol] = {"error": levels["error"]}
            continue

        current = levels.get("current_price")
        if current is None:
            summaries[symbol] = {"error": "current_price unavailable"}
            continue

        daily_named  = {k: levels[k] for k in DAILY_KEYS  if levels.get(k) is not None}
        weekly_named = {k: levels[k] for k in WEEKLY_KEYS if levels.get(k) is not None}
        all_named    = {**daily_named, **weekly_named}

        def closest_above(d: dict):
            above = {k: v for k, v in d.items() if v > current}
            if not above:
                return None, None
            name = min(above, key=lambda k: above[k] - current)
            return name, above[name]

        def closest_below(d: dict):
            below = {k: v for k, v in d.items() if v < current}
            if not below:
                return None, None
            name = max(below, key=lambda k: below[k])
            return name, below[name]

        da_name, da_val = closest_above(daily_named)
        db_name, db_val = closest_below(daily_named)
        wa_name, wa_val = closest_above(weekly_named)
        wb_name, wb_val = closest_below(weekly_named)

        # Main level: closest to current price from ALL levels
        if all_named:
            main_name = min(all_named, key=lambda k: abs(all_named[k] - current))
            main_val  = all_named[main_name]
        else:
            main_name, main_val = None, None

        summaries[symbol] = {
            "current_price":          current,
            "closest_daily_above":    {"name": da_name, "value": da_val},
            "closest_daily_below":    {"name": db_name, "value": db_val},
            "closest_weekly_above":   {"name": wa_name, "value": wa_val},
            "closest_weekly_below":   {"name": wb_name, "value": wb_val},
            "main_level_to_watch":    {"name": main_name, "value": main_val},
        }

    return summaries
