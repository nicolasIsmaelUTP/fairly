"""Featherless.ai VLM client.

Connects to open-source models hosted on Featherless using their
OpenAI-compatible API endpoint.
"""

import base64
import mimetypes

import httpx

from fairly.models.base import BaseVLMClient

FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1"


class FeatherlessClient(BaseVLMClient):
    """Client for models hosted on Featherless.ai.

    Attributes:
        api_key: Featherless API key.
        model_id: The model identifier on Featherless (e.g. "llava-1.5-7b").
    """

    def __init__(self, name: str, api_key: str, model_id: str):
        """Initialize the Featherless client.

        Args:
            name: Display name.
            api_key: Featherless.ai API key.
            model_id: Model identifier string on the Featherless platform.
        """
        super().__init__(name)
        self.api_key = api_key
        self.model_id = model_id

    def predict(self, image_path: str, prompt: str) -> str:
        """Send an image and prompt to Featherless and return the response.

        Args:
            image_path: Path to a local image file.
            prompt: The evaluation question.

        Returns:
            The model's text answer.
        """
        mime_type = mimetypes.guess_type(image_path)[0] or "image/jpeg"
        with open(image_path, "rb") as f:
            b64_image = base64.b64encode(f.read()).decode("utf-8")

        payload = {
            "model": self.model_id,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{b64_image}"
                            },
                        },
                    ],
                }
            ],
            "max_tokens": 512,
        }

        response = httpx.post(
            f"{FEATHERLESS_BASE_URL}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=120.0,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
