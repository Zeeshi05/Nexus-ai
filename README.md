# NEXUS AI: Heterogeneous Multi-Agent Software Development Pipeline

NEXUS AI is a hierarchical multi-agent framework designed to automate full-stack software development. It leverages a heterogeneous model swarm that allocates planning and review tasks to high-reasoning models (Claude 3.5 Sonnet) while offloading high-volume code synthesis tasks to low-cost models (Gemini Flash), optimizing cost, speed, and codebase correctness.

---

## 🚀 5-Step Installation & Quickstart

Follow these 5 steps to get the pipeline up and running:

### 1. Clone & Navigate to Repository
```bash
git clone https://github.com/your-username/nexus-ai.git
cd nexus-ai
```

### 2. Install Dependencies
Ensure you have Python 3.9+ installed, then install required packages:
```bash
pip install -r requirements.txt
```

### 3. Configure API Credentials
Create a `.env.local` file in the root directory (or copy `.env.example`) and add your Anthropic and Gemini API keys:
```bash
cp .env.example .env.local
# Open and edit .env.local to include your keys:
# GOOGLE_AI_API_KEY="AI..."
# ANTHROPIC_API_KEY="sk-ant-..."
```

### 4. Run the Pipeline
Execute the main orchestrator pipeline on a sample task (e.g., building a dashboard):
```bash
python core/pipeline.py --task "build a simple task manager web app" --output-dir output
```

### 5. Run Automated Evaluations (Benchmarks)
Run the automated benchmark runner to evaluate cost metrics and correction loops on easy/hard tasks:
```bash
python benchmarks/evaluate.py
```

---

## 📁 Repository Structure

```
nexus-ai/
├── core/                        ← Pipeline orchestrator & agents
│   ├── agents/                  ← Role specialized agents (PM, Architect, Developer, Reviewer)
│   ├── graph/                   ← DAG planner & Context routing engine
│   ├── loop/                    ← Progressive correction loop with MD5 detection
│   └── telemetry/               ← Token counters and cost calculations
├── benchmarks/                  ← Evaluation and baseline runners
│   ├── tasks/                   ← Benchmark task definitions (JSON)
│   ├── baselines/               ← Monolithic baseline scripts
│   └── evaluate.py              ← Automated evaluation runner
├── frontend/                    ← Next.js interface for local visual playground
├── experiments/                 ← Evaluation results, logs, and cost reports
└── paper/                       ← LaTeX research paper draft sources
```

---

## 📝 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
