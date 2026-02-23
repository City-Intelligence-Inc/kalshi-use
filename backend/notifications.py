import logging
import os

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# ── Mailgun config ──

MAILGUN_API_KEY = os.environ.get("MAILGUN_API_KEY", "")
MAILGUN_DOMAIN = os.environ.get("MAILGUN_DOMAIN", "ai.complete.city")
MAILGUN_FROM = "Kalshi Use <arihant@ai.complete.city>"


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


async def send_email(
    to: str,
    subject: str,
    body_text: str,
    body_html: str | None = None,
) -> bool:
    """Send an email via the Mailgun API. Returns True on success."""
    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
        logger.warning("Mailgun not configured — skipping email to %s", to)
        return False

    url = f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages"
    data = {
        "from": MAILGUN_FROM,
        "to": to,
        "subject": subject,
        "text": body_text,
    }
    if body_html:
        data["html"] = body_html

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                auth=("api", MAILGUN_API_KEY),
                data=data,
            )
            resp.raise_for_status()
            logger.info("Email sent to %s: %s", to, subject)
            return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False


def _format_prediction_email(prediction: dict) -> tuple[str, str, str]:
    """Build subject + text + html for a completed prediction notification."""
    rec = prediction.get("recommendation") or {}
    ticker = rec.get("ticker", "Unknown")
    side = (rec.get("side") or "?").upper()
    confidence = round((rec.get("confidence") or 0) * 100)
    no_bet = rec.get("no_bet", False)
    model = prediction.get("model", "?")

    if no_bet:
        action = "PASS"
        reason = rec.get("no_bet_reason", "No edge found")
        subject = f"Analysis Ready: {ticker} — PASS"
        text = (
            f"Your {model} analysis for {ticker} is ready.\n\n"
            f"Recommendation: PASS\n"
            f"Reason: {reason}\n\n"
            f"Open the app to view the full analysis."
        )
        html = (
            f"<h2 style='color:#EAB308'>PASS — {ticker}</h2>"
            f"<p>Your <strong>{model}</strong> analysis is complete.</p>"
            f"<p><strong>Reason:</strong> {reason}</p>"
            f"<p style='color:#64748B; font-size:13px'>Open the app to view the full breakdown.</p>"
        )
    else:
        action = f"BUY {side}"
        subject = f"Analysis Ready: {ticker} — {action} ({confidence}%)"
        reasoning = rec.get("reasoning", "")[:200]
        text = (
            f"Your {model} analysis for {ticker} is ready.\n\n"
            f"Recommendation: {action}\n"
            f"Confidence: {confidence}%\n"
            f"Reasoning: {reasoning}\n\n"
            f"Open the app to accept or reject this trade."
        )
        side_color = "#22C55E" if side == "YES" else "#EF4444"
        html = (
            f"<h2 style='color:{side_color}'>{action} — {ticker}</h2>"
            f"<p>Your <strong>{model}</strong> analysis is complete.</p>"
            f"<p><strong>Confidence:</strong> {confidence}%</p>"
            f"<p><strong>Reasoning:</strong> {reasoning}</p>"
            f"<p style='color:#64748B; font-size:13px'>Open the app to accept or reject this trade.</p>"
        )

    return subject, text, html


def _format_trade_accepted_email(position: dict) -> tuple[str, str, str]:
    """Build subject + text + html for a trade-accepted notification."""
    ticker = position.get("ticker", "Unknown")
    side = (position.get("side") or "?").upper()
    entry = position.get("entry_price", 0)
    model = position.get("model", "?")
    confidence = round((position.get("confidence") or 0) * 100)

    subject = f"Trade Accepted: {ticker} — BUY {side} @ {entry}\u00A2"
    text = (
        f"You accepted a trade on {ticker}.\n\n"
        f"Side: {side}\n"
        f"Entry Price: {entry}\u00A2\n"
        f"Model: {model} ({confidence}% confidence)\n\n"
        f"This position is now being tracked. You'll get updates on settlement."
    )
    side_color = "#22C55E" if side == "YES" else "#EF4444"
    html = (
        f"<h2 style='color:{side_color}'>Trade Accepted — {ticker}</h2>"
        f"<p><strong>Side:</strong> {side} @ {entry}&cent;</p>"
        f"<p><strong>Model:</strong> {model} ({confidence}% confidence)</p>"
        f"<p style='color:#64748B; font-size:13px'>This position is now being tracked.</p>"
    )

    return subject, text, html
