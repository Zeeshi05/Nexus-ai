import collections
from typing import List, Dict, Set

class CyclicDependencyError(Exception):
    """Exception raised when a cycle is detected in the dependency graph."""
    def __init__(self, cycle_path: List[str]):
        self.cycle_path = cycle_path
        super().__init__(f"Cyclic dependency detected: {' -> '.join(cycle_path)}")


class DAG:
    """Directed Acyclic Graph (DAG) for planning file generation tasks."""
    def __init__(self):
        self.nodes: Set[str] = set()
        self.adj: Dict[str, Set[str]] = collections.defaultdict(set)
        self.in_degree: Dict[str, int] = collections.defaultdict(int)

    def add_node(self, node: str) -> None:
        """Add a node to the graph if it doesn't exist."""
        if node not in self.nodes:
            self.nodes.add(node)

    def add_edge(self, u: str, v: str) -> None:
        """Add a directed edge from u to v (u must be completed before v)."""
        self.add_node(u)
        self.add_node(v)
        if v not in self.adj[u]:
            self.adj[u].add(v)
            self.in_degree[v] += 1

    def get_dependencies(self, node: str, recursive: bool = False) -> Set[str]:
        """
        Get dependencies for a node.
        If recursive=False, returns direct dependencies (nodes that point to this node).
        If recursive=True, returns all transitive dependencies.
        """
        if node not in self.nodes:
            return set()

        # Direct dependencies: nodes that have an edge pointing to `node`
        # In our representation, u -> v means u is a dependency of v.
        # So we search for nodes `u` such that `node` is in `self.adj[u]`.
        direct_deps = {u for u in self.nodes if node in self.adj[u]}
        if not recursive:
            return direct_deps

        # Recursive (transitive) dependencies
        visited = set()
        queue = list(direct_deps)
        while queue:
            curr = queue.pop(0)
            if curr not in visited:
                visited.add(curr)
                # Find direct dependencies of `curr`
                curr_deps = {u for u in self.nodes if curr in self.adj[u]}
                queue.extend(curr_deps - visited)
        return visited

    def topological_sort(self) -> List[str]:
        """
        Compute a valid topological sort order of the nodes.
        Raises CyclicDependencyError if a cycle is detected, reporting the cycle path.
        """
        # We can detect cycles using DFS, which helps retrieve the exact path.
        visited = {}  # 0 = unvisited, 1 = visiting, 2 = visited
        temp_path = []
        cycle_path = []

        for node in self.nodes:
            visited[node] = 0

        def dfs(node: str) -> bool:
            visited[node] = 1  # visiting
            temp_path.append(node)
            for neighbor in self.adj[node]:
                if visited[neighbor] == 1:
                    # Cycle detected! Reconstruct the cycle path.
                    idx = temp_path.index(neighbor)
                    cycle_path.extend(temp_path[idx:])
                    cycle_path.append(neighbor)
                    return True
                elif visited[neighbor] == 0:
                    if dfs(neighbor):
                        return True
            temp_path.pop()
            visited[node] = 2  # visited
            return False

        for node in self.nodes:
            if visited[node] == 0:
                if dfs(node):
                    raise CyclicDependencyError(cycle_path)

        # If no cycle, use Kahn's algorithm or standard sorting to build execution order.
        # Standard Kahn's algorithm:
        in_deg = {n: 0 for n in self.nodes}
        for u in self.nodes:
            for v in self.adj[u]:
                in_deg[v] += 1

        queue = [n for n in self.nodes if in_deg[n] == 0]
        # Sort queue to ensure deterministic topological order
        queue.sort()
        order = []

        while queue:
            u = queue.pop(0)
            order.append(u)
            for v in self.adj[u]:
                in_deg[v] -= 1
                if in_deg[v] == 0:
                    queue.append(v)
            # Re-sort to maintain deterministic ordering
            queue.sort()

        return order
