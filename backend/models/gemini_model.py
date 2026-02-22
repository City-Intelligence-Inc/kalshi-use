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

        image_bytes = get_image_bytes(image_key)

        prompt = "Analyze this Kalshi market screenshot and return the structured JSON."
        if context:
            prompt += f"\n\nAdditional context: {context}"

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                genai.types.Content(
                    parts=[
                        genai.types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                        genai.types.Part.from_text(text=prompt),
                    ]
                ),
            ],
            config=genai.types.GenerateContentConfig(
                system_instruction=EXTRACTION_SYSTEM_PROMPT,
                max_output_tokens=2048,
                temperature=0.2,
            ),
        )

        raw_text = response.text
        logger.info("Gemini response: %s", raw_text[:200])

        return parse_llm_response(raw_text)
