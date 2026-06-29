import os
import json
import time
from typing import Dict, List, Any
from core.telemetry.cost_calculator import calculate_cost

class TokenTracker:
    """Tracks token consumption and real-time cost accumulation across agents."""
    def __init__(self, log_path: str = "experiments/results/telemetry_log.json"):
        self.log_path = log_path
        self.calls: List[Dict[str, Any]] = []
        self.role_accumulation: Dict[str, Dict[str, Any]] = {}
        
        # Ensure log directory exists
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)

    def log_call(self, agent_role: str, model_used: str, input_tokens: int, output_tokens: int) -> float:
        """
        Record a single model call, calculate cost, update accumulator, and append to logs.
        Returns the cost in USD of this single call.
        """
        cost = calculate_cost(model_used, input_tokens, output_tokens)
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        call_record = {
            "timestamp": timestamp,
            "agent_role": agent_role,
            "model_used": model_used,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": cost
        }
        
        self.calls.append(call_record)
        
        # Accumulate by agent role
        if agent_role not in self.role_accumulation:
            self.role_accumulation[agent_role] = {
                "input_tokens": 0,
                "output_tokens": 0,
                "cost_usd": 0.0,
                "calls_count": 0
            }
            
        role_stats = self.role_accumulation[agent_role]
        role_stats["input_tokens"] += input_tokens
        role_stats["output_tokens"] += output_tokens
        role_stats["cost_usd"] = round(role_stats["cost_usd"] + cost, 6)
        role_stats["calls_count"] += 1
        
        # Save to JSON log file
        self.save_logs()
        return cost

    def save_logs(self) -> None:
        """Write all logged calls and running totals to a JSON file."""
        data = {
            "summary": {
                "total_input_tokens": sum(c["input_tokens"] for c in self.calls),
                "total_output_tokens": sum(c["output_tokens"] for c in self.calls),
                "total_cost_usd": round(sum(c["cost_usd"] for c in self.calls), 6),
                "total_calls": len(self.calls)
            },
            "by_role": self.role_accumulation,
            "calls": self.calls
        }
        with open(self.log_path, "w") as f:
            json.dump(data, f, indent=2)

    def get_summary(self) -> Dict[str, Any]:
        """Get the current aggregated metrics."""
        return {
            "total_cost": round(sum(c["cost_usd"] for c in self.calls), 6),
            "total_tokens": sum(c["input_tokens"] + c["output_tokens"] for c in self.calls),
            "role_breakdown": self.role_accumulation
        }
