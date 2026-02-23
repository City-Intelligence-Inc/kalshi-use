"""Gemini vision model — uses Google's Gemini 2.5 Flash for image analysis."""

import logging
import os

from backend.db import get_image_bytes
from backend.models.base import ModelRunner, register
from backend.models.vision_common import EXTRACTION_SYSTEM_PROMPT, parse_llm_response

logger = logging.getLogger(__name__)


@register
class GeminiModel(ModelRunner):
    name = "gemini"
    display_name = "Gemini 2.5 Flash"
    description = "Google Gemini 2.5 Flash vision model. Fast, cost-effective image analysis."
    input_type = "image"
    output_type = "prediction"

    def run(self, image_key: str, context: str | None) -> dict:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY environment variable is not set")

        # Import here so the dependency is optional at module load time
        from google import genai

        client = genai.Client(api_key=api_key)

        logger.info("Fetching image from S3: %s", image_key)
        image_bytes = get_image_bytes(image_key)
        logger.info("Image fetched: %d bytes", len(image_bytes))

        # Detect mime type from key extension
        ext = image_key.rsplit(".", 1)[-1].lower() if "." in image_key else "jpg"
        mime_type = "image/png" if ext == "png" else "image/jpeg"

        prompt = "Analyze this Kalshi market screenshot and return the structured JSON."
        if context:
            prompt += f"\n\nAdditional context: {context}"

        logger.info("Calling Gemini API (model=gemini-2.5-flash, mime=%s)", mime_type)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                genai.types.Content(
                    parts=[
                        genai.types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        genai.types.Part.from_text(text=prompt),
                    ]
                ),
            ],
            config=genai.types.GenerateContentConfig(
                system_instruction=EXTRACTION_SYSTEM_PROMPT,
                max_output_tokens=16384,
                temperature=0.2,
                thinking_config=genai.types.ThinkingConfig(
                    thinking_budget=4096,
                ),
            ),
        )

        raw_text = response.text
        logger.info("Gemini response: %s", raw_text[:500])

        return parse_llm_response(raw_text)
