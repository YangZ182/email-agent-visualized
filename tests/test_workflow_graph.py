from agent.preference_extractor import PreferenceMemoryStore
from agent.workflow_integration import create_email_agent_graph


class FakeResp:
    content = "respond"


class FakeLLM:
    def invoke(self, _):
        return FakeResp()


def test_graph_compiles_with_interrupt(tmp_path):
    graph = create_email_agent_graph(FakeLLM(), PreferenceMemoryStore(str(tmp_path / "r.json")))
    assert "hitl_review_node" in graph.get_graph().nodes
