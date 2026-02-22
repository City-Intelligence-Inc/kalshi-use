"""User-created custom models stored in S3.

Custom models delegate to an existing backing runner (openrouter, gemini, random)
with an optional custom system prompt override.
"""

import json
import logging

from backend.db import s3_client, S3_BUCKET_NAME, _s3_available
from backend.models.base import ModelRunner

logger = logging.getLogger(__name__)

CUSTOM_REGISTRY_KEY = "models/custom_registry.json"

# Backing runners that custom models can delegate to
BACKING_RUNNERS = {
    "openrouter": "backend.models.openrouter_model",
    "gemini": "backend.models.gemini_model",
    "random": "backend.models.random_model",
}


def _load_custom_registry() -> dict[str, dict]:
    """Load custom model configs from S3."""
    if not _s3_available:
        return {}
    try:
        resp = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=CUSTOM_REGISTRY_KEY)
        return json.loads(resp["Body"].read().decode("utf-8"))
    except Exception:
        # NoSuchKey (no custom models yet) or any other S3 error
        return {}


def _save_custom_registry(registry: dict[str, dict]) -> None:
    """Save custom model configs to S3."""
    if not _s3_available:
        logger.warning("S3 not available — cannot save custom models")
        return
    s3_client.put_object(
        Bucket=S3_BUCKET_NAME,
        Key=CUSTOM_REGISTRY_KEY,
        Body=json.dumps(registry, indent=2).encode("utf-8"),
        ContentType="application/json",
    )


def create_custom_model(config: dict) -> dict:
    """Create a new custom model and save to registry."""
    registry = _load_custom_registry()
    name = config["name"]
    registry[name] = config
    _save_custom_registry(registry)
    return config


def delete_custom_model(name: str) -> bool:
    """Delete a custom model from registry. Returns True if found and deleted."""
    registry = _load_custom_registry()
    if name not in registry:
        return False
    del registry[name]
    _save_custom_registry(registry)
    return True


def get_custom_models() -> list[dict]:
    """List all custom model configs."""
    registry = _load_custom_registry()
    return list(registry.values())


def get_custom_model_config(name: str) -> dict | None:
    """Get a single custom model config by name."""
    registry = _load_custom_registry()
    return registry.get(name)


class CustomModelRunner(ModelRunner):
    """A model runner backed by a user-created config.

    Delegates to an existing runner (openrouter, gemini, random)
    with optional custom system prompt.
    """

    def __init__(self, config: dict):
        self.name = config["name"]
        self.display_name = config["display_name"]
        self.description = config.get("description", "")
        self.status = config.get("status", "available")
        self.input_type = config.get("input_type", "image")
        self.output_type = config.get("output_type", "prediction")
        self._backing_runner = config.get("backing_runner", "random")
        self._backing_llm = config.get("backing_llm")
        self._custom_prompt = config.get("custom_prompt")

    def run(self, image_key: str, context: str | None) -> dict:
        if self._backing_runner == "openrouter":
            from backend.models.openrouter_model import call_openrouter_vision
            from backend.models import vision_common

            # Temporarily override prompt if custom_prompt is set
            original_prompt = None
            if self._custom_prompt:
                original_prompt = vision_common.EXTRACTION_SYSTEM_PROMPT
                vision_common.EXTRACTION_SYSTEM_PROMPT = self._custom_prompt

            try:
                backing_model = self._backing_llm or "anthropic/claude-3.5-haiku"
                return call_openrouter_vision(image_key, context, backing_model=backing_model)
            finally:
                if original_prompt is not None:
                    vision_common.EXTRACTION_SYSTEM_PROMPT = original_prompt

        elif self._backing_runner == "gemini":
            from backend.models.gemini_model import GeminiModel
            return GeminiModel().run(image_key, context)

        else:
            # Default to random
            from backend.models.random_model import RandomModel
            return RandomModel().run(image_key, context)
