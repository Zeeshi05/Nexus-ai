import hashlib
import logging

logger = logging.getLogger("NEXUS_HashDetector")
logger.setLevel(logging.INFO)

def compute_content_hash(content: str) -> str:
    """Compute the MD5 hex digest of a content string for convergence tracking."""
    return hashlib.md5(content.encode("utf-8")).hexdigest()

def detect_convergence(previous_hash: str, current_hash: str) -> bool:
    """Returns True if the content hashes match, indicating convergence/no-change."""
    if previous_hash == current_hash:
        logger.warning(f"MD5 Hash Convergence detected! Output fingerprint matches previous iteration.")
        return True
    return False
