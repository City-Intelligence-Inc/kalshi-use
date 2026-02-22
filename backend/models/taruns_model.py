from backend.models.base import ModelRunner, register
from backend.models.random_model import RandomModel


@register
class TarunsModel(ModelRunner):
    name = "taruns_model"
    display_name = "Tarun's Model"
    description = "Tarun's prediction model. Currently delegates to random generator — will be replaced with Claude Vision analysis."

    def run(self, image_key: str, context: str | None) -> dict:
        # Delegate to random model for now
        random_runner = RandomModel()
        result = random_runner.run(image_key, context)
        return result
