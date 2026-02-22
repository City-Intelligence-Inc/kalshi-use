from abc import ABC, abstractmethod


class PlatformClient(ABC):
    """Abstract base for exchange platform clients."""

    platform: str  # e.g. "kalshi"

    @abstractmethod
    def validate_credentials(self) -> bool:
        """Return True if the stored credentials are valid."""
        raise NotImplementedError

    @abstractmethod
    def get_balance(self) -> dict:
        """Return account balance info."""
        raise NotImplementedError

    @abstractmethod
    def get_positions(self) -> list[dict]:
        """Return open positions."""
        raise NotImplementedError

    @abstractmethod
    def get_fills(self, limit: int = 50) -> list[dict]:
        """Return recent fills/trades."""
        raise NotImplementedError
