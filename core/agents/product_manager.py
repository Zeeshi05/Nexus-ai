import logging
import google.generativeai as genai
from core.agents.model_router import ModelRouter
from core.telemetry.token_tracker import TokenTracker

logger = logging.getLogger("NEXUS_PM")
logger.setLevel(logging.INFO)

class ProductManagerAgent:
    """Agent that clarifies and structures project requirements using Gemini Flash-Lite."""
    def __init__(self, google_api_key: str, router: ModelRouter, tracker: TokenTracker):
        self.api_key = google_api_key
        self.router = router
        self.tracker = tracker
        # Configure genai globally
        genai.configure(api_key=self.api_key)

    def clarify_spec(self, raw_spec: str) -> str:
        """
        Structures the raw user requirement into a clear, standardized JSON specification document.
        """
        model_name = self.router.route("product_manager")
        api_model = self.router.get_api_model(model_name)
        
        system_instruction = (
            "You are a Senior Product Manager. Your task is to take a raw project description "
            "and output a structured, complete project specification in valid JSON format. "
            "Never generate code, only project requirements and scope.\n\n"
            "Output JSON Schema:\n"
            "{\n"
            "  \"project_name\": \"Name of project\",\n"
            "  \"summary\": \"Clear 2-3 sentence overview of what the application does\",\n"
            "  \"tech_stack\": {\n"
            "    \"frontend\": \"HTML5, Vanilla JS, Vanilla CSS\",\n"
            "    \"backend\": \"Local mock APIs, local storage, or HTML5 routing\",\n"
            "    \"database\": \"Memory mock state or simple JSON file if specified\"\n"
            "  },\n"
            "  \"key_features\": [\n"
            "    \"Feature 1 description\",\n"
            "    \"Feature 2 description\"\n"
            "  ]\n"
            "}"
        )

        def call_pm():
            model = genai.GenerativeModel(
                model_name=api_model,
                system_instruction=system_instruction
            )
            response = model.generate_content(
                f"Clarify and structure this project requirement: {raw_spec}",
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )
            return response

        logger.info(f"Calling PM Agent ({api_model}) for specification...")
        response = self.router.execute_with_backoff(call_pm)
        
        # Track tokens
        usage = response.usage_metadata
        input_tokens = usage.prompt_token_count if usage else 100
        output_tokens = usage.candidates_token_count if usage else 200
        self.tracker.log_call("product_manager", model_name, input_tokens, output_tokens)
        
        return response.text.strip()
