from abc import ABC, abstractmethod

MODEL_REGISTRY: dict[str, "ModelRunner"] = {}


def register(cls):
    """Decorator: @register on a ModelRunner subclass auto-adds it to registry."""
    instance = cls()
    MODEL_REGISTRY[instance.name] = instance
    return cls


class ModelRunner(ABC):
    name: str
    display_name: str
    description: str
    status: str = "available"

    @abstractmethod
    def run(self, image_key: str, context: str | None) -> dict:
        raise NotImplementedError
