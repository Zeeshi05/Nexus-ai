import re
import logging
import google.generativeai as genai
from core.agents.model_router import ModelRouter
from core.telemetry.token_tracker import TokenTracker

logger = logging.getLogger("NEXUS_Developer")
logger.setLevel(logging.INFO)

class DeveloperAgent:
    """Agent responsible for writing individual file source code and applying reviewer corrections."""
    def __init__(self, google_api_key: str, router: ModelRouter, tracker: TokenTracker):
        self.api_key = google_api_key
        self.router = router
        self.tracker = tracker
        genai.configure(api_key=self.api_key)

    def _cleanup_code(self, text: str) -> str:
        """Strip markdown code block fences if returned by the model."""
        cleaned = re.sub(r"^```\w*\n?", "", text)
        cleaned = re.sub(r"\n?```$", "", cleaned)
        return cleaned.strip()

    def generate(self, file_path: str, context: dict) -> str:
        """
        Generate file code from scratch using the context provided (micro-prompt, decisions log, dependencies).
        """
        model_name = self.router.route("developer")
        api_model = self.router.get_api_model(model_name)
        
        system_instruction = (
            "You are a senior software developer. Generate the complete file content for the given task.\n"
            "Return ONLY the raw code — no markdown code blocks, no explanation, no preamble.\n"
            "The first character of your response must be the first character of the file content.\n"
            "Do NOT wrap your code in triple backticks.\n\n"
            "Tech stack & project context:\n"
            f"{context.get('decisions_log_summary', '')}"
        )

        user_prompt = (
            f"Generate complete file: {file_path}\n"
            f"Task details: {context.get('micro_prompt', '')}\n\n"
        )
        if context.get("dependency_source_code"):
            user_prompt += f"Dependency source code context:\n{context['dependency_source_code']}"

        def call_developer():
            model = genai.GenerativeModel(
                model_name=api_model,
                system_instruction=system_instruction
            )
            response = model.generate_content(
                user_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    max_output_tokens=8192
                )
            )
            return response

        logger.info(f"Calling Developer Agent ({api_model}) for '{file_path}'...")
        response = self.router.execute_with_backoff(call_developer)
        
        usage = response.usage_metadata
        input_tokens = usage.prompt_token_count if usage else 2000
        output_tokens = usage.candidates_token_count if usage else 2000
        self.tracker.log_call("developer", model_name, input_tokens, output_tokens)
        
        try:
            text = response.text
        except ValueError as ve:
            logger.warning(f"Gemini text generation failed (blocked or safety filter): {ve}")
            text = f"// Generation blocked or failed for {file_path}\n"
            
        return self._cleanup_code(text)

    def correct(self, file_path: str, previous_content: str, feedback: str, context: dict) -> str:
        """
        Correct existing file content based on code reviewer feedback.
        """
        model_name = self.router.route("developer")
        api_model = self.router.get_api_model(model_name)
        
        system_instruction = (
            "You are a senior software developer. Correct the provided code strictly based on the review feedback.\n"
            "Return ONLY the complete corrected raw code — no markdown code blocks, no explanation, no preamble.\n"
            "The first character of your response must be the first character of the file content.\n"
            "Do NOT wrap your code in triple backticks.\n\n"
            "Tech stack & project context:\n"
            f"{context.get('decisions_log_summary', '')}"
        )

        user_prompt = (
            f"Correct file: {file_path}\n"
            f"Original Task: {context.get('micro_prompt', '')}\n\n"
            f"--- Current Code ---\n{previous_content}\n\n"
            f"--- Reviewer Feedback / Issues to Fix ---\n{feedback}\n\n"
        )
        if context.get("dependency_source_code"):
            user_prompt += f"Dependency source code context:\n{context['dependency_source_code']}"

        def call_correction():
            model = genai.GenerativeModel(
                model_name=api_model,
                system_instruction=system_instruction
            )
            response = model.generate_content(
                user_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    max_output_tokens=8192
                )
            )
            return response

        logger.info(f"Calling Developer Agent ({api_model}) to apply corrections to '{file_path}'...")
        response = self.router.execute_with_backoff(call_correction)
        
        usage = response.usage_metadata
        input_tokens = usage.prompt_token_count if usage else 2000
        output_tokens = usage.candidates_token_count if usage else 2000
        self.tracker.log_call("developer", model_name, input_tokens, output_tokens)
        
        try:
            text = response.text
        except ValueError as ve:
            logger.warning(f"Gemini text generation failed (blocked or safety filter): {ve}")
            text = f"// Correction blocked or failed for {file_path}\n"
            
        return self._cleanup_code(text)
