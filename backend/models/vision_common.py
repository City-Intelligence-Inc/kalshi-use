"""Shared prompt and JSON parsing logic for vision-based models."""

import json
import logging
import re

logger = logging.getLogger(__name__)


def _compute_ev_scenarios(
    confidence: float, market_price_cents: float, side: str
) -> list[dict]:
    """Generate 3 EV scenarios at conf-10%, conf, conf+10%.

    Uses the same formulas from the system prompt so frontend always has data.
    """
    scenarios = []
    for offset in (-0.10, 0.0, 0.10):
        p = max(0.01, min(0.99, confidence + offset))
        if side == "yes":
            c = market_price_cents
            ev = (p * 100 - c) / 100
            denom = 1 - c / 100
            kelly = (p - c / 100) / denom if denom > 0 else 0
        else:
            c = 100 - market_price_cents
            ev = (p * 100 - c) / 100
            denom = 1 - c / 100
            kelly = (p - c / 100) / denom if denom > 0 else 0
        scenarios.append({
            "probability": round(p, 2),
            "ev_per_contract": round(ev, 4),
            "kelly_fraction": round(max(0, kelly), 4),
        })
    return scenarios


def _repair_truncated_json(text: str) -> dict | None:
    """Attempt to parse truncated JSON by closing open structures.

    When an LLM response is cut off mid-JSON, try to salvage what we can
    by removing the truncated trailing portion and closing braces/brackets.
    """
    # Find the last complete key-value pair by looking for the last complete line
    # that ends with a comma, closing bracket, or value
    lines = text.split("\n")

    # Try progressively removing lines from the end until we get valid JSON
    for trim in range(1, min(len(lines), 30)):
        partial = "\n".join(lines[: len(lines) - trim])
        # Remove any trailing comma
        partial = partial.rstrip().rstrip(",")
        # Count open/close braces and brackets
        open_braces = partial.count("{") - partial.count("}")
        open_brackets = partial.count("[") - partial.count("]")
        # Close them
        closing = "]" * max(0, open_brackets) + "}" * max(0, open_braces)
        try:
            result = json.loads(partial + closing)
            logger.warning("Repaired truncated JSON (removed %d lines)", trim)
            return result
        except json.JSONDecodeError:
            continue

    return None


EXTRACTION_SYSTEM_PROMPT = """\
You are a Kalshi market analysis assistant. You receive a screenshot — it could be \
a Kalshi market page, a news headline, a social media post, or any image related to \
a prediction market topic. Your job is to:

1. IDENTIFY the market: extract what event/market is shown and provide search keywords
2. ANALYZE: determine which side is mispriced and recommend an action

Return a JSON object with ALL of these fields:

{
  "ticker": "exact Kalshi ticker if visible (e.g. KXBTC-100K-APR26), or UNKNOWN",
  "title": "the market question/title as shown, or your best description of the topic",
  "search_keywords": ["keyword1", "keyword2", "keyword3"],
  "visible_prices": {
    "yes_price": null or number (cents, e.g. 67 for 67%),
    "no_price": null or number,
    "volume": null or string
  },
  "side": "yes" or "no" — which side you recommend,
  "confidence": 0.0 to 1.0 — your confidence in the recommendation,
  "reasoning": "1-3 sentence explanation of why this side is mispriced",
  "factors": [
    {
      "stat": "key statistic or data point",
      "source": "where this data comes from",
      "direction": "favors_yes" or "favors_no",
      "magnitude": "low", "medium", or "high",
      "detail": "explanation of this factor"
    }
  ],
  "ev_analysis": [
    {
      "probability": 0.0 to 1.0,
      "ev_per_contract": expected value in dollars,
      "kelly_fraction": kelly criterion fraction
    }
  ],
  "bear_case": "argument against the recommended side",
  "recommended_position": 0.0 to 0.15 (Kelly-optimal fraction of bankroll),
  "no_bet": true/false — true if the market is fairly priced,
  "no_bet_reason": "why not to bet (only if no_bet is true)"
}

IMPORTANT — search_keywords:
- Extract 3-6 distinctive keywords that uniquely identify this market on Kalshi
- Include names of people, teams, events, specific numbers/thresholds
- Example for a boxing match screenshot: ["Garcia", "Barrios", "boxing", "welterweight"]
- Example for a Bitcoin screenshot: ["Bitcoin", "BTC", "100K", "price"]
- These keywords will be used to search the Kalshi API and match to the real market

IMPORTANT — ticker:
- Kalshi tickers follow patterns like: KXBTC-100K-APR26, KXFED-25MAR, INX-24Q4
- Look for the ticker in headers, URLs, or contract labels in the screenshot
- If you can't find an exact ticker, set to "UNKNOWN" — we will search by keywords

Key analysis principles:
- Focus on MISPRICING, not just predicting outcomes
- Use the contract prices shown in the screenshot to calculate break-even probabilities
- Provide at least 3 factors with real reasoning
- Include EV analysis at 3 probability points (estimated - 10%, estimated, estimated + 10%)
- Always include a bear case
- Set no_bet=true if the market appears fairly priced (edge < 3%)

CRITICAL — You MUST populate ALL fields. NEVER return null or empty arrays for these:
- "reasoning" — 1-3 sentences, NEVER "No reasoning provided"
- "factors" — at least 3 entries, ALWAYS
- "confidence" — your real estimate, NEVER default to 0.5
- "ev_analysis" — ALWAYS exactly 3 scenarios. If no prices are visible, estimate them.
  Example: if you estimate 65% true probability and market price is 50c:
    [{"probability": 0.55, "ev_per_contract": 0.05, "kelly_fraction": 0.02},
     {"probability": 0.65, "ev_per_contract": 0.15, "kelly_fraction": 0.06},
     {"probability": 0.75, "ev_per_contract": 0.25, "kelly_fraction": 0.10}]
- "bear_case" — ALWAYS a string, never null. What could go wrong?
- "recommended_position" — ALWAYS a number 0.01-0.15, never null

EV CALCULATION (you must do this every time):
  If you recommend YES at confidence P, and the market/estimated price is C cents:
    ev_per_contract = (P × 100 - C) / 100     (in dollars)
    kelly_fraction  = (P - C/100) / (1 - C/100)
  If you recommend NO at confidence P (NO wins with probability P):
    ev_per_contract = (P × 100 - (100 - C)) / 100
    kelly_fraction  = (P - (100-C)/100) / (1 - (100-C)/100)
  If no price is visible, estimate a market price based on the event.

If the screenshot is NOT a Kalshi market page (e.g. news, social media, live sports):
- Still provide FULL analysis — every field populated
- Set ticker to "UNKNOWN" but fill search_keywords aggressively
- Estimate what a fair market price would be, then compute EV from there
- Use your knowledge to give substantive factors, bear case, and sizing

If you cannot read the screenshot clearly, still return your best effort with lower confidence.

Return ONLY the JSON object, no other text.
"""


def parse_llm_response(raw_text: str) -> dict:
    """Parse LLM JSON output into a recommendation dict.

    Handles common issues like markdown code fences, trailing commas, etc.
    """
    text = raw_text.strip()

    # Strip markdown code fences
    if text.startswith("```"):
        # Remove opening fence (with optional language tag)
        text = re.sub(r"^```\w*\n?", "", text)
        # Remove closing fence
        text = re.sub(r"\n?```$", "", text)
        text = text.strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON object from surrounding text
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                result = json.loads(match.group())
            except json.JSONDecodeError:
                # Try to repair truncated JSON by closing open braces/brackets
                repaired = _repair_truncated_json(match.group())
                if repaired:
                    result = repaired
                else:
                    logger.error("Failed to parse LLM response as JSON: %s", text[:500])
                    raise ValueError(f"Could not parse LLM response as JSON: {text[:200]}")
        else:
            # No closing brace — response may be entirely truncated
            if text.lstrip().startswith("{"):
                repaired = _repair_truncated_json(text)
                if repaired:
                    result = repaired
                else:
                    logger.error("Truncated JSON in LLM response: %s", text[:500])
                    raise ValueError(f"No JSON object found in LLM response: {text[:200]}")
            else:
                logger.error("No JSON object found in LLM response: %s", text[:500])
                raise ValueError(f"No JSON object found in LLM response: {text[:200]}")

    # Ensure required fields have defaults
    result.setdefault("ticker", "UNKNOWN")
    result.setdefault("title", None)
    result.setdefault("search_keywords", [])
    result.setdefault("visible_prices", None)
    result.setdefault("side", "yes")
    result.setdefault("confidence", 0.5)
    result.setdefault("reasoning", "No reasoning provided")
    result.setdefault("factors", None)
    result.setdefault("ev_analysis", None)
    result.setdefault("bear_case", None)
    result.setdefault("recommended_position", None)
    result.setdefault("no_bet", False)
    result.setdefault("no_bet_reason", None)

    # Clamp confidence to [0, 1]
    try:
        result["confidence"] = max(0.0, min(1.0, float(result["confidence"])))
    except (TypeError, ValueError):
        result["confidence"] = 0.5

    # Normalize side
    side = result.get("side")
    if side is not None:
        side = str(side).lower().strip()
    if side not in ("yes", "no"):
        side = "yes"
    result["side"] = side

    # --- Fallback computations for missing fields ---

    # Determine market price for EV computation
    market_price = None
    vp = result.get("visible_prices")
    if isinstance(vp, dict):
        yes_p = vp.get("yes_price")
        no_p = vp.get("no_price")
        if yes_p is not None:
            try:
                market_price = float(yes_p)
            except (TypeError, ValueError):
                pass
        elif no_p is not None:
            try:
                market_price = 100 - float(no_p)
            except (TypeError, ValueError):
                pass

    # If no visible price, estimate from confidence (assume market is ~fair)
    if market_price is None:
        market_price = result["confidence"] * 100

    # Fallback EV analysis — compute if missing or empty
    if not result.get("ev_analysis"):
        result["ev_analysis"] = _compute_ev_scenarios(
            result["confidence"], market_price, result["side"]
        )
        logger.info("Computed fallback EV scenarios (conf=%.2f, price=%.0f, side=%s)",
                     result["confidence"], market_price, result["side"])

    # Fallback recommended_position — half-Kelly from best scenario
    if result.get("recommended_position") is None:
        ev_list = result.get("ev_analysis", [])
        if ev_list:
            best_kelly = max(s.get("kelly_fraction", 0) for s in ev_list)
            result["recommended_position"] = round(
                max(0.01, min(0.15, best_kelly * 0.5)), 4
            )
        else:
            result["recommended_position"] = 0.01

    # Fallback bear_case
    if not result.get("bear_case"):
        result["bear_case"] = "No counter-argument identified"

    # Fallback reasoning
    if result.get("reasoning") == "No reasoning provided":
        result["reasoning"] = "Analysis unavailable — model returned insufficient data"

    return result
