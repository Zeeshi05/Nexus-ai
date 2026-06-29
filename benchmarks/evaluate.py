import os
import sys
import json
import time
import re
import subprocess
import tempfile
import urllib.request
import urllib.error
import logging
import statistics
import py_compile
from dotenv import load_dotenv
from typing import Dict, Any, List, Tuple

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

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
from benchmarks.baselines.monolithic import monolithic_pipeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NEXUS_Evaluator")

# ═══════════════════════════════════════════════════
# 1. AUTOMATED CORRECTNESS EVALUATOR
# ═══════════════════════════════════════════════════

def check_js_syntax(file_path: str) -> List[str]:
    """Check JS syntax using Node's syntax parsing compiler in a subprocess."""
    errors = []
    # If file ends with .js, parse it using new Function inside node
    if file_path.endswith(".js"):
        try:
            node_cmd = f"try {{ new Function(require('fs').readFileSync('{file_path}', 'utf-8')); }} catch (e) {{ console.error(e.message); process.exit(1); }}"
            res = subprocess.run(["node", "-e", node_cmd], capture_output=True, text=True, timeout=5)
            if res.returncode != 0:
                errors.append(res.stderr.strip() or f"JS syntax check failed for {file_path}")
        except Exception as e:
            logger.warning(f"Could not check JS syntax via Node for {file_path}: {e}")
    return errors

def check_imports(tmpdir: str, generated_files: Dict[str, str]) -> List[str]:
    """Parse code files and verify that all relative local imports point to existing files."""
    unresolved = []
    
    # Check JS/TS imports
    import_pattern_js = re.compile(r"(?:import|from)\s+['\"](\.\.?/[^'\"]+)['\"]|require\(['\"](\.\.?/[^'\"]+)['\"]\)")
    # Check Python imports
    import_pattern_py = re.compile(r"import\s+([\w\.]+)|from\s+([\w\.]+)\s+import")

    for path, content in generated_files.items():
        abs_path = os.path.join(tmpdir, path)
        if path.endswith((".js", ".ts", ".tsx")):
            matches = import_pattern_js.findall(content)
            for m in matches:
                ref = m[0] or m[1]
                if not ref:
                    continue
                # Clean reference to resolve file path
                clean_ref = ref.rstrip(".js").rstrip(".ts").rstrip(".tsx")
                # Try standard extensions
                resolved = False
                for ext in [".js", ".ts", ".tsx", "/index.js", "/index.ts"]:
                    test_path = os.path.normpath(os.path.join(os.path.dirname(path), clean_ref + ext))
                    if test_path in generated_files:
                        resolved = True
                        break
                if not resolved:
                    unresolved.append(f"Unresolved import '{ref}' in {path}")
                    
        elif path.endswith(".py"):
            matches = import_pattern_py.findall(content)
            for m in matches:
                ref = m[0] or m[1]
                if not ref:
                    continue
                # Split segments (e.g. pipeline.clean)
                parts = ref.split(".")
                # Check if it represents a local file
                test_path = os.path.normpath(os.path.join(os.path.dirname(path), "/".join(parts) + ".py"))
                if "/".join(parts) + ".py" in generated_files or test_path in generated_files:
                    continue
                # If first segment is a module directory in generated files, it is fine
                first_seg_path = parts[0] + "/__init__.py"
                if first_seg_path in generated_files:
                    continue
                    
    return unresolved

def evaluate_build(generated_files: Dict[str, str], task_id: str) -> Dict[str, Any]:
    """
    rigorously check generated files for syntax, import resolution, and execute test scripts/servers.
    """
    results = {
        "syntax_errors": 0,
        "unresolved_imports": 0,
        "execution_success": False,
        "error_details": []
    }
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # 1. Write all generated files to temp directory
        for path, content in generated_files.items():
            full_path = os.path.normpath(os.path.join(tmpdir, path))
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)

        # 2. Syntax check
        for path in generated_files.keys():
            abs_path = os.path.join(tmpdir, path)
            if path.endswith(".py"):
                try:
                    py_compile.compile(abs_path, doraise=True)
                except Exception as e:
                    results["syntax_errors"] += 1
                    results["error_details"].append(f"Python Syntax Error in {path}: {e}")
            elif path.endswith(".js"):
                errors = check_js_syntax(abs_path)
                if errors:
                    results["syntax_errors"] += len(errors)
                    results["error_details"].extend(errors)

        # 3. Import Check
        unresolved = check_imports(tmpdir, generated_files)
        results["unresolved_imports"] = len(unresolved)
        results["error_details"].extend(unresolved)

        # 4. Task Specific Execution Tests
        if task_id == "T2":  # FastAPI server
            logger.info("Running Task T2 (FastAPI) Startup Check...")
            # Create an empty sqlite db file to prevent errors
            open(os.path.join(tmpdir, "test.db"), "w").close()
            # Spawn uvicorn in a background process
            port = 8009
            try:
                # We need to make sure uvicorn runs main:app
                env = os.environ.copy()
                env["PYTHONPATH"] = tmpdir
                proc = subprocess.Popen(
                    [sys.executable, "-m", "uvicorn", "main:app", "--port", str(port), "--host", "127.0.0.1"],
                    cwd=tmpdir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    env=env
                )
                # Wait for server to boot up
                time.sleep(3.0)
                
                # Ping base endpoint
                try:
                    req = urllib.request.Request(f"http://127.0.0.1:{port}/")
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        if resp.status in (200, 201):
                            results["execution_success"] = True
                except urllib.error.HTTPError as he:
                    # Even if 401/404, it means server is handling requests
                    results["execution_success"] = True
                except Exception as ex:
                    results["error_details"].append(f"FastAPI Server ping failed: {ex}")
                    # Capture stdout/stderr logs from server to help diagnostic
                    proc.terminate()
                    stdout, stderr = proc.communicate(timeout=2)
                    results["error_details"].append(f"Server Stderr:\n{stderr.decode('utf-8', errors='ignore')}")
                
                # Cleanup uvicorn
                proc.terminate()
                proc.wait()
            except Exception as e:
                results["error_details"].append(f"FastAPI background launch crashed: {e}")
                
        elif task_id == "T3":  # Pandas Pipeline
            logger.info("Running Task T3 (Pandas Pipeline) Execution Check...")
            # Generate mock transactions CSV
            csv_path = os.path.join(tmpdir, "transactions.csv")
            mock_csv = "transaction_id,product_id,price,quantity,date\n1,prod_a,120.00,2,2026-06-01\n2,prod_b,-5.00,1,2026-06-02\n3,prod_a,120.00,1,2026-06-02\n4,,10.00,1,2026-06-03\n"
            with open(csv_path, "w") as f:
                f.write(mock_csv)
                
            try:
                env = os.environ.copy()
                env["PYTHONPATH"] = tmpdir
                # Run pipeline script
                res = subprocess.run([sys.executable, "run_pipeline.py"], cwd=tmpdir, capture_output=True, text=True, timeout=10, env=env)
                if res.returncode == 0:
                    # Verify outputs generated
                    out_csv_exists = any(os.path.exists(os.path.join(tmpdir, f)) for f in ["summary.csv", "monthly_revenue.csv", "aggregate.csv"])
                    out_png_exists = any(os.path.exists(os.path.join(tmpdir, f)) for f in ["revenue_trend.png", "category_share.png", "sales_chart.png"])
                    
                    if out_csv_exists or out_png_exists:
                        results["execution_success"] = True
                    else:
                        results["error_details"].append("Pandas script ran successfully, but did not write expected summary files or plots.")
                else:
                    results["error_details"].append(f"Pandas script failed (exit {res.returncode}):\nStdout: {res.stdout}\nStderr: {res.stderr}")
            except Exception as e:
                results["error_details"].append(f"Pandas execution failed: {e}")
                
        else:
            # For HTML/React, check basic compiles/exports presence
            results["execution_success"] = (results["syntax_errors"] == 0 and results["unresolved_imports"] == 0)

    return results

# ═══════════════════════════════════════════════════
# 2. TELEMETRY & STATS LOGGER
# ═══════════════════════════════════════════════════

class TelemetryLogger:
    """Aggregates multi-run statistics, computing mean and standard deviation."""
    def __init__(self):
        self.runs: Dict[str, List[Dict[str, Any]]] = {}

    def log_run(self, pipeline_type: str, task_id: str, run_metrics: Dict[str, Any]) -> None:
        key = f"{pipeline_type}_{task_id}"
        if key not in self.runs:
            self.runs[key] = []
        self.runs[key].append(run_metrics)

    def compute_summary(self, pipeline_type: str, task_id: str) -> Dict[str, str]:
        key = f"{pipeline_type}_{task_id}"
        metrics = self.runs.get(key, [])
        if not metrics:
            return {}

        summary = {}
        # List of numeric metrics to compute stats for
        numeric_keys = ["input_tokens", "output_tokens", "cost_usd", "max_tokens_single_call", "wall_clock_time_s", "syntax_errors", "unresolved_imports"]
        
        for k in numeric_keys:
            vals = [m[k] for m in metrics if k in m]
            if not vals:
                continue
            mean = statistics.mean(vals)
            std = statistics.stdev(vals) if len(vals) > 1 else 0.0
            summary[k] = f"{mean:.4f} ± {std:.4f}" if k == "cost_usd" else f"{mean:.1f} ± {std:.1f}"

        # BSR (Build Success Rate) and Execution Success Rate (ESR) percentage
        bsr = sum(1 for m in metrics if m.get("build_success", False)) / len(metrics) * 100
        esr = sum(1 for m in metrics if m.get("execution_success", False)) / len(metrics) * 100
        summary["bsr"] = f"{bsr:.1f}%"
        summary["esr"] = f"{esr:.1f}%"
        summary["runs_count"] = str(len(metrics))

        return summary

# ═══════════════════════════════════════════════════
# 3. EVALUATION RUNNER
# ═══════════════════════════════════════════════════

def run_evaluation():
    # Load env credentials
    load_dotenv(dotenv_path="frontend/.env.local")
    load_dotenv(dotenv_path=".env.local")
    load_dotenv()

    google_key = os.getenv("GOOGLE_AI_API_KEY") or os.getenv("ADMIN_GEMINI_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ADMIN_AGENT_ROUTER_KEY")

    if not google_key or not anthropic_key:
        logger.error("Missing credentials. Please check your .env.local file.")
        return

    logger.info("Initializing rigourous evaluation suite...")
    
    tasks = {
        "T1": "benchmarks/tasks/T1_ecommerce.json",
        "T2": "benchmarks/tasks/T2_fastapi.json",
        "T3": "benchmarks/tasks/T3_pandas.json",
        "T4": "benchmarks/tasks/T4_react_ts.json"
    }

    # Setup trackers and loggers
    tel_logger = TelemetryLogger()
    router = ModelRouter()
    
    # We will run each evaluation run 3 times to get standard deviation
    num_runs = 3

    for task_id, task_path in tasks.items():
        if not os.path.exists(task_path):
            logger.warning(f"Task file {task_path} not found. Skipping.")
            continue

        with open(task_path, "r") as f:
            task_data = json.load(f)
            
        task_name = task_data["name"]
        task_prompt = task_data["prompt"]

        logger.info(f"\n========================================\nTASK {task_id}: {task_name}\n========================================")

        for run_idx in range(num_runs):
            logger.info(f"--- Running Run {run_idx+1}/{num_runs} for NEXUS AI and Baselines ---")

            # ----------------------------------------------------
            # RUN NEXUS AI PIPELINE
            # ----------------------------------------------------
            logger.info(f"Running NEXUS AI swarm on {task_id}...")
            start_time = time.time()
            
            tracker = TokenTracker(log_path=f"experiments/results/temp_{task_id}_nexus_run_{run_idx}.json")
            pm = ProductManagerAgent(google_key, router, tracker)
            architect = ArchitectAgent(anthropic_key, google_key, router, tracker)
            developer = DeveloperAgent(google_key, router, tracker)
            reviewer = ReviewerAgent(anthropic_key, google_key, router, tracker)

            spec_str = pm.clarify_spec(task_prompt)
            plan = architect.plan_project(spec_str)
            decisions = DecisionsLog.from_dict(plan.get("decisions_log", {}))
            
            dag = DAG()
            plan_files_map = {}
            for f_data in plan.get("files", []):
                f_path = f_data["path"]
                plan_files_map[f_path] = f_data
                dag.add_node(f_path)
                for dep in f_data.get("dependencies", []):
                    dag.add_edge(dep, f_path)

            try:
                build_order = dag.topological_sort()
            except CyclicDependencyError as e:
                logger.error(f"Cyclic dependency error in Architect planning: {e}")
                continue

            context_router = ContextRouter(dag, decisions)
            generated_files = {}
            clear_correction_logs()

            for f_path in build_order:
                file_plan = plan_files_map[f_path]
                micro_prompt = file_plan["micro_prompt"]
                context = context_router.get_context(f_path, generated_files, micro_prompt)

                initial_code = developer.generate(f_path, context)
                final_code, retries, reason = correction_loop(
                    file_path=f_path,
                    initial_content=initial_code,
                    reviewer=reviewer,
                    developer=developer,
                    context=context,
                    max_retries=3
                )
                generated_files[f_path] = final_code

            wall_clock = time.time() - start_time
            telemetry = tracker.get_summary()

            # Run automated validation check on NEXUS AI generated files
            results = evaluate_build(generated_files, task_id)
            build_success = (results["syntax_errors"] == 0 and results["unresolved_imports"] == 0)

            # Log metrics
            max_tokens = max((c["input_tokens"] + c["output_tokens"]) for c in tracker.calls) if tracker.calls else 0
            
            nexus_metrics = {
                "input_tokens": sum(c["input_tokens"] for c in tracker.calls),
                "output_tokens": sum(c["output_tokens"] for c in tracker.calls),
                "cost_usd": telemetry["total_cost"],
                "max_tokens_single_call": max_tokens,
                "wall_clock_time_s": wall_clock,
                "syntax_errors": results["syntax_errors"],
                "unresolved_imports": results["unresolved_imports"],
                "build_success": build_success,
                "execution_success": results["execution_success"]
            }
            tel_logger.log_run("nexus", task_id, nexus_metrics)

            # ----------------------------------------------------
            # RUN BASLINES: sequential monolithic Sonnet
            # ----------------------------------------------------
            logger.info(f"Running Monolithic Sonnet baseline on {task_id}...")
            start_time = time.time()
            
            mono_tracker = TokenTracker(log_path=f"experiments/results/temp_{task_id}_sonnet_run_{run_idx}.json")
            
            # Use same file list planned by Architect to ensure fairness
            mono_files = monolithic_pipeline(
                spec=spec_str,
                file_list=build_order,
                tracker=mono_tracker,
                router=router,
                model_name="claude-sonnet-4-6",
                anthropic_key=anthropic_key,
                google_key=google_key
            )

            wall_clock_mono = time.time() - start_time
            mono_telemetry = mono_tracker.get_summary()

            # Run automated validation check on Monolithic generated files
            mono_results = evaluate_build(mono_files, task_id)
            mono_build_success = (mono_results["syntax_errors"] == 0 and mono_results["unresolved_imports"] == 0)
            mono_max_tokens = max((c["input_tokens"] + c["output_tokens"]) for c in mono_tracker.calls) if mono_tracker.calls else 0

            sonnet_metrics = {
                "input_tokens": sum(c["input_tokens"] for c in mono_tracker.calls),
                "output_tokens": sum(c["output_tokens"] for c in mono_tracker.calls),
                "cost_usd": mono_telemetry["total_cost"],
                "max_tokens_single_call": mono_max_tokens,
                "wall_clock_time_s": wall_clock_mono,
                "syntax_errors": mono_results["syntax_errors"],
                "unresolved_imports": mono_results["unresolved_imports"],
                "build_success": mono_build_success,
                "execution_success": mono_results["execution_success"]
            }
            tel_logger.log_run("sonnet", task_id, sonnet_metrics)

            # ----------------------------------------------------
            # RUN PREMIUM BASELINE: Monolithic Claude Opus (Task T1 only)
            # ----------------------------------------------------
            if task_id == "T1":
                logger.info(f"Running Premium Monolithic Opus baseline on T1...")
                start_time = time.time()
                
                opus_tracker = TokenTracker(log_path=f"experiments/results/temp_T1_opus_run_{run_idx}.json")
                
                # Execute monolithic Opus pipeline
                opus_files = monolithic_pipeline(
                    spec=spec_str,
                    file_list=build_order,
                    tracker=opus_tracker,
                    router=router,
                    model_name="claude-opus-4-8", # Maps to Opus or fallback
                    anthropic_key=anthropic_key,
                    google_key=google_key
                )

                wall_clock_opus = time.time() - start_time
                opus_telemetry = opus_tracker.get_summary()

                # Run correctness check
                opus_results = evaluate_build(opus_files, task_id)
                opus_build_success = (opus_results["syntax_errors"] == 0 and opus_results["unresolved_imports"] == 0)
                opus_max_tokens = max((c["input_tokens"] + c["output_tokens"]) for c in opus_tracker.calls) if opus_tracker.calls else 0

                opus_metrics = {
                    "input_tokens": sum(c["input_tokens"] for c in opus_tracker.calls),
                    "output_tokens": sum(c["output_tokens"] for c in opus_tracker.calls),
                    "cost_usd": opus_telemetry["total_cost"],
                    "max_tokens_single_call": opus_max_tokens,
                    "wall_clock_time_s": wall_clock_opus,
                    "syntax_errors": opus_results["syntax_errors"],
                    "unresolved_imports": opus_results["unresolved_imports"],
                    "build_success": opus_build_success,
                    "execution_success": opus_results["execution_success"]
                }
                tel_logger.log_run("opus", task_id, opus_metrics)

    # 4. PRINT REPORT
    print("\n" + "═"*70)
    print("                    FINAL PHASE 2 EVALUATION REPORT")
    print("═"*70)

    final_results = {}
    for task_id in tasks.keys():
        nexus_summary = tel_logger.compute_summary("nexus", task_id)
        sonnet_summary = tel_logger.compute_summary("sonnet", task_id)
        
        final_results[task_id] = {
            "nexus": nexus_summary,
            "sonnet_summary": sonnet_summary
        }

        print(f"\n[TASK {task_id}]")
        print(f"Metrics                    | NEXUS AI Swarm          | Monolithic Sonnet")
        print(f"---------------------------|-------------------------|-------------------------")
        print(f"Cost (USD)                 | {nexus_summary.get('cost_usd', 'N/A'):<23} | {sonnet_summary.get('cost_usd', 'N/A'):<23}")
        print(f"Input Tokens               | {nexus_summary.get('input_tokens', 'N/A'):<23} | {sonnet_summary.get('input_tokens', 'N/A'):<23}")
        print(f"Output Tokens              | {nexus_summary.get('output_tokens', 'N/A'):<23} | {sonnet_summary.get('output_tokens', 'N/A'):<23}")
        print(f"Max Call Tokens            | {nexus_summary.get('max_tokens_single_call', 'N/A'):<23} | {sonnet_summary.get('max_tokens_single_call', 'N/A'):<23}")
        print(f"Wall-Clock Time            | {nexus_summary.get('wall_clock_time_s', 'N/A'):<23} | {sonnet_summary.get('wall_clock_time_s', 'N/A'):<23}")
        print(f"Build Success (BSR)        | {nexus_summary.get('bsr', 'N/A'):<23} | {sonnet_summary.get('bsr', 'N/A'):<23}")
        print(f"Execution Success (ESR)    | {nexus_summary.get('esr', 'N/A'):<23} | {sonnet_summary.get('esr', 'N/A'):<23}")

        if task_id == "T1":
            opus_summary = tel_logger.compute_summary("opus", "T1")
            final_results[task_id]["opus"] = opus_summary
            print(f"---------------------------|-------------------------|-------------------------")
            print(f"Monolithic Opus Cost (T1)  | -                       | {opus_summary.get('cost_usd', 'N/A'):<23}")
            print(f"Monolithic Opus BSR (T1)   | -                       | {opus_summary.get('bsr', 'N/A'):<23}")

    print("═"*70)

    # Save collation to JSON
    with open("experiments/results/phase2_evaluation_summary.json", "w") as f:
        json.dump(final_results, f, indent=2)
    logger.info("Phase 2 evaluation results saved to experiments/results/phase2_evaluation_summary.json")

if __name__ == "__main__":
    run_evaluation()
