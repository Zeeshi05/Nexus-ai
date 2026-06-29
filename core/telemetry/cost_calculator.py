from typing import Dict, Tuple

# Price per 1 Million tokens (input, output) in USD
MODEL_PRICING: Dict[str, Tuple[float, float]] = {
    # Anthropic
    "claude-sonnet-4-6": (3.00, 15.00),
    "claude-sonnet-4-5": (3.00, 15.00),
    "claude-opus-4-8": (15.00, 75.00),
    "claude-opus-4-7": (15.00, 75.00),
    "claude-opus-4-6": (15.00, 75.00),
    "close-work-4-6": (15.00, 75.00),
    "claude-haiku-3-5": (0.80, 4.00),
    # Google
    "gemini-2.0-flash": (0.10, 0.40),
    "gemini-2.0-flash-lite": (0.075, 0.30),
    "gemini-2.5-flash": (0.15, 0.60),
    "gemini-2.5-pro": (1.25, 10.00),
    "gemini-1.5-flash": (0.075, 0.30),
    "gemini-1.5-pro": (1.25, 10.00),
    "gemini-3.1-pro-preview": (1.25, 10.00),
    "gemini-3.1-flash-lite": (0.075, 0.30),
    "gemini-3.5-flash": (0.15, 0.60),
}

# Standard mapping to official models if needed
MODEL_ALIASES = {
    "claude-3-5-sonnet-latest": "claude-sonnet-4-6",
    "claude-3-5-sonnet-20241022": "claude-sonnet-4-6",
    "gemini-2.5-flash-lite": "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-preview-02-05": "gemini-2.0-flash-lite",
}

def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """
    Calculate the cost of an LLM call in USD.
    If the model name is not in MODEL_PRICING, looks up aliases, then falls back to gemini-2.0-flash-lite rates.
    """
    # Lookup in pricing table
    pricing_model = model
    if pricing_model not in MODEL_PRICING:
        pricing_model = MODEL_ALIASES.get(model, model)
        
    pricing = MODEL_PRICING.get(pricing_model)
    if not pricing:
        # Fallback pricing (gemini-2.0-flash-lite equivalent)
        pricing = (0.075, 0.30)
        
    input_rate, output_rate = pricing
    input_cost = (input_tokens / 1_000_000.0) * input_rate
    output_cost = (output_tokens / 1_000_000.0) * output_rate
    
    return round(input_cost + output_cost, 6)
