"""
File: agent/workflow_integration.py
Description: LangGraph 核心状态机配置与 ignore / respond / notify 三向条件路由
"""
from typing import Literal, TypedDict

from langgraph.graph import END, StateGraph

from agent.preference_extractor import PreferenceMemoryStore


class AgentState(TypedDict):
    mailbox: str                          # "qq" | "gmail"
    email_content: str
    sender: str
    subject: str
    category: Literal["ignore", "respond", "notify"] | None
    rag_context: str | None            # 历史邮件或知识库内容
    generated_draft: str | None        # 拟写的建议回复草稿
    human_approved_draft: str | None   # HITL 审核修改后文本
    notification_sent: bool | None
    latencies: dict

def create_email_agent_graph(llm, memory_store: PreferenceMemoryStore):
    workflow = StateGraph(AgentState)

    # 1. 注册核心状态机节点
    workflow.add_node("classify_router_node", lambda state: _classify_email(state, llm))
    workflow.add_node("archive_ignore_node", lambda state: _archive_mail(state))
    workflow.add_node("push_notification_node", lambda state: _push_notification(state))
    workflow.add_node("rag_retrieve_node", lambda state: _rag_retrieve(state))
    workflow.add_node("generate_draft_node", lambda state: _generate_draft(state, llm, memory_store))
    workflow.add_node("hitl_review_node", lambda state: state) # 人工审核断点

    # 2. 条件路由逻辑 (Conditional Edge Routing)
    def route_after_classify(state: AgentState):
        category = state.get("category", "ignore")
        if category == "ignore":
            return "archive_ignore_node"      # 垃圾/推广信 -> 静默标记已读归档 -> END
        elif category == "notify":
            return "push_notification_node"   # 面试邀请/安全告警 -> 手机即时提醒 -> END
        elif category == "respond":
            return "rag_retrieve_node"        # 业务/技术咨询 -> 历史 RAG -> 拟稿 -> HITL
        return END

    workflow.set_entry_point("classify_router_node")
    workflow.add_conditional_edges(
        "classify_router_node",
        route_after_classify,
        {
            "archive_ignore_node": "archive_ignore_node",
            "push_notification_node": "push_notification_node",
            "rag_retrieve_node": "rag_retrieve_node"
        }
    )

    # 3. 边连接
    workflow.add_edge("archive_ignore_node", END)
    workflow.add_edge("push_notification_node", END)
    workflow.add_edge("rag_retrieve_node", "generate_draft_node")
    workflow.add_edge("generate_draft_node", "hitl_review_node")
    workflow.add_edge("hitl_review_node", END)

    # 4. 编译图，并在 hitl_review_node 设置中断 (Human-in-the-loop)
    app = workflow.compile(interrupt_before=["hitl_review_node"])
    return app

def _classify_email(state: AgentState, llm):
    """三分类路由器节点"""
    prompt = f"""
你是一名严谨的个人邮件意图分类路由器。请审阅来自 {state['mailbox']} 邮箱的邮件，并判定路由类型：
- ignore: 广告促销、垃圾推广、自动发票收据等无需任何人工介入的信息；
- notify: 重大个人事项（如大厂面试邀请通知、账号安全登录异地告警、云服务欠费通知、导师老板关键指示），需立即推送手机提醒本人处理，不可擅自回复；
- respond: 涉及技术交流、业务咨询、开源协作等需要整理资料回复的邮件。

发件人: {state['sender']}
标题: {state['subject']}
内容: {state['email_content']}

请仅输出一个词: ignore / notify / respond
"""
    res = llm.invoke(prompt).content.strip().lower()
    category = "respond" if "respond" in res else "notify" if "notify" in res else "ignore"
    return {"category": category}

def _archive_mail(state: AgentState):
    # 调用 mailbox_listener.mark_as_read 归档
    return {"notification_sent": False}

def _push_notification(state: AgentState):
    # 调用 Bark 或 企业微信 Webhook 推送通知到手机
    return {"notification_sent": True}

def _rag_retrieve(state: AgentState):
    # 在 Chroma 向量库检索既往邮件往来及 FAQ
    return {"rag_context": "历史回复参考: 我们项目支持双邮箱轮询..."}

def _generate_draft(state: AgentState, llm, memory_store: PreferenceMemoryStore):
    # 动态注入既往人工审核修改沉淀的偏好记忆！
    rules_text = memory_store.get_prompt_injection_text()
    prompt = f"""
请针对收到的来信拟写一封礼貌、清晰的回复草稿。

【收件内容】: {state['email_content']}
【历史上下文】: {state.get('rag_context', '')}

{rules_text}
"""
    draft = llm.invoke(prompt).content
    return {"generated_draft": draft}
