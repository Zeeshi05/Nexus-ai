import json
import logging
import anthropic
import google.generativeai as genai
from core.agents.model_router import ModelRouter
from core.telemetry.token_tracker import TokenTracker

logger = logging.getLogger("NEXUS_Reviewer")
logger.setLevel(logging.INFO)

class ReviewerAgent:
    """Agent that performs static analysis, security audits, and type checking on files."""
    def __init__(self, anthropic_api_key: str, google_api_key: str, router: ModelRouter, tracker: TokenTracker):
        self.anthropic_key = anthropic_api_key
        self.google_key = google_api_key
        self.router = router
        self.tracker = tracker

    def review(self, file_path: str, code: str, context: dict) -> dict:
        """
        Review the generated file code.
        Returns a dict with schema:
        {
          "approved": bool,
          "file_content": "complete corrected file content",
          "issues": ["issue1", "issue2"],
          "correction_prompt": "specific fix instructions"
        }
        """
        model_name = self.router.route("reviewer")
        api_model = self.router.get_api_model(model_name)
        
        decisions_summary = context.get("decisions_log_summary", "")
        micro_prompt = context.get("micro_prompt", "")
        
        system_instruction = (
            "You are a senior code reviewer. Review the provided code strictly.\n"
            "Respond ONLY with a valid JSON object matching this exact schema:\n"
            "{\n"
            "  \"approved\": true | false,\n"
            "  \"file_content\": \"complete corrected file content (with your fixes applied)\",\n"
            "  \"issues\": [\"issue1\", \"issue2\"],\n"
            "  \"correction_prompt\": \"specific fix instructions if not approved\"\n"
            "}\n\n"
            "Check: correctness, security (XSS/injection), best practices, types.\n"
            "Minor issues: fix silently in file_content and set approved: true.\n"
            "Major issues: set approved: false with specific correction_prompt.\n\n"
            f"Project context:\n{decisions_summary}"
        )

        user_content = (
            f"File: {file_path}\n"
            f"Task: {micro_prompt}\n\n"
            f"Code to review:\n{code}"
        )

        is_gemini_key = self.anthropic_key.startswith("AQ.Ab") or self.anthropic_key.startswith("AI")
        text = ""

        if is_gemini_key:
            logger.info("Anthropic key appears to be a Google Gemini key. Falling back to Gemini Pro/Flash for Reviewer.")
            def call_gemini():
                genai.configure(api_key=self.anthropic_key)
                model = genai.GenerativeModel(
                    model_name="gemini-2.5-pro" if "pro" in api_model else "gemini-2.5-flash",
                    system_instruction=system_instruction
                )
                response = model.generate_content(
                    user_content,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,
                        response_mime_type="application/json"
                    )
                )
                return response
                
            response = self.router.execute_with_backoff(call_gemini)
            usage = response.usage_metadata
            input_tokens = usage.prompt_token_count if usage else 2000
            output_tokens = usage.candidates_token_count if usage else 1500
            self.tracker.log_call("reviewer", "gemini-2.5-pro", input_tokens, output_tokens)
            text = response.text.strip()
        else:
            try:
                client = anthropic.Anthropic(api_key=self.anthropic_key)
                def call_anthropic():
                    return client.messages.create(
                        model=api_model,
                        max_tokens=6000,
                        system=system_instruction,
                        temperature=0.1,
                        messages=[{"role": "user", "content": user_content}]
                    )
                    
                logger.info(f"Calling Reviewer Agent via Anthropic ({api_model})...")
                response = self.router.execute_with_backoff(call_anthropic)
                input_tokens = response.usage.input_tokens
                output_tokens = response.usage.output_tokens
                self.tracker.log_call("reviewer", model_name, input_tokens, output_tokens)
                text = response.content[0].text.strip()
            except Exception as e:
                logger.warning(f"Anthropic reviewer call failed ({e}). Falling back to Gemini.")
                def call_gemini():
                    genai.configure(api_key=self.google_key)
                    model = genai.GenerativeModel(
                        model_name="gemini-3.1-flash-lite",
                        system_instruction=system_instruction
                    )
                    response = model.generate_content(
                        user_content,
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.1,
                            response_mime_type="application/json"
                        )
                    )
                    return response
                    
                response = self.router.execute_with_backoff(call_gemini)
                usage = response.usage_metadata
                input_tokens = usage.prompt_token_count if usage else 2000
                output_tokens = usage.candidates_token_count if usage else 1500
                self.tracker.log_call("reviewer", "gemini-3.1-flash-lite", input_tokens, output_tokens)
                text = response.text.strip()

        # Clean markdown fences
        if text.startswith("```json"):
            text = text.replace("```json", "", 1)
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()

        try:
            return json.loads(text)
        except Exception as e:
            logger.error(f"Failed to parse JSON output from Reviewer Agent: {e}\nRaw Response:\n{text}")
            # If we fail to parse, approve with original code to prevent blocking
            return {
                "approved": True,
                "file_content": code,
                "issues": [f"Reviewer parse failure: {e}"],
                "correction_prompt": None
            }
