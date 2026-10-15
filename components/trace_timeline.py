"""
File: components/trace_timeline.py
Description: Streamlit 实时流式展示 LangGraph 思维链与工具调用状态
"""
import time
from typing import Any

import streamlit as st


class StreamlitAgentTracer:
    """
    负责在 Streamlit 中流式呈现 LangGraph 执行状态的追踪器。
    支持：Node 状态卡片、Thought 思考流、Tool 传参与返回值展开、各步骤高精度耗时。
    """
    def __init__(self, container=None):
        self.container = container or st.container()
        self.step_start_time = None
        self.current_node = None
        self.status_box = None

    def start_trace(self, title: str = "🤖 LangGraph Agent 正在协同执行工作流..."):
        self.status_box = self.container.status(title, expanded=True)
        return self.status_box

    async def render_langgraph_stream(self, graph_app, initial_state: dict[str, Any]):
        """
        核心方法：消费 graph.astream_events(version="v2") 并实时更新 Streamlit UI
        """
        with self.start_trace() as status:
            final_output = None
            step_latencies = {}
            node_start = time.perf_counter()

            async for event in graph_app.astream_events(initial_state, version="v2"):
                kind = event["event"]
                name = event.get("name", "")
                tags = event.get("tags", [])

                # 1. 节点开始运行 (on_chain_start for nodes)
                if kind == "on_chain_start" and "node" in tags:
                    node_start = time.perf_counter()
                    node_icon = self._get_node_icon(name)
                    st.write(f"🔄 **进入节点：** `{name}` {node_icon}")

                # 2. 模型思考/流式 Token (on_chat_model_stream)
                elif kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    # 可以在特定节点流式打印思考过程 (Thought)
                    if hasattr(chunk, "content") and chunk.content:
                        pass # 可按需输出到二级 sub-container

                # 3. 工具调用触发 (on_tool_start)
                elif kind == "on_tool_start":
                    tool_name = name
                    tool_input = event["data"].get("input")
                    with st.expander(f"🛠️ **调用工具：** `{tool_name}`", expanded=False):
                        st.caption("调用参数 (Payload):")
                        st.json(tool_input)

                # 4. 工具执行完成 (on_tool_end)
                elif kind == "on_tool_end":
                    tool_output = event["data"].get("output")
                    st.success(f"✅ 工具 `{name}` 执行完毕")
                    with st.expander(f"📋 查看工具返回值 (`{name}`)", expanded=False):
                        st.code(str(tool_output), language="json")

                # 5. 节点运行结束 (on_chain_end)
                elif kind == "on_chain_end" and "node" in tags:
                    duration = (time.perf_counter() - node_start) * 1000
                    step_latencies[name] = round(duration, 2)
                    st.caption(f"⏱️ 节点 `{name}` 完成，耗时: **{duration:.1f}ms**")
                    st.divider()

                # 6. 获取最终结果
                elif kind == "on_chain_end" and name == "LangGraph":
                    final_output = event["data"].get("output")

            status.update(label="✨ Agent 工作流执行完毕！", state="complete", expanded=False)
            return final_output, step_latencies

    def _get_node_icon(self, node_name: str) -> str:
        icons = {
            "classify_node": "🏷️ (邮件三分类)",
            "rag_retrieve_node": "📚 (RAG 历史检索)",
            "tool_executor": "⚙️ (业务工具执行)",
            "generate_draft_node": "✍️ (草稿生成)",
            "hitl_approval_node": "👤 (人工复核)",
        }
        return icons.get(node_name, "⚡")
