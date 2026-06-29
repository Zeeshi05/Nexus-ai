from typing import Dict, List, Any

class DecisionsLog:
    """Manages global architectural decisions log for NEXUS AI pipeline."""
    def __init__(self, framework: str = "", database: str = "", auth_strategy: str = "", 
                 css_approach: str = "", key_conventions: List[str] = None):
        self.framework = framework
        self.database = database
        self.auth_strategy = auth_strategy
        self.css_approach = css_approach
        self.key_conventions = key_conventions or []

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DecisionsLog":
        """Load DecisionsLog from a dict matching the Architect schema."""
        return cls(
            framework=data.get("framework", ""),
            database=data.get("database", ""),
            auth_strategy=data.get("auth_strategy", ""),
            css_approach=data.get("css_approach", ""),
            key_conventions=data.get("key_conventions", [])
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert DecisionsLog to a dict."""
        return {
            "framework": self.framework,
            "database": self.database,
            "auth_strategy": self.auth_strategy,
            "css_approach": self.css_approach,
            "key_conventions": self.key_conventions
        }

    def get_summary(self) -> str:
        """Return a compressed textual summary of architectural decisions."""
        lines = []
        if self.framework:
            lines.append(f"Framework/Tech Stack: {self.framework}")
        if self.database:
            lines.append(f"Database: {self.database}")
        if self.auth_strategy:
            lines.append(f"Auth Strategy: {self.auth_strategy}")
        if self.css_approach:
            lines.append(f"CSS Approach: {self.css_approach}")
        if self.key_conventions:
            conventions = "; ".join(self.key_conventions)
            lines.append(f"Key Conventions: {conventions}")
        return "\n".join(lines)
