"""Shared prompt and JSON parsing logic for vision-based models."""

import json
import logging
import re

logger = logging.getLogger(__name__)

EXTRACTION_SYSTEM_PROMPT = """\
You are a Kalshi market analysis assistant. You receive a screenshot of a Kalshi \
prediction market page and must extract structured data from it.

Analyze the screenshot and return a JSON object with these fields:

{
  "ticker": "the market ticker (e.g. KXBTC-100K-APR26)",
  "title": "the market question/title",
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

Key principles:
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
                logger.error("Failed to parse LLM response as JSON: %s", text[:500])
                raise ValueError(f"Could not parse LLM response as JSON: {text[:200]}")
        else:
            logger.error("No JSON object found in LLM response: %s", text[:500])
            raise ValueError(f"No JSON object found in LLM response: {text[:200]}")

    # Ensure required fields have defaults
    result.setdefault("ticker", "UNKNOWN")
    result.setdefault("title", None)
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
    result["confidence"] = max(0.0, min(1.0, float(result["confidence"])))

    # Normalize side
    result["side"] = result["side"].lower().strip()
    if result["side"] not in ("yes", "no"):
        result["side"] = "yes"

    return result
