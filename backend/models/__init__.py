from backend.models.base import ModelRunner, MODEL_REGISTRY

# Import model modules so @register decorators execute
import backend.models.random_model  # noqa: F401
import backend.models.taruns_model  # noqa: F401
import backend.models.openrouter_model  # noqa: F401
import backend.models.gemini_model  # noqa: F401


def get_model(name: str) -> ModelRunner | None:
    return MODEL_REGISTRY.get(name)


def list_models() -> list[dict]:
    return [
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
