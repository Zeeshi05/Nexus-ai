import logging
from typing import Dict, Any, Set
from core.graph.dag import DAG
from core.graph.decisions_log import DecisionsLog

# Setup logger
logger = logging.getLogger("NEXUS_ContextRouter")
logger.setLevel(logging.INFO)

class ContextRouter:
    """Computes dependency subsets and formats contexts for agent execution while enforcing token limits."""
    def __init__(self, dag: DAG, decisions_log: DecisionsLog):
        self.dag = dag
        self.decisions_log = decisions_log
        self.tokenizer = None
        
        # Try to initialize tiktoken tokenizer
        try:
            import tiktoken
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except ImportError:
            logger.warning("tiktoken package not found. Falling back to character-count based estimation (1 token ~ 4 chars).")

    def count_tokens(self, text: str) -> int:
        """Count the tokens in a text block, falling back to char approximation if tiktoken is missing."""
        if self.tokenizer:
            return len(self.tokenizer.encode(text))
        return len(text) // 4

    def get_context(self, file_path: str, generated_files: Dict[str, str], micro_prompt: str) -> Dict[str, Any]:
        """
        Compile the full prompt context for the developer agent, including:
        - The micro_prompt
        - The decisions log summary
        - The source code of all direct dependencies
        
        Asserts and logs that the total token count is under 8k (8192 tokens).
        """
        # Retrieve direct dependencies
        direct_deps = self.dag.get_dependencies(file_path, recursive=False)
        
        dep_sources = []
        for dep in sorted(direct_deps):
            if dep in generated_files:
                dep_sources.append(f"--- {dep} ---\n{generated_files[dep]}")
            else:
                logger.warning(f"Dependency '{dep}' for file '{file_path}' has not been generated yet.")

        dependency_source_code = "\n\n".join(dep_sources)
        decisions_summary = self.decisions_log.get_summary()

        # Build full simulated developer prompt to measure exact tokens injected
        full_context_str = (
            f"SYSTEM: You are a developer.\n"
            f"PROJECT CONTEXT:\n{decisions_summary}\n\n"
            f"DEPENDENCY CONTEXT:\n{dependency_source_code}\n\n"
            f"TASK:\nFile: {file_path}\nInstructions: {micro_prompt}\n"
        )

        tokens = self.count_tokens(full_context_str)
        logger.info(f"Context compiled for file '{file_path}'. Total tokens: {tokens}")

        # Assert token size constraint is under 8k (8192) tokens
        # In a real environment, if this fails we raise or log a warning
        assert tokens < 8000, f"Context bloat error: Context size for '{file_path}' is {tokens} tokens, which exceeds the 8k limit!"

        return {
            "micro_prompt": micro_prompt,
            "decisions_log_summary": decisions_summary,
            "dependency_source_code": dependency_source_code,
            "total_tokens": tokens
        }
