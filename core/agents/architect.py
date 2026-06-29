import json
import logging
import anthropic
import google.generativeai as genai
from core.agents.model_router import ModelRouter
from core.telemetry.token_tracker import TokenTracker

logger = logging.getLogger("NEXUS_Architect")
logger.setLevel(logging.INFO)

class ArchitectAgent:
    """Agent that plans the build DAG and architectural conventions."""
    def __init__(self, anthropic_api_key: str, google_api_key: str, router: ModelRouter, tracker: TokenTracker):
        self.anthropic_key = anthropic_api_key
        self.google_key = google_api_key
        self.router = router
        self.tracker = tracker

    def plan_project(self, spec_str: str) -> dict:
        """
        Creates the project plan: files list, descriptions, layers, dependencies,
        exports, and micro_prompts. Returns the parsed JSON plan dict.
        """
        model_name = self.router.route("architect")
        api_model = self.router.get_api_model(model_name)
        
        system_instruction = (
            "You are a Software Architect. Given the following project specification, "
            "output ONLY a valid JSON object with this exact schema. Do not include "
            "any prose, markdown, or explanation outside the JSON.\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. Plan at most 6 files total in your DAG. Keep it minimal and focused (e.g., README.md, data layer, css styles, app logic, index.html).\n"
            "2. Keep the micro_prompt for each file extremely concise (at most 2-3 sentences long) to prevent token truncation.\n\n"
            "{\n"
            "  \"files\": [\n"
            "    {\n"
            "      \"path\": \"relative/path/to/file.ext\",\n"
            "      \"description\": \"What this file does in one sentence\",\n"
            "      \"layer\": \"config | data | business | presentation | test\",\n"
            "      \"dependencies\": [\"relative/path/to/dependency1.ext\"],\n"
            "      \"exports\": [\"function_name_1\", \"class_name_1\"],\n"
            "      \"micro_prompt\": \"Detailed instruction for the Developer agent: what to write, what to import from which dependency (include exact function signatures), constraints to follow\"\n"
            "    }\n"
            "  ],\n"
            "  \"decisions_log\": {\n"
            "    \"framework\": \"...\",\n"
            "    \"database\": \"...\",\n"
            "    \"auth_strategy\": \"...\",\n"
            "    \"css_approach\": \"...\",\n"
            "    \"key_conventions\": [\"convention 1\", \"convention 2\"]\n"
            "  }\n"
            "}"
        )

        user_content = f"Project specification: {spec_str}"
        is_gemini_key = self.anthropic_key.startswith("AQ.Ab") or self.anthropic_key.startswith("AI")

        if is_gemini_key:
            logger.info("Anthropic key appears to be a Google Gemini key. Falling back to Gemini Pro/Flash for Architect.")
            def call_gemini():
                genai.configure(api_key=self.anthropic_key)
                model = genai.GenerativeModel(
                    model_name="gemini-2.5-pro" if "pro" in api_model else "gemini-2.5-flash",
                    system_instruction=system_instruction
                )
                response = model.generate_content(
                    user_content,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.2,
                        response_mime_type="application/json"
                    )
                )
                return response
                
            response = self.router.execute_with_backoff(call_gemini)
            usage = response.usage_metadata
            input_tokens = usage.prompt_token_count if usage else 2000
            output_tokens = usage.candidates_token_count if usage else 3000
            self.tracker.log_call("architect", "gemini-2.5-pro", input_tokens, output_tokens)
            text = response.text.strip()
        else:
            # Use official Anthropic SDK
            try:
                client = anthropic.Anthropic(api_key=self.anthropic_key)
                def call_anthropic():
                    return client.messages.create(
                        model=api_model,
                        max_tokens=8000,
                        system=system_instruction,
                        temperature=0.2,
                        messages=[{"role": "user", "content": user_content}]
                    )
                    
                logger.info(f"Calling Architect Agent via Anthropic ({api_model})...")
                response = self.router.execute_with_backoff(call_anthropic)
                input_tokens = response.usage.input_tokens
                output_tokens = response.usage.output_tokens
                self.tracker.log_call("architect", model_name, input_tokens, output_tokens)
                text = response.content[0].text.strip()
            except Exception as e:
                logger.warning(f"Anthropic architect call failed ({e}). Falling back to Gemini.")
                def call_gemini():
                    genai.configure(api_key=self.google_key)
                    model = genai.GenerativeModel(
                        model_name="gemini-3.1-flash-lite",
                        system_instruction=system_instruction
                    )
                    response = model.generate_content(
                        user_content,
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.2,
                            response_mime_type="application/json"
                        )
                    )
                    return response
                    
                response = self.router.execute_with_backoff(call_gemini)
                usage = response.usage_metadata
                input_tokens = usage.prompt_token_count if usage else 2000
                output_tokens = usage.candidates_token_count if usage else 3000
                self.tracker.log_call("architect", "gemini-3.1-flash-lite", input_tokens, output_tokens)
                text = response.text.strip()

        # Clean text in case models return markdown fences
        if text.startswith("```json"):
            text = text.replace("```json", "", 1)
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()

        try:
            plan = json.loads(text)
            return plan
        except Exception as e:
            logger.error(f"Failed to parse JSON output from Architect Agent: {e}\nRaw Response:\n{text}")
            # Try to return a structured dict fallback or raise
            raise e
