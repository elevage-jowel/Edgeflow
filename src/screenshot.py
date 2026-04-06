"""
screenshot.py
Takes TradingView chart screenshots using Playwright (headless Chromium).

Cookie persistence:
  After the first run, TradingView session cookies are saved to
  .tv_session.json so subsequent runs remain authenticated without
  re-entering credentials.

Usage:
  from src.screenshot import take_screenshots
  take_screenshots(config, all_levels, output_dir, logger)
"""

import json
import logging
import os
from typing import Dict

logger = logging.getLogger("edgeflow")

_COOKIES_FILE = ".tv_session.json"
_CHART_WAIT_MS = 6000          # ms to wait for chart to render
_VIEWPORT = {"width": 1920, "height": 1080}

# TradingView chart URL template (Daily interval = D)
_CHART_URL = "https://www.tradingview.com/chart/?symbol={exchange}:{symbol}&interval=D"
_LOGIN_URL  = "https://www.tradingview.com/accounts/signin/"


def _load_cookies(path: str):
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            pass
    return None


def _save_cookies(context, path: str) -> None:
    try:
        cookies = context.cookies()
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(cookies, fh)
    except Exception as exc:
        logger.warning(f"Could not save session cookies: {exc}")


def _try_login(page, username: str, password: str) -> bool:
    """
    Attempt to log in to TradingView.
    Returns True if login appeared successful, False otherwise.
    TradingView uses dynamic forms; we attempt a best-effort login.
    """
    try:
        page.goto(_LOGIN_URL, timeout=30_000, wait_until="domcontentloaded")
        page.wait_for_timeout(2000)

        # Click "Email" sign-in option if present
        email_btn = page.query_selector("button[name='Email']")
        if email_btn:
            email_btn.click()
            page.wait_for_timeout(1000)

        page.fill("input[name='username']", username)
        page.fill("input[name='password']", password)

        # Submit
        page.keyboard.press("Enter")
        page.wait_for_timeout(4000)

        # If URL no longer contains "signin", login likely succeeded
        current_url = page.url
        return "signin" not in current_url
    except Exception as exc:
        logger.warning(f"Login attempt failed: {exc}")
        return False


def take_screenshots(
    config: dict,
    all_levels: Dict[str, Dict],
    output_dir: str,
) -> None:
    """
    Capture one Daily chart screenshot per symbol and save as
    <SYMBOL>_chart.png inside output_dir.
    """
    if not config.get("screenshot", False):
        return

    try:
        from playwright.sync_api import sync_playwright  # type: ignore
    except ImportError:
        logger.error(
            "Playwright is not installed. Run: pip install playwright && playwright install chromium"
        )
        return

    sym_cfg  = config.get("symbol_config", {})
    tv_creds = config.get("tradingview", {})
    username = tv_creds.get("username", "")
    password = tv_creds.get("password", "")

    # Resolve cookies file relative to project root
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cookies_path = os.path.join(project_root, _COOKIES_FILE)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport=_VIEWPORT)

        # ── Restore saved session ────────────────────────────────────────────
        cookies = _load_cookies(cookies_path)
        if cookies:
            try:
                context.add_cookies(cookies)
                logger.info("Screenshot: restored saved TradingView session")
            except Exception as exc:
                logger.warning(f"Screenshot: could not restore cookies ({exc})")

        page = context.new_page()

        # ── Login if credentials provided and no saved session ───────────────
        if username and password and not cookies:
            logger.info("Screenshot: attempting TradingView login …")
            ok = _try_login(page, username, password)
            if ok:
                logger.info("Screenshot: login successful")
                _save_cookies(context, cookies_path)
            else:
                logger.warning(
                    "Screenshot: login may have failed (CAPTCHA / 2FA). "
                    "Charts will be captured in unauthenticated mode."
                )

        # ── Capture each chart ───────────────────────────────────────────────
        for symbol, levels in all_levels.items():
            if "error" in levels:
                logger.warning(f"Screenshot: skipping {symbol} (data error)")
                continue

            cfg      = sym_cfg.get(symbol, {})
            exchange = cfg.get("tv_exchange", "FX_IDC")
            tv_sym   = cfg.get("tv_symbol", symbol)
            url      = _CHART_URL.format(exchange=exchange, symbol=tv_sym)

            try:
                page.goto(url, timeout=30_000, wait_until="domcontentloaded")
                page.wait_for_timeout(_CHART_WAIT_MS)   # let chart render

                out_path = os.path.join(output_dir, f"{symbol}_chart.png")
                page.screenshot(path=out_path, full_page=False)
                logger.info(f"Screenshot: {symbol} → {os.path.basename(out_path)}")

            except Exception as exc:
                logger.warning(f"Screenshot: {symbol} failed — {exc}")

        # ── Persist refreshed cookies ────────────────────────────────────────
        _save_cookies(context, cookies_path)
        browser.close()
