"""Hourly background loop that monitors tracked positions for price changes and settlements."""

import asyncio
import logging
from datetime import datetime, timezone

from backend.db import (
    get_all_users_with_active_positions,
    get_push_token_for_user,
    update_tracked_position,
)
from backend.kalshi_api import fetch_market
from backend.notifications import send_push

logger = logging.getLogger(__name__)

MONITOR_INTERVAL_SECONDS = 60 * 60  # 1 hour
POSITION_CHECK_DELAY = 0.5  # seconds between per-position API calls


async def _check_position(pos: dict) -> dict | None:
    """Check a single position against live market data.

    Returns a summary dict if something changed, or None if nothing notable.
    """
    ticker = pos.get("ticker")
    position_id = pos.get("position_id")
    if not ticker or not position_id:
        return None

    loop = asyncio.get_event_loop()
    market = await loop.run_in_executor(None, fetch_market, ticker)
    if not market:
        return None

    now = datetime.now(timezone.utc).isoformat()
    result = market.get("result")
    side = pos.get("side", "yes")
    entry_price = pos.get("entry_price", 0)

    # ── Settlement detection ──
    if result in ("yes", "no"):
        if side == result:
            settlement_price = 100
            realized_pnl = round(settlement_price - entry_price, 2)
            status = "settled_win"
        else:
            settlement_price = 0
            realized_pnl = round(-entry_price, 2)
            status = "settled_loss"

        update_tracked_position(position_id, {
            "status": status,
            "settlement_price": settlement_price,
            "realized_pnl": realized_pnl,
            "settled_at": now,
            "updated_at": now,
        })

        # Update bot milestones on settlement
        try:
            from backend.bot_engine import record_settlement
            record_settlement(pos.get("user_id"))
        except Exception:
            logger.exception("Failed to update progress on settlement")

        won = status == "settled_win"
        sign = "+" if won else ""
        return {
            "type": "settlement",
            "ticker": ticker,
            "won": won,
            "pnl": f"{sign}{realized_pnl}¢",
        }

    # ── Price change detection ──
    yes_price = market.get("yes_ask") or market.get("last_price")
    if yes_price is None:
        return None

    if side == "yes":
        current_price = yes_price
    else:
        current_price = 100 - yes_price

    last_notified = pos.get("last_notified_price", entry_price)
    delta = round(current_price - last_notified, 2)

    if abs(delta) < 1:
        return None  # no meaningful change

    update_tracked_position(position_id, {
        "last_notified_price": current_price,
        "last_notified_at": now,
        "updated_at": now,
    })

    sign = "+" if delta > 0 else ""
    return {
        "type": "price_move",
        "ticker": ticker,
        "delta": f"{sign}{delta}¢",
    }


async def _monitor_once():
    """Run a single monitoring cycle across all users with active positions."""
    try:
        grouped = get_all_users_with_active_positions()
    except Exception:
        logger.exception("Failed to scan active positions")
        return

    if not grouped:
        logger.info("Position monitor: no active positions")
        return

    logger.info("Position monitor: checking %d users", len(grouped))

    for user_id, positions in grouped.items():
        token = get_push_token_for_user(user_id)
        if not token:
            continue

        settlements: list[str] = []
        moves: list[str] = []

        for pos in positions:
            try:
                change = await _check_position(pos)
                if change:
                    if change["type"] == "settlement":
                        emoji = "W" if change["won"] else "L"
                        settlements.append(f"{change['ticker']} {emoji} {change['pnl']}")
                    elif change["type"] == "price_move":
                        moves.append(f"{change['ticker']} {change['delta']}")
            except Exception:
                logger.exception("Error checking position %s", pos.get("position_id"))

            await asyncio.sleep(POSITION_CHECK_DELAY)

        # Build digest notification
        parts: list[str] = []
        if settlements:
            parts.append("Settled: " + ", ".join(settlements))
        if moves:
            parts.append("Moved: " + ", ".join(moves))

        if parts:
            body = " | ".join(parts)
            await send_push(
                token, "Position Update", body,
                data={"type": "position_update", "user_id": user_id},
            )
            logger.info("Sent digest to %s: %s", user_id, body)


async def monitor_positions_loop():
    """Main entry point — runs forever, checking every MONITOR_INTERVAL_SECONDS."""
    logger.info("Position monitor started (interval=%ds)", MONITOR_INTERVAL_SECONDS)
    while True:
        try:
            await _monitor_once()
        except Exception:
            logger.exception("Position monitor cycle failed")
        await asyncio.sleep(MONITOR_INTERVAL_SECONDS)
