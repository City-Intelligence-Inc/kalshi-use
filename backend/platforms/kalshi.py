"""Kalshi authenticated API client using RSA-PSS signing.

Auth flow per Kalshi docs:
- Each request is signed with the member's RSA private key
- Signature covers: timestamp + method + path (no body)
- Header: KALSHI-ACCESS-KEY, KALSHI-ACCESS-SIGNATURE, KALSHI-ACCESS-TIMESTAMP
"""

import base64
import logging
import time

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, utils

from backend.platforms.base import PlatformClient

logger = logging.getLogger(__name__)

KALSHI_BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"


class KalshiClient(PlatformClient):
    platform = "kalshi"

    def __init__(self, api_key_id: str, private_key_pem: str):
        self.api_key_id = api_key_id
        self._private_key = serialization.load_pem_private_key(
            private_key_pem.encode(), password=None
        )

    def _sign_request(self, method: str, path: str, timestamp_ms: int) -> str:
        """Create RSA-PSS signature for the request."""
        message = f"{timestamp_ms}{method}{path}".encode()
        # Kalshi uses RSA-PSS with SHA-256, salt length = digest length (32)
        signature = self._private_key.sign(
            message,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=hashes.SHA256().digest_size,
            ),
            utils.Prehashed(hashes.SHA256()),
        )
        return base64.b64encode(signature).decode()

    def _request(self, method: str, path: str, params: dict | None = None) -> dict:
        """Make an authenticated request to Kalshi API."""
        timestamp_ms = int(time.time() * 1000)

        # Build the full URL path for signing
        full_path = f"/trade-api/v2{path}"

        # Hash the message before signing (Prehashed expects already-hashed data)
        message = f"{timestamp_ms}{method.upper()}{full_path}".encode()
        digest = hashes.Hash(hashes.SHA256())
        digest.update(message)
        msg_hash = digest.finalize()

        signature = self._private_key.sign(
            msg_hash,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=hashes.SHA256().digest_size,
            ),
            utils.Prehashed(hashes.SHA256()),
        )
        sig_b64 = base64.b64encode(signature).decode()

        headers = {
            "KALSHI-ACCESS-KEY": self.api_key_id,
            "KALSHI-ACCESS-SIGNATURE": sig_b64,
            "KALSHI-ACCESS-TIMESTAMP": str(timestamp_ms),
            "Content-Type": "application/json",
        }

        url = f"{KALSHI_BASE_URL}{path}"
        resp = httpx.request(method.upper(), url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()

    # ── PlatformClient interface ──

    def validate_credentials(self) -> bool:
        """Validate by fetching balance — if it works, credentials are good."""
        try:
            self._request("GET", "/portfolio/balance")
            return True
        except Exception:
            logger.exception("Kalshi credential validation failed")
            return False

    def get_balance(self) -> dict:
        """Return portfolio balance from Kalshi."""
        data = self._request("GET", "/portfolio/balance")
        # Kalshi returns cents — convert to dollars for display
        balance = data.get("balance", 0)
        payout = data.get("payout", 0)
        return {
            "available_balance": balance / 100,
            "payout": payout / 100,
            "total_value": (balance + payout) / 100,
        }

    def get_positions(self) -> list[dict]:
        """Return open positions from Kalshi."""
        data = self._request("GET", "/portfolio/positions", params={"limit": 200})
        positions = []
        for pos in data.get("market_positions", []):
            positions.append({
                "ticker": pos.get("ticker", ""),
                "market_title": pos.get("market_title", ""),
                "yes_count": pos.get("position", 0),
                "no_count": pos.get("total_traded", 0) - pos.get("position", 0),
                "market_exposure": pos.get("market_exposure", 0) / 100,
                "realized_pnl": pos.get("realized_pnl", 0) / 100,
                "resting_orders_count": pos.get("resting_orders_count", 0),
            })
        return positions

    def get_fills(self, limit: int = 50) -> list[dict]:
        """Return recent fills from Kalshi."""
        data = self._request("GET", "/portfolio/fills", params={"limit": limit})
        fills = []
        for fill in data.get("fills", []):
            fills.append({
                "trade_id": fill.get("trade_id", ""),
                "ticker": fill.get("ticker", ""),
                "side": fill.get("side", ""),
                "action": fill.get("action", ""),
                "type": fill.get("type", ""),
                "count": fill.get("count", 0),
                "yes_price": fill.get("yes_price", 0),
                "no_price": fill.get("no_price", 0),
                "created_time": fill.get("created_time", ""),
            })
        return fills
