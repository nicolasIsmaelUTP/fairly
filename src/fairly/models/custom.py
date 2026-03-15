"""Custom model client for user-provided VLM endpoints.

Users wrap their own model behind an OpenAI-compatible REST API and
provide the endpoint URL + API key. This client calls that endpoint.
"""

import base64
import mimetypes

import httpx

from fairly.models.base import BaseVLMClient


class CustomModelClient(BaseVLMClient):
    """Client that calls a user-provided REST endpoint.

    The endpoint must be OpenAI chat-completions compatible.

    Attributes:
        endpoint: Full URL of the model endpoint.
        api_key: Bearer token for authentication.
    """

    def __init__(self, name: str, endpoint: str, api_key: str):
        """Initialize the custom model client.

        Args:
            name: Display name.
            endpoint: Full URL to the chat/completions endpoint.
            api_key: Bearer token for the endpoint.
        """
        super().__init__(name)
        self.endpoint = endpoint
        self.api_key = api_key

    def predict(self, image_path: str, prompt: str) -> str:
        """Send image + prompt to the custom endpoint.

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
            self.endpoint,
            json=payload,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=120.0,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
