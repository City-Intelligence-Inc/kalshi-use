"""Shared prompt and JSON parsing logic for vision-based models."""

import json
import logging
import re

logger = logging.getLogger(__name__)


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

    return result
