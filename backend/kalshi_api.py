"""Kalshi public API client for live market data enrichment."""

import logging
import time

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"
TIMEOUT = 30.0

# In-memory cache for open markets list
_markets_cache: dict[str, tuple[float, list[dict]]] = {}
_MARKETS_CACHE_TTL = 60.0  # seconds


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


def fetch_markets(status: str = "open", limit: int = 1000) -> list[dict]:
    """GET /markets → list of markets with title, ticker, pricing.

    Results are cached in-memory for 60s to avoid hammering the API.
    """
    cache_key = f"{status}:{limit}"
    cached = _markets_cache.get(cache_key)
    if cached and (time.time() - cached[0]) < _MARKETS_CACHE_TTL:
        return cached[1]

    all_markets: list[dict] = []
    cursor: str | None = None
    try:
        with _client() as c:
            while True:
                params: dict = {"status": status, "limit": min(limit, 1000)}
                if cursor:
                    params["cursor"] = cursor
                r = c.get("/markets", params=params)
                r.raise_for_status()
                data = r.json()
                batch = data.get("markets", [])
                all_markets.extend(batch)
                cursor = data.get("cursor")
                if not cursor or len(all_markets) >= limit:
                    break
    except httpx.HTTPError:
        logger.exception("Kalshi markets fetch failed")

    _markets_cache[cache_key] = (time.time(), all_markets)
    logger.info("Fetched %d open markets from Kalshi", len(all_markets))
    return all_markets


def _score_title(title: str, keywords: list[str]) -> int:
    """Score how well a title matches a set of keywords."""
    title_lower = title.lower()
    return sum(1 for kw in keywords if kw in title_lower)


def _build_keywords(
    extracted_title: str | None,
    search_keywords: list[str] | None,
) -> list[str]:
    """Build a keyword list from title + explicit keywords."""
    stop_words = {"the", "will", "and", "for", "who", "what", "how", "does", "have", "has", "been", "this", "that", "with"}
    keywords: list[str] = []
    if search_keywords:
        keywords.extend(kw.lower() for kw in search_keywords if len(kw) > 2)
    if extracted_title:
        keywords.extend(
            w.lower() for w in extracted_title.split()
            if len(w) > 2 and w.lower() not in stop_words
        )
    return keywords


def match_market(
    extracted_ticker: str | None,
    extracted_title: str | None,
    search_keywords: list[str] | None = None,
) -> dict | None:
    """Try to match extracted image info to a real Kalshi market.

    Strategy:
      1. Direct ticker lookup (fast path)
      2. Search all open market titles (new — much better matching)
      3. Fall back to event title search (original approach)

    Returns the matched market dict or None.
    """
    # 1. Direct ticker lookup
    if extracted_ticker and extracted_ticker.upper() != "UNKNOWN":
        market = fetch_market(extracted_ticker)
        if market:
            return market

    # Build keyword list
    keywords = _build_keywords(extracted_title, search_keywords)
    if not keywords:
        return None

    # 2. Search open market titles directly (new)
    markets = fetch_markets(status="open")
    best_market = None
    best_score = 0

    for m in markets:
        market_title = m.get("title", "")
        score = _score_title(market_title, keywords)
        # Also check event_ticker as keyword (e.g. "KXBTC" in keywords)
        event_ticker = m.get("event_ticker", "")
        if event_ticker:
            score += _score_title(event_ticker.lower(), keywords)
        if score > best_score:
            best_score = score
            best_market = m

    # Market title matches are specific — threshold of 1 is OK
    if best_market and best_score >= 1:
        logger.info("Matched market %s (score=%d) via market title search", best_market.get("ticker"), best_score)
        return best_market

    # 3. Fall back to event title search
    events = fetch_events(status="open", limit=200)
    best_event = None
    best_event_score = 0

    for event in events:
        event_title = event.get("title", "")
        score = _score_title(event_title, keywords)
        if score > best_event_score:
            best_event_score = score
            best_event = event

    if not best_event or best_event_score < 2:
        return None

    # Pick best market within event by scoring market titles
    event_markets = best_event.get("markets", [])
    if not event_markets:
        event_ticker = best_event.get("event_ticker")
        if event_ticker:
            event_detail = fetch_event(event_ticker)
            if event_detail:
                event_markets = event_detail.get("markets", [])

    best_in_event = None
    best_in_event_score = -1
    for m in event_markets:
        if m.get("status") not in ("active", "open", "live"):
            continue
        m_score = _score_title(m.get("title", ""), keywords)
        if m_score > best_in_event_score:
            best_in_event_score = m_score
            best_in_event = m

    if best_in_event:
        return best_in_event
    return event_markets[0] if event_markets else None


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
