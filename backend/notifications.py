import logging

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(
    expo_push_token: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> bool:
    """Send a push notification via the Expo Push API. Returns True on success."""
    payload = {
        "to": expo_push_token,
        "title": title,
        "body": body,
        "sound": "default",
    }
    if data:
        payload["data"] = data

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(EXPO_PUSH_URL, json=payload)
            resp.raise_for_status()
            return True
    except Exception:
        logger.exception("Failed to send push notification to %s", expo_push_token)
        return False
