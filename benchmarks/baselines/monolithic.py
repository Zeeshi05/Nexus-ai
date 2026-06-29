import os
import sys
import re
import logging
from typing import List, Dict, Tuple
import google.generativeai as genai
import anthropic

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from core.telemetry.token_tracker import TokenTracker
from core.agents.model_router import ModelRouter

logger = logging.getLogger("NEXUS_Monolithic_Baseline")
logger.setLevel(logging.INFO)

def _cleanup_code(text: str) -> str:
    """Strip markdown code block fences if returned by the model."""
    cleaned = re.sub(r"^```\w*\n?", "", text)
    cleaned = re.sub(r"\n?```$", "", cleaned)
    return cleaned.strip()

def monolithic_pipeline(
    spec: str,
    file_list: List[str],
    tracker: TokenTracker,
    router: ModelRouter,
    model_name: str = "claude-sonnet-4-6",
    anthropic_key: str = "",
    google_key: str = ""
) -> Dict[str, str]:
    """
    Generate all files sequentially.
    Each call gets the project spec AND the source code of ALL previously generated files as context.
    This simulates the monolithic O(N^2) context bloat baseline.
    """
    generated_files: Dict[str, str] = {}
    api_model = router.get_api_model(model_name)
    is_gemini_key = anthropic_key.startswith("AQ.Ab") or anthropic_key.startswith("AI")

    logger.info(f"Starting Monolithic Pipeline using {model_name} ({api_model}) for {len(file_list)} files...")

    for idx, file_path in enumerate(file_list):
        logger.info(f"Monolithic generating {idx+1}/{len(file_list)}: '{file_path}'")

        # 1. Build the full context containing ALL previously generated files
        context_parts = []
        for path, content in generated_files.items():
            context_parts.append(f"--- {path} ---\n{content}")
        full_history_context = "\n\n".join(context_parts)

        # 2. Compile prompt
        system_instruction = (
            "You are a senior full-stack developer. Generate the complete file content for the given file path.\n"
            "Return ONLY the raw code — no markdown code blocks, no explanation, no preamble.\n"
            "The first character of your response must be the first character of the file content.\n"
            "Do NOT wrap your code in triple backticks."
        )

        user_prompt = (
            f"Project Specification:\n{spec}\n\n"
            f"Codebase generated so far:\n{full_history_context}\n\n"
            f"Now generate the complete source code for: {file_path}\n"
        )

        text = ""

        # 3. Call model and track usage
        if is_gemini_key:
            genai.configure(api_key=anthropic_key)
            api_gemini_model = "gemini-2.5-pro" if "pro" in api_model or "opus" in api_model else "gemini-3.1-flash-lite"
            
            def call_gemini():
                model = genai.GenerativeModel(
                    model_name=api_gemini_model,
                    system_instruction=system_instruction
                )
                return model.generate_content(
                    user_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.2,
                        max_output_tokens=8192
                    )
                )
            
            response = router.execute_with_backoff(call_gemini)
            usage = response.usage_metadata
            input_tokens = usage.prompt_token_count if usage else 2000
            output_tokens = usage.candidates_token_count if usage else 2000
            tracker.log_call("developer", api_gemini_model, input_tokens, output_tokens)
            text = response.text.strip()
        else:
            try:
                client = anthropic.Anthropic(api_key=anthropic_key)
                
                def call_anthropic():
                    try:
                        return client.messages.create(
                            model=api_model,
                            max_tokens=8000,
                            system=system_instruction,
                            temperature=0.2,
                            messages=[{"role": "user", "content": user_prompt}]
                        )
                    except anthropic.BadRequestError as e:
                        if "temperature" in str(e).lower():
                            logger.warning(f"Temperature is deprecated for {model_name}. Retrying without temperature.")
                            return client.messages.create(
                                model=api_model,
                                max_tokens=8000,
                                system=system_instruction,
                                messages=[{"role": "user", "content": user_prompt}]
                            )
                        raise e
                
                response = router.execute_with_backoff(call_anthropic)
                input_tokens = response.usage.input_tokens
                output_tokens = response.usage.output_tokens
                tracker.log_call("developer", model_name, input_tokens, output_tokens)
                text = response.content[0].text.strip()
            except Exception as e:
                logger.warning(f"Anthropic monolithic call failed ({e}). Falling back to Gemini.")
                genai.configure(api_key=google_key)
                api_gemini_model = "gemini-3.1-flash-lite"
                
                def call_gemini():
                    model = genai.GenerativeModel(
                        model_name=api_gemini_model,
                        system_instruction=system_instruction
                    )
                    return model.generate_content(
                        user_prompt,
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.2,
                            max_output_tokens=8192
                        )
                    )
                
                response = router.execute_with_backoff(call_gemini)
                usage = response.usage_metadata
                input_tokens = usage.prompt_token_count if usage else 2000
                output_tokens = usage.candidates_token_count if usage else 2000
                tracker.log_call("developer", api_gemini_model, input_tokens, output_tokens)
                text = response.text.strip()

        # 4. Clean and save generated code
        generated_files[file_path] = _cleanup_code(text)

    return generated_files
