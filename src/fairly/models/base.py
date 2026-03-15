"""Abstract base class that every VLM connector must implement.

To add a new model provider, subclass ``BaseVLMClient`` and implement
the ``predict`` method.
"""

from abc import ABC, abstractmethod


class BaseVLMClient(ABC):
    """Interface that all Vision-Language Model clients must follow.

    Attributes:
        name: A human-readable label for the model.
    """

    def __init__(self, name: str):
        """Initialize the client.

        Args:
            name: Display name of the model.
        """
        self.name = name

    @abstractmethod
    def predict(self, image_path: str, prompt: str) -> str:
        """Send an image + prompt to the model and return the text response.

        Args:
            image_path: Local filesystem path to the image file.
            prompt: The evaluation question to ask the model.

        Returns:
            The model's text response.
        """
        ...

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name!r}>"
