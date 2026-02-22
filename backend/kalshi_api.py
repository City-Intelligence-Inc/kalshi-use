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
