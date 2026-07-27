"""
StackSage LLM Service - Unified interface for Groq and OpenRouter.
Handles rate limits (429), retries with backoff, timeouts, and JSON parsing.
"""

import asyncio
import json
import re
from typing import Any, Optional

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception,
)

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

PROVIDER_ENDPOINTS = {
    "groq": "https://api.groq.com/openai/v1/chat/completions",
    "openrouter": "https://openrouter.ai/api/v1/chat/completions",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
}

# Used when LLM_PROVIDER is switched without also overriding LLM_MODEL from another
# provider's default (e.g. still set to Groq's "llama-3.3-70b-versatile").
PROVIDER_DEFAULT_MODEL = {
    "groq": "llama-3.3-70b-versatile",
    "openrouter": "llama-3.3-70b-versatile",
    "gemini": "gemini-3.5-flash",
}


# ============================================================
# Custom Exceptions
# ============================================================

class LLMError(Exception):
    """Base error for LLM service."""
    pass

class RateLimitError(LLMError):
    """429 Too Many Requests - retryable."""
    def __init__(self, message: str, retry_after: float = 5.0):
        super().__init__(message)
        self.retry_after = retry_after

class LLMClientError(LLMError):
    """4xx errors (except 429) - NOT retryable."""
    pass

class LLMServerError(LLMError):
    """5xx errors - retryable."""
    pass


def _is_retryable(exc: BaseException) -> bool:
    """Only retry on transient errors."""
    return isinstance(exc, (RateLimitError, LLMServerError, httpx.ConnectError, httpx.ReadTimeout))


class LLMService:
    """Unified LLM client with rate limit handling and retries."""

    def __init__(self):
        self.settings = get_settings()
        self.provider = self.settings.llm_provider
        self.model = self.settings.llm_model
        # Guard against a stale cross-provider default (e.g. LLM_PROVIDER switched to
        # "gemini" but LLM_MODEL still says a Groq model name) instead of failing every call.
        if self.model == PROVIDER_DEFAULT_MODEL.get("groq") and self.provider != "groq":
            self.model = PROVIDER_DEFAULT_MODEL[self.provider]
        self.api_key = self.settings.active_api_key
        self.endpoint = PROVIDER_ENDPOINTS[self.provider]
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(120.0, connect=15.0)
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _build_headers(self) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        if self.provider == "openrouter":
            headers["HTTP-Referer"] = "https://stacksage.dev"
            headers["X-Title"] = "StackSage"
        return headers

    def _parse_retry_after(self, error_body: str) -> float:
        """Extract retry-after seconds from error message."""
        match = re.search(r"try again in (\d+\.?\d*)s", error_body, re.IGNORECASE)
        if match:
            return float(match.group(1)) + 1.0  # Buffer
        return 5.0

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=2, min=3, max=60),
        retry=retry_if_exception(_is_retryable),
    )
    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        response_format: Optional[str] = None,
    ) -> str:
        """Send a completion request with full error handling."""
        client = await self._get_client()

        # Gemini 3.x models reason before answering and that "thinking" spends from the
        # same max_tokens budget - the OpenAI-compat layer reports only the visible
        # completion_tokens used, so a budget sized for Groq/OpenRouter (which don't
        # reason) silently truncates Gemini's actual JSON output mid-string. Raise the
        # floor and ask for minimal reasoning to leave the budget for the real answer.
        effective_max_tokens = max_tokens
        if self.provider == "gemini":
            effective_max_tokens = max(max_tokens, 8192)

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": effective_max_tokens,
        }
        if self.provider == "gemini":
            payload["reasoning_effort"] = "low"
        if response_format == "json":
            payload["response_format"] = {"type": "json_object"}

        prompt_chars = len(system_prompt) + len(user_prompt)
        logger.debug("llm_request", provider=self.provider, model=self.model, prompt_chars=prompt_chars)

        # --- Network errors ---
        try:
            response = await client.post(self.endpoint, headers=self._build_headers(), json=payload)
        except httpx.ReadTimeout:
            logger.error("llm_timeout", provider=self.provider, prompt_chars=prompt_chars)
            raise
        except httpx.ConnectError as e:
            logger.error("llm_connect_error", provider=self.provider, error=str(e))
            raise

        # --- Rate limit (429) ---
        if response.status_code == 429:
            body = response.text
            retry_after = self._parse_retry_after(body)
            logger.warning("llm_rate_limited", provider=self.provider, retry_after=retry_after)
            await asyncio.sleep(retry_after)
            raise RateLimitError(f"Rate limited by {self.provider}", retry_after=retry_after)

        # --- Server errors (5xx) ---
        if response.status_code >= 500:
            body = response.text
            logger.error("llm_server_error", provider=self.provider, status=response.status_code, body=body[:300])
            raise LLMServerError(f"{self.provider} returned {response.status_code}")

        # --- Client errors (400, 401, 403, etc.) ---
        if response.status_code >= 400:
            body = response.text
            logger.error("llm_client_error", provider=self.provider, status=response.status_code, body=body[:500])
            raise LLMClientError(f"{self.provider} returned {response.status_code}: {body[:200]}")

        # --- Success ---
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})

        logger.info(
            "llm_response",
            provider=self.provider,
            tokens_in=usage.get("prompt_tokens", 0),
            tokens_out=usage.get("completion_tokens", 0),
        )
        return content

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> dict[str, Any]:
        """Send a completion and parse response as JSON with fallback extraction."""
        raw = await self.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format="json",
        )

        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Fallback: extract first JSON object from response
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        logger.error("json_parse_failed", raw_response=raw[:500])
        raise ValueError(f"LLM returned unparseable response (length={len(raw)})")


# Singleton
_llm_service: Optional[LLMService] = None

def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service