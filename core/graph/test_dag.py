import pytest
from core.graph.dag import DAG, CyclicDependencyError
from core.graph.decisions_log import DecisionsLog
from core.graph.context_router import ContextRouter

def test_dag_10_nodes():
    dag = DAG()
    # Define a 10-node graph
    # 0: config.json
    # 1: db.py
    # 2: models.py
    # 3: auth.py
    # 4: middleware.py
    # 5: utils.py
    # 6: routes.py
    # 7: app.py
    # 8: test_db.py
    # 9: test_routes.py
    
    # Add nodes
    nodes = [f"node_{i}" for i in range(10)]
    for node in nodes:
        dag.add_node(node)
        
    # Add edges: (u, v) means u must be built before v (u -> v)
    dag.add_edge("node_0", "node_1")  # config -> db
    dag.add_edge("node_0", "node_3")  # config -> auth
    dag.add_edge("node_1", "node_2")  # db -> models
    dag.add_edge("node_1", "node_8")  # db -> test_db
    dag.add_edge("node_3", "node_4")  # auth -> middleware
    dag.add_edge("node_2", "node_6")  # models -> routes
    dag.add_edge("node_4", "node_6")  # middleware -> routes
    dag.add_edge("node_5", "node_6")  # utils -> routes
    dag.add_edge("node_6", "node_7")  # routes -> app
    dag.add_edge("node_6", "node_9")  # routes -> test_routes

    # Compute topological sort
    sorted_order = dag.topological_sort()
    
    # Verify we got all 10 nodes
    assert len(sorted_order) == 10
    assert set(sorted_order) == set(nodes)

    # Verify dependency constraints: for each node in sorted_order, its index must be
    # greater than the index of any of its dependencies.
    pos = {node: idx for idx, node in enumerate(sorted_order)}
    assert pos["node_0"] < pos["node_1"]
    assert pos["node_0"] < pos["node_3"]
    assert pos["node_1"] < pos["node_2"]
    assert pos["node_1"] < pos["node_8"]
    assert pos["node_3"] < pos["node_4"]
    assert pos["node_2"] < pos["node_6"]
    assert pos["node_4"] < pos["node_6"]
    assert pos["node_5"] < pos["node_6"]
    assert pos["node_6"] < pos["node_7"]
    assert pos["node_6"] < pos["node_9"]


def test_cycle_detection():
    dag = DAG()
    dag.add_edge("a", "b")
    dag.add_edge("b", "c")
    dag.add_edge("c", "a")  # Cycle!

    with pytest.raises(CyclicDependencyError) as excinfo:
        dag.topological_sort()
        
    # Check that cycle path was reported
    assert "a" in excinfo.value.cycle_path
    assert "b" in excinfo.value.cycle_path
    assert "c" in excinfo.value.cycle_path


def test_context_router_bounding():
    dag = DAG()
    dag.add_edge("dep.py", "target.py")
    
    dec_log = DecisionsLog(
        framework="Next.js",
        database="Supabase",
        auth_strategy="JWT",
        css_approach="TailwindCSS",
        key_conventions=["use typescript"]
    )
    
    router = ContextRouter(dag, dec_log)
    
    # Safe case: short dependency source code
    generated = {"dep.py": "def foo(): pass"}
    context = router.get_context("target.py", generated, "Write code importing dep")
    assert context["total_tokens"] < 8000
    
    # Over-limit case: huge dependency source code (e.g. 50k chars -> ~12.5k tokens)
    huge_source = "def big_func():\n" + "    pass\n" * 6000
    generated = {"dep.py": huge_source}
    
    with pytest.raises(AssertionError) as excinfo:
        router.get_context("target.py", generated, "Write code importing dep")
        
    assert "Context size" in str(excinfo.value)
