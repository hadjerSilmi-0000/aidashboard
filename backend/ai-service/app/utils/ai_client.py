"""
Unified AI client that supports multiple providers:
- mock       : returns deterministic mock text (good for offline tests)
- ollama     : local LLaMA via Ollama (http://localhost:11434)
- huggingface: HuggingFace Inference API
- openai     : OpenAI SDK
"""

import os
import json
import requests
from typing import Any, Dict

try:
    import openai
except Exception:
    openai = None  # openai may not be installed


class AIClient:
    def __init__(self, provider: str | None = None):
        self.provider = (provider or os.getenv("MODEL_PROVIDER", "mock")).lower()
        # Keys and config
        self.openai_key = os.getenv("OPENAI_API_KEY") or os.getenv("AI_API_KEY")
        self.hf_key = os.getenv("HUGGINGFACE_API_KEY")
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.hf_model = os.getenv("HUGGINGFACE_MODEL", "gpt2")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "llama2")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.timeout = int(os.getenv("AI_CLIENT_TIMEOUT", "120"))

        if openai and self.openai_key:
            openai.api_key = self.openai_key

    def query(self, prompt: str, max_tokens: int = 256, temperature: float = 0.0) -> str:
        """
        Query the configured provider and return a text response.
        Use 'mock' provider for offline testing.
        """
        if self.provider == "mock":
            return self._mock_response(prompt)

        if self.provider in ("ollama", "ollama-local"):
            return self._query_ollama(prompt, max_tokens, temperature)

        if self.provider in ("huggingface", "hf"):
            return self._query_huggingface(prompt, max_tokens, temperature)

        if self.provider == "openai":
            return self._query_openai(prompt, max_tokens, temperature)

        raise ValueError(f"Unknown MODEL_PROVIDER: {self.provider}")

    def _mock_response(self, prompt: str) -> str:
        # Deterministic mock output so tests are repeatable
        return f"[MOCK] Generated insight for prompt (truncated): {prompt[:240]}"

    def _query_ollama(self, prompt: str, max_tokens: int, temperature: float) -> str:
        """
        Query Ollama local model. Requires:
        - OLLAMA_URL
        - OLLAMA_MODEL
        """
        url = f"{self.ollama_url}/api/generate"
        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,  # ensure we get one full JSON response
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }
        resp = requests.post(url, json=payload, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and "response" in data:
            return data["response"].strip()
        return str(data)

    def _query_huggingface(self, prompt: str, max_tokens: int, temperature: float) -> str:
        url = f"https://api-inference.huggingface.co/models/{self.hf_model}"
        headers = {"Authorization": f"Bearer {self.hf_key}"} if self.hf_key else {}
        payload = {
            "inputs": prompt,
            "parameters": {"max_new_tokens": max_tokens, "temperature": temperature}
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()
        # HF inference returns a variety of shapes
        if isinstance(data, list) and len(data) and isinstance(data[0], dict) and "generated_text" in data[0]:
            return data[0]["generated_text"]
        if isinstance(data, dict) and "generated_text" in data:
            return data["generated_text"]
        if isinstance(data, str):
            return data
        return json.dumps(data)

    def _query_openai(self, prompt: str, max_tokens: int, temperature: float) -> str:
        if not openai:
            raise RuntimeError("openai package not installed in your environment")
        # Try ChatCompletion first
        try:
            completion = openai.ChatCompletion.create(
                model=self.openai_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=self.timeout
            )
            choice = completion.choices[0]
            if hasattr(choice, "message") and isinstance(choice.message, dict):
                return choice.message.get("content", str(choice))
            if hasattr(choice, "text"):
                return choice.text
            return str(choice)
        except Exception as e:
            # Fallback to text completion
            try:
                completion = openai.Completion.create(
                    model=self.openai_model,
                    prompt=prompt,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    timeout=self.timeout
                )
                return completion.choices[0].text
            except Exception:
                raise e
