import time
import logging
from typing import Dict, Any, Callable

logger = logging.getLogger("NEXUS_ModelRouter")
logger.setLevel(logging.INFO)

# Base model routing mapping as defined in paper specification
DEFAULT_MODEL_ROUTING = {
    "product_manager": "gemini-2.0-flash-lite",
    "architect": "claude-sonnet-4-6",
    "developer": "gemini-2.0-flash",
    "reviewer": "claude-sonnet-4-6",
    "fallback": "gemini-2.0-flash-lite"
}

# Mapping of specified names to official active APIs
OFFICIAL_MODEL_MAPPING = {
    "claude-sonnet-4-6": "claude-sonnet-4-6",
    "gemini-2.0-flash-lite": "gemini-3.1-flash-lite",
    "gemini-2.0-flash": "gemini-3.1-flash-lite",
}

class ModelRouter:
    """Manages routing of agent roles to specific LLM models, rate limits, and fallback paths."""
    def __init__(self, custom_routing: Dict[str, str] = None):
        import os
        self.routing = dict(DEFAULT_MODEL_ROUTING)
        if custom_routing:
            self.routing.update(custom_routing)
            
        # Pre-emptively detect missing/invalid Anthropic credentials
        anthropic_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ADMIN_AGENT_ROUTER_KEY") or ""
        if not anthropic_key or not anthropic_key.startswith("sk-ant-"):
            logger.info("No valid Anthropic API key detected. Pre-emptively routing all agents (including Architect and Reviewer) to Google Gemini.")
            self.routing["architect"] = "gemini-2.0-flash-lite"
            self.routing["reviewer"] = "gemini-2.0-flash-lite"

    def route(self, agent_role: str) -> str:
        """Return the target model name for a given agent role."""
        return self.routing.get(agent_role, self.routing["fallback"])

    def get_api_model(self, model_name: str) -> str:
        """Map the specification model name to the official API model identifier."""
        return OFFICIAL_MODEL_MAPPING.get(model_name, model_name)

    def execute_with_backoff(self, api_call: Callable[[], Any], max_retries: int = 5, initial_backoff: float = 2.0) -> Any:
        """
        Execute an LLM API call with exponential backoff handling for rate limits (429 / ResourceExhausted).
        If max_retries are exceeded, raises the exception.
        """
        backoff = initial_backoff
        last_error = None
        for attempt in range(max_retries):
            try:
                return api_call()
            except Exception as e:
                err_str = str(e).lower()
                # Check for rate limit or resource exhausted signatures
                is_rate_limit = "429" in err_str or "rate" in err_str or "exhausted" in err_str or "resource_exhausted" in err_str
                
                if is_rate_limit:
                    logger.warning(f"Rate limit hit during API call. Attempt {attempt + 1}/{max_retries}. Retrying in {backoff}s... Error: {e}")
                    time.sleep(backoff)
                    backoff *= 2.0  # exponential step
                    last_error = e
                else:
                    # Reraise other errors immediately (e.g. invalid API key)
                    raise e
        raise Exception(f"Failed after {max_retries} retries due to rate limits: {last_error}")
