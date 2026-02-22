"""Kalshi public API client for live market data enrichment."""

import logging

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"
TIMEOUT = 10.0


def _client() -> httpx.Client:
    return httpx.Client(base_url=BASE_URL, timeout=TIMEOUT)


def fetch_market(ticker: str) -> dict | None:
    """GET /markets/{ticker} → live prices, volume, status."""
    try:
        with _client() as c:
            r = c.get(f"/markets/{ticker}")
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json().get("market")
    except httpx.HTTPStatusError:
        logger.exception("Kalshi market fetch failed for %s", ticker)
        return None
    except httpx.HTTPError:
        logger.exception("Kalshi market fetch error for %s", ticker)
        return None


def fetch_orderbook(ticker: str) -> dict | None:
    """GET /markets/{ticker}/orderbook → bid/ask depth."""
    try:
        with _client() as c:
            r = c.get(f"/markets/{ticker}/orderbook")
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json().get("orderbook")
    except httpx.HTTPStatusError:
        logger.exception("Kalshi orderbook fetch failed for %s", ticker)
        return None
    except httpx.HTTPError:
        logger.exception("Kalshi orderbook fetch error for %s", ticker)
        return None


def fetch_event(event_ticker: str) -> dict | None:
    """GET /events/{event_ticker} → related markets, settlement info."""
    try:
        with _client() as c:
            r = c.get(f"/events/{event_ticker}")
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json().get("event")
    except httpx.HTTPStatusError:
        logger.exception("Kalshi event fetch failed for %s", event_ticker)
        return None
    except httpx.HTTPError:
        logger.exception("Kalshi event fetch error for %s", event_ticker)
        return None


def fetch_events(status: str = "open", limit: int = 200) -> list[dict]:
    """GET /events → list of events, optionally filtered by status."""
    try:
        with _client() as c:
            params = {"limit": limit, "with_nested_markets": True}
            if status:
                params["status"] = status
            r = c.get("/events", params=params)
            r.raise_for_status()
            return r.json().get("events", [])
    except httpx.HTTPError:
        logger.exception("Kalshi events fetch failed")
        return []


def _score_title(event_title: str, keywords: list[str]) -> int:
    """Score how well an event title matches a set of keywords."""
    title_lower = event_title.lower()
    return sum(1 for kw in keywords if kw in title_lower)


def match_market(
    extracted_ticker: str | None,
    extracted_title: str | None,
    search_keywords: list[str] | None = None,
) -> dict | None:
    """Try to match extracted image info to a real Kalshi market.

    Strategy:
      1. Direct ticker lookup (fast path)
      2. Keyword search through active events (fallback)

    Returns the matched market dict or None.
    """
    # 1. Direct ticker lookup
    if extracted_ticker and extracted_ticker.upper() != "UNKNOWN":
        market = fetch_market(extracted_ticker)
        if market:
            return market

    # 2. Build keyword list from title + explicit keywords
    keywords: list[str] = []
    if search_keywords:
        keywords.extend(kw.lower() for kw in search_keywords if len(kw) > 2)
    if extracted_title:
        keywords.extend(
            w.lower() for w in extracted_title.split()
            if len(w) > 2 and w.lower() not in ("the", "will", "and", "for", "who", "what")
        )

    if not keywords:
        return None

    # Fetch active events and score by keyword overlap
    events = fetch_events(status="open", limit=200)
    best_event = None
    best_score = 0

    for event in events:
        event_title = event.get("title", "")
        score = _score_title(event_title, keywords)
        if score > best_score:
            best_score = score
            best_event = event

    if not best_event or best_score < 2:
        return None

    # Return the first active market from the best-matching event
    markets = best_event.get("markets", [])
    if not markets:
        # Event found but no nested markets — fetch via event_ticker
        event_ticker = best_event.get("event_ticker")
        if event_ticker:
            event_detail = fetch_event(event_ticker)
            if event_detail:
                markets = event_detail.get("markets", [])

    for m in markets:
        if m.get("status") in ("active", "open", "live"):
            return m

    return markets[0] if markets else None


def enrich_prediction(ticker: str) -> dict:
    """Fetch live market data for a ticker. Never raises — always returns a dict.

    Returns dict with:
      status: "found" | "not_found" | "error"
      + pricing, volume, orderbook, event fields when available
    """
    if not ticker or ticker.upper() == "UNKNOWN":
        return {"status": "not_found", "reason": "no_ticker"}

    try:
        market = fetch_market(ticker)
        if not market:
            return {"status": "not_found", "ticker": ticker}

        # -- Pricing --
        yes_bid = market.get("yes_bid")
        yes_ask = market.get("yes_ask")
        no_bid = market.get("no_bid")
        no_ask = market.get("no_ask")
        last_price = market.get("last_price")
        previous_yes_bid = market.get("previous_yes_bid")
        previous_price = market.get("previous_price")

        # Compute spread & midpoint from yes side
        spread = None
        midpoint = None
        if yes_bid is not None and yes_ask is not None:
            spread = yes_ask - yes_bid
            midpoint = round((yes_bid + yes_ask) / 2, 1)

        # 24h change
        price_delta = None
        if last_price is not None and previous_price is not None:
            price_delta = last_price - previous_price

        result = {
            "status": "found",
            "ticker": ticker,
            # Market status
            "market_status": market.get("status"),
            "result": market.get("result"),
            # Pricing (cents)
            "yes_bid": yes_bid,
            "yes_ask": yes_ask,
            "no_bid": no_bid,
            "no_ask": no_ask,
            "last_price": last_price,
            "previous_price": previous_price,
            "previous_yes_bid": previous_yes_bid,
            "spread": spread,
            "midpoint": midpoint,
            "price_delta": price_delta,
            # Volume
            "volume": market.get("volume"),
            "volume_24h": market.get("volume_24h"),
            "open_interest": market.get("open_interest"),
        }

        # -- Orderbook --
        ob = fetch_orderbook(ticker)
        if ob:
            yes_levels = ob.get("yes", [])
            no_levels = ob.get("no", [])
            result["yes_depth"] = sum(
                level[1] for level in yes_levels if isinstance(level, list) and len(level) >= 2
            )
            result["no_depth"] = sum(
                level[1] for level in no_levels if isinstance(level, list) and len(level) >= 2
            )
            result["orderbook_yes"] = yes_levels
            result["orderbook_no"] = no_levels

        # -- Event context --
        event_ticker = market.get("event_ticker")
        if event_ticker:
            event = fetch_event(event_ticker)
            if event:
                result["event_ticker"] = event_ticker
                result["event_title"] = event.get("title")
                result["event_category"] = event.get("category")
                result["mutually_exclusive"] = event.get("mutually_exclusive")
                markets = event.get("markets")
                result["related_market_count"] = len(markets) if markets else 0

        return result

    except Exception:
        logger.exception("enrich_prediction failed for %s", ticker)
        return {"status": "error", "ticker": ticker}
