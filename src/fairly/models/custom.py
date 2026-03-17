"""Custom model client for user-provided VLM endpoints.

Users wrap their own model behind an OpenAI-compatible REST API and
provide the endpoint URL + API key. This client calls that endpoint.
Supports both the Chat Completions API and the Responses API.
"""

import base64
import mimetypes

import httpx

from fairly.models.base import BaseVLMClient


def _is_responses_api(endpoint: str) -> bool:
    """Return True if the endpoint looks like the Responses API."""
    return "/responses" in endpoint and "/chat/completions" not in endpoint


def _extract_text(data: dict) -> str:
    """Extract text from either Chat Completions or Responses API output."""
    # Chat Completions: choices[0].message.content
    choices = data.get("choices") or []
    if choices:
        msg = choices[0].get("message", {})
        content = msg.get("content") or ""
        if isinstance(content, list):
            return " ".join(p.get("text", "") for p in content if isinstance(p, dict))
        if content:
            return content
    # Responses API: output[].content[].text where type == "output_text"
    for item in data.get("output", []):
        for part in item.get("content", []) if isinstance(item.get("content"), list) else []:
            if isinstance(part, dict) and part.get("type") == "output_text":
                text = part.get("text", "")
                if text:
                    return text
    # Convenience field some SDKs provide
    if data.get("output_text"):
        return data["output_text"]
    return ""


class CustomModelClient(BaseVLMClient):
    """Client that calls a user-provided REST endpoint.

    The endpoint must be OpenAI chat-completions compatible.

    Attributes:
        endpoint: Full URL of the model endpoint.
        api_key: Bearer token for authentication.
    """

    def __init__(self, name: str, endpoint: str, api_key: str, model_id: str = ""):
        """Initialize the custom model client.

        Args:
            name: Display name.
            endpoint: Full URL to the chat/completions endpoint.
            api_key: Bearer token for the endpoint.
            model_id: Model identifier for the API (e.g. "gpt-4o").
        """
        super().__init__(name)
        self.endpoint = endpoint
        self.api_key = api_key
        self.model_id = model_id

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

        data_url = f"data:{mime_type};base64,{b64_image}"

        if _is_responses_api(self.endpoint):
            # OpenAI Responses API format
            payload: dict = {
                "input": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "input_text", "text": prompt},
                            {"type": "input_image", "image_url": data_url},
                        ],
                    }
                ],
                "max_output_tokens": 512,
            }
        else:
            # Chat Completions API format
            payload = {
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": data_url},
                            },
                        ],
                    }
                ],
                "max_completion_tokens": 512,
            }
        if self.model_id:
            payload["model"] = self.model_id

        response = httpx.post(
            self.endpoint,
            json=payload,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=120.0,
        )
        if response.status_code >= 400:
            # Log full error body for debugging API issues
            import logging
            logging.getLogger(__name__).error(
                "API error %d from %s: %s",
                response.status_code, self.endpoint, response.text[:500],
            )
        response.raise_for_status()
        return _extract_text(response.json())
