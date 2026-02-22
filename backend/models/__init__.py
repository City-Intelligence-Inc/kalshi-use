from backend.models.base import ModelRunner, MODEL_REGISTRY

# Import model modules so @register decorators execute
import backend.models.random_model  # noqa: F401
import backend.models.taruns_model  # noqa: F401
import backend.models.openrouter_model  # noqa: F401
import backend.models.gemini_model  # noqa: F401

from backend.models.custom import (
    CustomModelRunner,
    get_custom_models,
    get_custom_model_config,
)


def get_model(name: str) -> ModelRunner | None:
    # Check hardcoded registry first
    if name in MODEL_REGISTRY:
        return MODEL_REGISTRY[name]
    # Check custom models stored in S3
    config = get_custom_model_config(name)
    if config:
        return CustomModelRunner(config)
    return None


def list_models() -> list[dict]:
    # Hardcoded models
    result = [
        {
            "name": runner.name,
            "display_name": runner.display_name,
            "description": runner.description,
            "status": runner.status,
            "input_type": runner.input_type,
            "output_type": runner.output_type,
        }
        for runner in MODEL_REGISTRY.values()
    ]
    # Custom models from S3
    for config in get_custom_models():
        result.append({
            "name": config["name"],
            "display_name": config["display_name"],
            "description": config.get("description", ""),
            "status": config.get("status", "available"),
            "input_type": config.get("input_type", "image"),
            "output_type": config.get("output_type", "prediction"),
            "custom": True,
        })
    return result
