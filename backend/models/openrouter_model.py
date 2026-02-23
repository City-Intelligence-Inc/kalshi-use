"""OpenRouter vision model — routes to Claude, GPT-4o, etc. via a single API key."""

import base64
import logging
import mimetypes
import os

import httpx

from backend.db import get_image_bytes
from backend.models.base import ModelRunner, register
from backend.models.vision_common import EXTRACTION_SYSTEM_PROMPT, parse_llm_response

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_BACKING_MODEL = "anthropic/claude-3.5-haiku"


def _guess_media_type(image_key: str) -> str:
    mime, _ = mimetypes.guess_type(image_key)
    return mime or "image/jpeg"


def call_openrouter_vision(
    image_key: str,
    context: str | None,
    backing_model: str = DEFAULT_BACKING_MODEL,
) -> dict:
    """Send an image to OpenRouter's chat completions endpoint and parse the result."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY environment variable is not set")

    image_bytes = get_image_bytes(image_key)
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    media_type = _guess_media_type(image_key)

    user_content: list[dict] = [
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:{media_type};base64,{b64_image}",
            },
        },
        {
            "type": "text",
            "text": "Analyze this Kalshi market screenshot and return the structured JSON.",
        },
    ]

    if context:
        user_content.append({"type": "text", "text": f"Additional context: {context}"})

    payload = {
        "model": backing_model,
        "messages": [
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "max_tokens": 8192,
        "temperature": 0.2,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=60) as client:
        resp = client.post(OPENROUTER_API_URL, json=payload, headers=headers)
        resp.raise_for_status()

    data = resp.json()
    raw_text = data["choices"][0]["message"]["content"]
    logger.info("OpenRouter response (%s): %s", backing_model, raw_text[:200])

    return parse_llm_response(raw_text)


@register
class OpenRouterModel(ModelRunner):
    name = "openrouter"
    display_name = "OpenRouter Vision"
    description = "Vision analysis via OpenRouter (Claude 3.5 Haiku). Extracts market data from Kalshi screenshots."
    input_type = "image"
    output_type = "prediction"

    def run(self, image_key: str, context: str | None) -> dict:
        return call_openrouter_vision(image_key, context)
