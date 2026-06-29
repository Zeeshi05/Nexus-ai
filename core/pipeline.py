import os
import sys
import argparse
import json
import logging
from dotenv import load_dotenv

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import our custom modules
from core.graph.dag import DAG, CyclicDependencyError
from core.graph.decisions_log import DecisionsLog
from core.graph.context_router import ContextRouter
from core.telemetry.token_tracker import TokenTracker
from core.agents.model_router import ModelRouter
from core.agents.product_manager import ProductManagerAgent
from core.agents.architect import ArchitectAgent
from core.agents.developer import DeveloperAgent
from core.agents.reviewer import ReviewerAgent
from core.loop.correction_loop import correction_loop, get_correction_logs, clear_correction_logs

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("NEXUS_Pipeline")

def main():
    parser = argparse.ArgumentParser(description="NEXUS AI: Heterogeneous Multi-Agent Software Development Pipeline")
    parser.add_argument("--task", type=str, required=True, help="Project specification/prompt")
    parser.add_argument("--output-dir", type=str, default="output", help="Directory where generated code is written")
    args = parser.parse_args()

    # Load environment variables from frontend folder or root
    load_dotenv(dotenv_path="frontend/.env.local")
    load_dotenv(dotenv_path=".env.local")
    load_dotenv()

    # Retrieve API keys
    google_key = os.getenv("GOOGLE_AI_API_KEY") or os.getenv("ADMIN_GEMINI_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ADMIN_AGENT_ROUTER_KEY")

    if not google_key:
        logger.error("Missing Google AI/Gemini API key. Set GOOGLE_AI_API_KEY or ADMIN_GEMINI_KEY in environment.")
        return
    if not anthropic_key:
        logger.error("Missing Anthropic API key. Set ANTHROPIC_API_KEY or ADMIN_AGENT_ROUTER_KEY in environment.")
        return

    logger.info("Initializing NEXUS AI Pipeline...")
    logger.info(f"Task Specification: '{args.task}'")

    # Initialize telemetry trackers
    tracker = TokenTracker(log_path="experiments/results/pipeline_telemetry.json")
    router = ModelRouter()

    # Create Agents
    pm_agent = ProductManagerAgent(google_key, router, tracker)
    architect_agent = ArchitectAgent(anthropic_key, google_key, router, tracker)
    developer_agent = DeveloperAgent(google_key, router, tracker)
    reviewer_agent = ReviewerAgent(anthropic_key, google_key, router, tracker)

    # 1. Product Manager Clarification Phase
    logger.info("=== Phase 1: Requirement Clarification (PM) ===")
    spec_json_str = pm_agent.clarify_spec(args.task)
    logger.info(f"Structured Spec generated successfully:\n{spec_json_str}")

    # 2. Architect DAG Planning Phase
    logger.info("=== Phase 2: Architecture & DAG Planning (Architect) ===")
    plan = architect_agent.plan_project(spec_json_str)
    
    # Process decisions log
    decisions_data = plan.get("decisions_log", {})
    decisions_log = DecisionsLog.from_dict(decisions_data)
    logger.info(f"Decisions Log Summary:\n{decisions_log.get_summary()}")

    # Build DAG
    dag = DAG()
    files_data = plan.get("files", [])
    
    # Track metadata mapping from file path to plan details
    plan_files_map = {}
    for f in files_data:
        path = f.get("path")
        plan_files_map[path] = f
        dag.add_node(path)
        for dep in f.get("dependencies", []):
            dag.add_edge(dep, path)

    # Topological Sort & Cycle Detection
    try:
        execution_order = dag.topological_sort()
        logger.info(f"DAG planning successful. Build order: {execution_order}")
    except CyclicDependencyError as e:
        logger.error(f"FATAL: Cyclic dependency detected by Architect Agent: {e}")
        return

    # Initialize Context Router
    context_router = ContextRouter(dag, decisions_log)

    # 3. Execution Phase (Developer & Reviewer Loop)
    logger.info("=== Phase 3: Code Generation & Self-Correction ===")
    generated_files = {}
    clear_correction_logs()

    # Loop Stats Tracker
    stats = {
        "approved_first_try": 0,
        "corrected_1x": 0,
        "corrected_2x": 0,
        "hash_convergence": 0,
        "max_retries": 0,
        "total_files": len(execution_order)
    }

    for idx, file_path in enumerate(execution_order):
        logger.info(f"Generating file {idx+1}/{len(execution_order)}: '{file_path}'")
        
        file_plan = plan_files_map.get(file_path, {})
        micro_prompt = file_plan.get("micro_prompt", f"Write file {file_path}")
        assigned_to = file_plan.get("layer", "config") # layer or custom rule

        # Compile Context
        context = context_router.get_context(file_path, generated_files, micro_prompt)

        # Generate initial code
        # We assign logic-heavy files to high reasoning models via Developer Agent parameters if needed,
        # but DeveloperAgent internally routes to flash or falls back.
        initial_code = developer_agent.generate(file_path, context)

        # Run Self-Correction Loop
        final_code, retries, reason = correction_loop(
            file_path=file_path,
            initial_content=initial_code,
            reviewer=reviewer_agent,
            developer=developer_agent,
            context=context,
            max_retries=3
        )

        # Update stats
        if reason == "approved":
            if retries == 0:
                stats["approved_first_try"] += 1
            elif retries == 1:
                stats["corrected_1x"] += 1
            elif retries == 2:
                stats["corrected_2x"] += 1
        elif reason == "hash_convergence":
            stats["hash_convergence"] += 1
        elif reason == "max_retries":
            stats["max_retries"] += 1

        # Store result in state memory
        generated_files[file_path] = final_code

        # Write file to output folder
        full_dest_path = os.path.join(args.output_dir, file_path)
        os.makedirs(os.path.dirname(full_dest_path), exist_ok=True)
        with open(full_dest_path, "w", encoding="utf-8") as out_f:
            out_f.write(final_code)
        logger.info(f"File '{file_path}' written successfully to disk.")

    # 4. Telemetry Summarization & Logging Phase
    logger.info("=== Phase 4: Build Complete ===")
    summary = tracker.get_summary()
    logger.info(f"Total Cost: ${summary['total_cost']:.6f} USD")
    logger.info(f"Total Tokens: {summary['total_tokens']}")
    logger.info(f"Role Breakdown: {json.dumps(summary['role_breakdown'], indent=2)}")
    logger.info(f"Correction Loop Statistics:\n{json.dumps(stats, indent=2)}")

    # Write summary reports
    report = {
        "task": args.task,
        "stats": stats,
        "telemetry": summary,
        "correction_events": get_correction_logs()
    }
    
    report_path = "experiments/results/build_report.json"
    with open(report_path, "w", encoding="utf-8") as rep_f:
        json.dump(report, rep_f, indent=2)
    logger.info(f"Detailed build report written to {report_path}")

if __name__ == "__main__":
    main()
