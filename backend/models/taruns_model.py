import logging
import os

from backend.models.base import ModelRunner, register
from backend.models.openrouter_model import call_openrouter_vision

logger = logging.getLogger(__name__)


@register
class TarunsModel(ModelRunner):
    name = "taruns_model"
    display_name = "Tarun's Model"
    description = "Tarun's prediction model powered by Claude 3.5 Haiku via OpenRouter."
    input_type = "image"
    output_type = "prediction"

    def run(self, image_key: str, context: str | None) -> dict:
        if not os.environ.get("OPENROUTER_API_KEY"):
            # Fall back to random model when no API key is configured (local dev)
            from backend.models.random_model import RandomModel

            logger.warning("OPENROUTER_API_KEY not set — falling back to random model")
            return RandomModel().run(image_key, context)
        return call_openrouter_vision(image_key, context)
