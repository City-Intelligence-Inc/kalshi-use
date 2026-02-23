"""Bot engine: milestone tracking, strategy derivation, and signal generation."""

import logging
from collections import Counter
from datetime import datetime, timezone

from backend.db import (
    get_tracked_positions_by_user,
    get_user_progress,
    put_user_progress,
    update_user_progress,
)
from backend.kalshi_api import fetch_events, fetch_market

logger = logging.getLogger(__name__)

# Starting paper balance: $100 = 10000 cents
STARTING_PAPER_BALANCE = 10000

MILESTONES = [
    {"id": "m1", "name": "First Steps", "description": "Track your first position", "target": 1, "field": "total_positions"},
    {"id": "m2", "name": "Getting Serious", "description": "Track 5 positions", "target": 5, "field": "total_positions"},
    {"id": "m3", "name": "Skin in the Game", "description": "First settled position", "target": 1, "field": "settled_positions"},
    {"id": "m4", "name": "Consistency", "description": "7-day check-in streak", "target": 7, "field": "current_streak"},
    {"id": "m5", "name": "Data Rich", "description": "25 positions with outcomes", "target": 25, "field": "settled_positions"},
    {"id": "m6", "name": "Bot Ready", "description": "Your bot is ready to trade", "target": 25, "field": "settled_positions"},
]


def _init_progress(user_id: str) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    milestones = [
        {
            "id": m["id"],
            "name": m["name"],
            "description": m["description"],
            "target": m["target"],
            "current": 0,
            "completed": False,
            "completed_at": None,
        }
        for m in MILESTONES
    ]
    progress = {
        "user_id": user_id,
        "milestones": milestones,
        "current_streak": 0,
        "longest_streak": 0,
        "last_check_in": None,
        "check_in_dates": [],
        "total_check_ins": 0,
        "bot_ready": False,
        "total_positions": 0,
        "settled_positions": 0,
        "paper_balance": STARTING_PAPER_BALANCE,
        "created_at": now,
        "updated_at": now,
    }
    put_user_progress(progress)
    return progress


def get_or_create_progress(user_id: str) -> dict:
    progress = get_user_progress(user_id)
    if not progress:
        progress = _init_progress(user_id)
    # Backfill paper_balance for existing users
    if "paper_balance" not in progress:
        progress["paper_balance"] = STARTING_PAPER_BALANCE
    return progress


def _recompute_milestones(progress: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    for milestone in progress["milestones"]:
        m_def = next((m for m in MILESTONES if m["id"] == milestone["id"]), None)
        if not m_def:
            continue
        current_value = progress.get(m_def["field"], 0)
        milestone["current"] = current_value
        if not milestone["completed"] and current_value >= milestone["target"]:
            milestone["completed"] = True
            milestone["completed_at"] = now

    m6 = next((m for m in progress["milestones"] if m["id"] == "m6"), None)
    progress["bot_ready"] = m6["completed"] if m6 else False
    progress["updated_at"] = now
    return progress


def _recount_positions(user_id: str, progress: dict) -> dict:
    """Recount position stats from DB for accuracy."""
    positions = get_tracked_positions_by_user(user_id)
    progress["total_positions"] = len(positions)
    settled = [p for p in positions if p.get("status", "").startswith("settled")]
    progress["settled_positions"] = len(settled)

    # Recompute paper balance from trade history
    balance = STARTING_PAPER_BALANCE
    for p in positions:
        entry = p.get("entry_price", 0)
        status = p.get("status", "")
        balance -= entry  # deduct entry cost
        if status == "settled_win":
            balance += 100  # win pays $1 (100 cents)
        elif status == "settled_loss":
            pass  # already deducted entry, payout is 0
        elif status == "closed":
            balance += entry  # refund on close
    progress["paper_balance"] = round(balance, 2)
    return progress


def record_position_tracked(user_id: str) -> dict:
    progress = get_or_create_progress(user_id)
    progress = _recount_positions(user_id, progress)
    progress = _recompute_milestones(progress)
    put_user_progress(progress)
    return progress


def record_settlement(user_id: str) -> dict:
    progress = get_or_create_progress(user_id)
    progress = _recount_positions(user_id, progress)
    progress = _recompute_milestones(progress)
    put_user_progress(progress)
    return progress


def record_check_in(user_id: str) -> dict:
    progress = get_or_create_progress(user_id)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    check_in_dates = progress.get("check_in_dates", [])
    if check_in_dates and check_in_dates[-1] == today:
        return progress  # already checked in today

    check_in_dates.append(today)
    progress["check_in_dates"] = check_in_dates
    progress["last_check_in"] = datetime.now(timezone.utc).isoformat()
    progress["total_check_ins"] = len(check_in_dates)

    # Compute streak: consecutive days backwards from today
    streak = 1
    for i in range(len(check_in_dates) - 2, -1, -1):
        prev = datetime.strptime(check_in_dates[i], "%Y-%m-%d").date()
        curr = datetime.strptime(check_in_dates[i + 1], "%Y-%m-%d").date()
        if (curr - prev).days == 1:
            streak += 1
        else:
            break

    progress["current_streak"] = streak
    progress["longest_streak"] = max(progress.get("longest_streak", 0), streak)
    progress = _recompute_milestones(progress)
    put_user_progress(progress)
    return progress


# ── Position Sizing (Kelly Criterion) ──


def _position_sizing(balance: float, entry_price: float, confidence: float, win_rate: float) -> dict:
    """Kelly-inspired position sizing based on wallet balance.

    Small wallets get conservative sizing; large wallets can diversify more.
    """
    if balance <= 0 or entry_price <= 0:
        return {"suggested_qty": 0, "max_risk_pct": 0, "risk_tier": "broke", "max_positions": 0, "kelly_fraction": 0}

    # Risk tier based on balance
    if balance < 2000:  # < $20
        risk_tier = "conservative"
        max_risk_pct = 0.05  # risk at most 5% per trade
        max_positions = 3
    elif balance < 5000:  # < $50
        risk_tier = "moderate"
        max_risk_pct = 0.08
        max_positions = 5
    else:  # >= $50
        risk_tier = "aggressive"
        max_risk_pct = 0.10
        max_positions = 8

    # Kelly fraction: f = (p * b - q) / b where b = payout odds, p = win prob, q = 1-p
    # For binary markets: b = (100 / entry_price) - 1
    payout_odds = (100 / entry_price) - 1 if entry_price < 100 else 0.01
    q = 1 - win_rate
    kelly = max(0, (win_rate * payout_odds - q) / payout_odds)

    # Use half-Kelly for safety, capped by risk tier
    half_kelly = kelly / 2
    risk_fraction = min(half_kelly, max_risk_pct)

    # Suggested quantity (number of contracts at entry_price cents each)
    max_spend = balance * risk_fraction
    suggested_qty = max(1, int(max_spend / entry_price))

    return {
        "suggested_qty": suggested_qty,
        "max_risk_pct": round(risk_fraction * 100, 1),
        "risk_tier": risk_tier,
        "max_positions": max_positions,
        "kelly_fraction": round(kelly, 4),
    }


# ── Strategy Derivation ──


def derive_strategy(user_id: str) -> dict:
    positions = get_tracked_positions_by_user(user_id)
    settled = [p for p in positions if p.get("status", "").startswith("settled")]

    if len(settled) < 5:
        return {
            "user_id": user_id,
            "total_trades": len(settled),
            "win_rate": 0,
            "preferred_categories": [],
            "preferred_side": "balanced",
            "preferred_entry_band": "mid",
            "avg_entry_price": 0,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "insufficient_data": True,
        }

    wins = [p for p in settled if p["status"] == "settled_win"]
    win_rate = len(wins) / len(settled)

    # Category analysis
    cat_wins: Counter = Counter()
    cat_total: Counter = Counter()
    for p in settled:
        snap = p.get("market_snapshot_at_entry") or {}
        cat = snap.get("category") or "Unknown"
        cat_total[cat] += 1
        if p["status"] == "settled_win":
            cat_wins[cat] += 1

    preferred_categories = []
    for cat, total in cat_total.most_common(5):
        w = cat_wins.get(cat, 0)
        preferred_categories.append({
            "category": cat,
            "win_rate": round(w / total, 3) if total else 0,
            "count": total,
        })

    # Side preference
    yes_total = sum(1 for p in settled if p.get("side") == "yes")
    no_total = sum(1 for p in settled if p.get("side") == "no")
    yes_wins = sum(1 for p in wins if p.get("side") == "yes")
    no_wins = sum(1 for p in wins if p.get("side") == "no")
    yes_wr = yes_wins / yes_total if yes_total else 0
    no_wr = no_wins / no_total if no_total else 0

    if abs(yes_wr - no_wr) < 0.1:
        preferred_side = "balanced"
    elif yes_wr > no_wr:
        preferred_side = "yes"
    else:
        preferred_side = "no"

    # Entry price band
    entry_prices = [p.get("entry_price", 50) for p in settled]
    avg_entry = sum(entry_prices) / len(entry_prices)

    band_wins = {"low": 0, "mid": 0, "high": 0}
    band_total = {"low": 0, "mid": 0, "high": 0}
    for p in settled:
        ep = p.get("entry_price", 50)
        band = "low" if ep < 30 else ("high" if ep > 70 else "mid")
        band_total[band] += 1
        if p["status"] == "settled_win":
            band_wins[band] += 1

    best_band = "mid"
    best_wr = 0
    for band, total in band_total.items():
        if total >= 2:
            wr = band_wins[band] / total
            if wr > best_wr:
                best_wr = wr
                best_band = band

    # Balance-aware strategy context
    progress = get_or_create_progress(user_id)
    balance = progress.get("paper_balance", STARTING_PAPER_BALANCE)
    sizing = _position_sizing(balance, round(avg_entry) or 50, win_rate, win_rate)

    return {
        "user_id": user_id,
        "total_trades": len(settled),
        "win_rate": round(win_rate, 3),
        "preferred_categories": preferred_categories,
        "preferred_side": preferred_side,
        "preferred_entry_band": best_band,
        "avg_entry_price": round(avg_entry, 1),
        "yes_win_rate": round(yes_wr, 3),
        "no_win_rate": round(no_wr, 3),
        "paper_balance": balance,
        "risk_tier": sizing["risk_tier"],
        "suggested_qty_per_trade": sizing["suggested_qty"],
        "max_risk_pct": sizing["max_risk_pct"],
        "kelly_fraction": sizing["kelly_fraction"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Signal Generation ──


def _score_market(market: dict, strategy: dict) -> float:
    score = 0.0
    category = market.get("_category", "")

    for cat_pref in strategy.get("preferred_categories", []):
        if cat_pref["category"] == category and cat_pref["win_rate"] > 0.5:
            score += 3.0 * cat_pref["win_rate"]
            break

    yes_price = market.get("yes_ask") or market.get("last_price") or 50
    preferred_band = strategy.get("preferred_entry_band", "mid")
    if preferred_band == "low" and yes_price < 30:
        score += 2.0
    elif preferred_band == "mid" and 30 <= yes_price <= 70:
        score += 2.0
    elif preferred_band == "high" and yes_price > 70:
        score += 2.0
    elif 30 <= yes_price <= 70:
        score += 1.0

    vol_24h = market.get("volume_24h") or 0
    if vol_24h > 1000:
        score += 1.0
    elif vol_24h > 100:
        score += 0.5

    oi = market.get("open_interest") or 0
    if oi > 500:
        score += 1.0
    elif oi > 100:
        score += 0.5

    yes_bid = market.get("yes_bid") or 0
    yes_ask = market.get("yes_ask") or 0
    spread = yes_ask - yes_bid if yes_ask and yes_bid else 0
    if spread > 10:
        score -= 1.0

    last_price = market.get("last_price") or 50
    if last_price > 95 or last_price < 5:
        score -= 3.0

    return max(0, score)


def _pick_side(market: dict, strategy: dict) -> str:
    preferred = strategy.get("preferred_side", "balanced")
    if preferred in ("yes", "no"):
        return preferred
    yes_price = market.get("last_price") or 50
    return "yes" if yes_price < 50 else "no"


def _build_reasoning(market: dict, strategy: dict, score: float) -> str:
    parts = []
    category = market.get("_category", "Unknown")
    for cat_pref in strategy.get("preferred_categories", []):
        if cat_pref["category"] == category:
            wr = int(cat_pref["win_rate"] * 100)
            parts.append(f"You win {wr}% in {category}")
            break

    yes_price = market.get("last_price") or 50
    band = "low" if yes_price < 30 else ("high" if yes_price > 70 else "mid")
    if band == strategy.get("preferred_entry_band"):
        parts.append(f"Price in your best range ({band})")

    vol = market.get("volume_24h") or 0
    if vol > 1000:
        parts.append(f"Active market ({vol:,}/24h)")

    if not parts:
        parts.append(f"Matches your patterns (score {score:.1f})")
    return ". ".join(parts)


def generate_signals(user_id: str, max_signals: int = 5) -> list[dict]:
    strategy = derive_strategy(user_id)
    if strategy.get("insufficient_data"):
        return []

    # Get current balance for position sizing
    progress = get_or_create_progress(user_id)
    balance = progress.get("paper_balance", STARTING_PAPER_BALANCE)

    events = fetch_events(status="open", limit=200)
    all_markets = []
    for event in events:
        category = event.get("category", "")
        for m in event.get("markets", []):
            m["_category"] = category
            m["_event_title"] = event.get("title", "")
            all_markets.append(m)

    scored = []
    for m in all_markets:
        s = _score_market(m, strategy)
        if s > 0:
            scored.append((m, s))

    scored.sort(key=lambda x: x[1], reverse=True)

    # Limit signals based on balance (small wallet = fewer picks)
    sizing_info = _position_sizing(balance, 50, strategy.get("win_rate", 0.5), strategy.get("win_rate", 0.5))
    effective_max = min(max_signals, sizing_info.get("max_positions", 5))

    signals = []
    for market, score in scored[:effective_max]:
        side = _pick_side(market, strategy)
        yes_price = market.get("yes_ask") or market.get("last_price") or 50
        price = yes_price if side == "yes" else (100 - yes_price)

        confidence = min(0.95, round(score / 10, 2))
        sizing = _position_sizing(balance, price, confidence, strategy.get("win_rate", 0.5))

        signals.append({
            "ticker": market.get("ticker"),
            "title": market.get("title") or market.get("_event_title"),
            "side": side,
            "confidence": confidence,
            "reasoning": _build_reasoning(market, strategy, score),
            "match_score": round(score, 2),
            "category": market.get("_category"),
            "current_price": market.get("last_price"),
            "entry_price_suggestion": price,
            "suggested_qty": sizing["suggested_qty"],
            "risk_tier": sizing["risk_tier"],
            "max_risk_pct": sizing["max_risk_pct"],
        })

    return signals
