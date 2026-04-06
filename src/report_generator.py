"""
report_generator.py
Produces report.txt, report.json, and report.csv in the dated output folder.
"""

import csv
import json
import logging
import os
from datetime import datetime
from typing import Dict, Optional

import pytz

from src.levels_calculator import calculate_summary

logger = logging.getLogger("edgeflow")

# Level display order and human-readable labels
LEVEL_META = [
    ("PDH", "PDH  (Previous Day High)  "),
    ("PDL", "PDL  (Previous Day Low)   "),
    ("PDC", "PDC  (Previous Day Close) "),
    ("DO",  "DO   (Daily Open)         "),
    ("PWH", "PWH  (Prev Week High)     "),
    ("PWL", "PWL  (Prev Week Low)      "),
    ("PWC", "PWC  (Prev Week Close)    "),
    ("CWH", "CWH  (Current Week High)  "),
    ("CWL", "CWL  (Current Week Low)   "),
    ("PMH", "PMH  (Prev Month High)    "),
    ("PML", "PML  (Prev Month Low)     "),
]

SEP  = "=" * 60
LINE = "-" * 60


def _fmt(value: Optional[float], decimals: int = 5) -> str:
    """Format a float or return 'N/A (data unavailable)'."""
    if value is None:
        return "N/A  ← data unavailable"
    return f"{value:.{decimals}f}"


def _decimals_for(symbol: str, config: dict) -> int:
    return config.get("symbol_config", {}).get(symbol, {}).get("decimals", 5)


class ReportGenerator:
    def __init__(self, config: dict):
        self.config   = config
        self.timezone = config.get("timezone", "Europe/London")

    def _now_str(self) -> str:
        tz  = pytz.timezone(self.timezone)
        now = datetime.now(tz)
        return now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S"), now.strftime("%Z")

    def generate_all(
        self,
        all_levels: Dict[str, Dict],
        output_dir: str,
        data_source: str,
    ) -> None:
        """Write report.txt, report.json, report.csv into output_dir."""
        date_str, time_str, tz_label = self._now_str()
        summaries = calculate_summary(all_levels)

        self._write_txt(all_levels, summaries, output_dir, date_str, time_str, tz_label, data_source)
        self._write_json(all_levels, summaries, output_dir, date_str, time_str, tz_label, data_source)
        self._write_csv(all_levels, output_dir, date_str)

        logger.info(f"Reports written to: {output_dir}")

    # ── TXT ──────────────────────────────────────────────────────────────────

    def _write_txt(
        self,
        all_levels: Dict,
        summaries: Dict,
        output_dir: str,
        date_str: str,
        time_str: str,
        tz_label: str,
        data_source: str,
    ) -> None:
        lines = []
        lines.append(SEP)
        lines.append("  EDGEFLOW — DAILY TRADING LEVELS")
        lines.append(SEP)
        lines.append(f"  DATE         : {date_str}")
        lines.append(f"  TIME         : {time_str}")
        lines.append(f"  TIMEZONE     : {self.timezone}  ({tz_label})")
        lines.append(f"  SOURCE       : {data_source}")
        lines.append(SEP)
        lines.append("")

        for symbol, levels in all_levels.items():
            dec = _decimals_for(symbol, self.config)
            lines.append(f"  {symbol}")
            lines.append("  " + LINE)

            if "error" in levels:
                lines.append(f"  !! ERROR: {levels['error']}")
            else:
                for key, label in LEVEL_META:
                    val = levels.get(key)
                    lines.append(f"  - {label}: {_fmt(val, dec)}")
                cp = levels.get("current_price")
                lines.append(f"  - {'Current Price (approx)   ':27s}: {_fmt(cp, dec)}")
                src = levels.get("source", "")
                lines.append(f"  - {'Data source              ':27s}: {src}")

            lines.append("")

        # ── SUMMARY ──────────────────────────────────────────────────────────
        lines.append(SEP)
        lines.append("  SUMMARY")
        lines.append(SEP)

        for symbol, smry in summaries.items():
            dec = _decimals_for(symbol, self.config)
            lines.append(f"\n  {symbol}")
            lines.append("  " + LINE)

            if "error" in smry:
                lines.append(f"  !! {smry['error']}")
                continue

            cp = smry["current_price"]
            lines.append(f"  Current price (approx)          : {_fmt(cp, dec)}")

            def _smry_line(label, entry):
                if entry["name"] is None:
                    return f"  {label:38s}: N/A"
                dist = entry["value"] - cp
                sign = "+" if dist >= 0 else ""
                return (
                    f"  {label:38s}: {entry['name']}  @  {_fmt(entry['value'], dec)}"
                    f"  ({sign}{dist:.{dec}f})"
                )

            lines.append(_smry_line("Closest daily level ABOVE price", smry["closest_daily_above"]))
            lines.append(_smry_line("Closest daily level BELOW price", smry["closest_daily_below"]))
            lines.append(_smry_line("Closest weekly level ABOVE price", smry["closest_weekly_above"]))
            lines.append(_smry_line("Closest weekly level BELOW price", smry["closest_weekly_below"]))

            ml = smry["main_level_to_watch"]
            if ml["name"]:
                dist = abs(ml["value"] - cp)
                lines.append(
                    f"  >> MAIN LEVEL TO WATCH          : {ml['name']}  @  "
                    f"{_fmt(ml['value'], dec)}  (dist: {dist:.{dec}f})"
                )
            else:
                lines.append("  >> MAIN LEVEL TO WATCH          : N/A")

        lines.append("")
        lines.append(SEP)

        path = os.path.join(output_dir, "report.txt")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("\n".join(lines))
        logger.info(f"  report.txt written")

    # ── JSON ─────────────────────────────────────────────────────────────────

    def _write_json(
        self,
        all_levels: Dict,
        summaries: Dict,
        output_dir: str,
        date_str: str,
        time_str: str,
        tz_label: str,
        data_source: str,
    ) -> None:
        payload = {
            "metadata": {
                "date":      date_str,
                "time":      time_str,
                "timezone":  f"{self.timezone} ({tz_label})",
                "source":    data_source,
                "generator": "Edgeflow",
            },
            "levels":   all_levels,
            "summary":  summaries,
        }
        path = os.path.join(output_dir, "report.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, default=str)
        logger.info(f"  report.json written")

    # ── CSV ──────────────────────────────────────────────────────────────────

    def _write_csv(
        self,
        all_levels: Dict,
        output_dir: str,
        date_str: str,
    ) -> None:
        headers = [
            "date", "symbol",
            "PDH", "PDL", "PDC", "DO",
            "PWH", "PWL", "PWC",
            "CWH", "CWL",
            "PMH", "PML",
            "current_price", "source",
        ]

        path = os.path.join(output_dir, "report.csv")
        with open(path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=headers, extrasaction="ignore")
            writer.writeheader()
            for symbol, levels in all_levels.items():
                row = {"date": date_str, "symbol": symbol}
                if "error" in levels:
                    row["source"] = f"ERROR: {levels['error']}"
                else:
                    for key in headers[2:]:
                        val = levels.get(key)
                        row[key] = val if val is not None else "N/A"
                writer.writerow(row)
        logger.info(f"  report.csv written")
