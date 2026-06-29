import logging
from typing import Tuple, Dict, Any, List
from core.loop.hash_detector import compute_content_hash, detect_convergence

logger = logging.getLogger("NEXUS_CorrectionLoop")
logger.setLevel(logging.INFO)

# Global list of correction event logs for reporting and analysis
correction_logs: List[Dict[str, Any]] = []

def get_correction_logs() -> List[Dict[str, Any]]:
    """Retrieve all correction loop events logged during execution."""
    return correction_logs

def clear_correction_logs() -> None:
    """Clear the global correction loop log history."""
    correction_logs.clear()

def correction_loop(
    file_path: str,
    initial_content: str,
    reviewer: Any,
    developer: Any,
    context: dict,
    max_retries: int = 3
) -> Tuple[str, int, str]:
    """
    Runs the progressive self-correction loop on a generated file.
    
    Returns:
        (final_content, retries_used, termination_reason)
        termination_reason: 'approved' | 'max_retries' | 'hash_convergence'
    """
    content = initial_content
    previous_hash = None
    
    logger.info(f"Starting correction loop for file '{file_path}' (max_retries={max_retries})...")
    
    for attempt in range(max_retries):
        # 1. Review the current code
        review_result = reviewer.review(file_path, content, context)
        
        # Check if code is approved
        if review_result.get("approved", False):
            logger.info(f"File '{file_path}' APPROVED by Reviewer on attempt {attempt}.")
            return content, attempt, "approved"
            
        # Get correction feedback
        issues = review_result.get("issues", [])
        feedback = review_result.get("correction_prompt") or "; ".join(issues) or "Please fix code correctness and style."
        
        logger.warning(f"File '{file_path}' REJECTED on attempt {attempt}. Issues: {issues}")
        
        # 2. Developer applies corrections
        corrected = developer.correct(file_path, content, feedback, context)
        
        # 3. Calculate hashes and check for convergence
        hash_before = compute_content_hash(content)
        current_hash = compute_content_hash(corrected)
        
        # Log correction event details
        log_entry = {
            "file": file_path,
            "attempt": attempt + 1,
            "reviewer_feedback": feedback,
            "hash_before": hash_before,
            "hash_after": current_hash,
            "termination_reason": None
        }
        
        if detect_convergence(previous_hash, current_hash):
            logger.error(f"HASH_CONVERGENCE detected for '{file_path}' on attempt {attempt + 1}.")
            log_entry["termination_reason"] = "hash_convergence"
            correction_logs.append(log_entry)
            # Flag for human review (simulation print/log)
            print(f"\n[HUMAN REVIEW FLAG] File: {file_path} converged on attempt {attempt + 1}.")
            print(f"Feedback: {feedback}")
            print(f"Code Content:\n{corrected}\n")
            return corrected, attempt + 1, "hash_convergence"
            
        previous_hash = current_hash
        content = corrected
        
        log_entry["termination_reason"] = "continuing"
        correction_logs.append(log_entry)
        
    logger.error(f"File '{file_path}' exceeded maximum retries without approval.")
    # Update last log entry to show max_retries termination
    if correction_logs and correction_logs[-1]["file"] == file_path:
        correction_logs[-1]["termination_reason"] = "max_retries"
        
    return content, max_retries, "max_retries"
