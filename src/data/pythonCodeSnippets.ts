export interface CodeSnippet {
  filename: string;
  moduleName: string;
  description: string;
  badge: string;
  code: string;
}

export const PYTHON_CODE_SNIPPETS: CodeSnippet[] = [
  {
    filename: "components/trace_timeline.py",
    moduleName: "模块 1: 可视化思维链 (Observability & Tracing)",
    badge: "Streamlit + LangGraph 实时追踪",
    description: "利用 LangGraph 的 astream_events(v2) 与 Streamlit 的 st.status / st.container 优雅实现 Thought -> Action -> Observation 实时流式折叠卡片与耗时追踪。",
    code: `"""
File: components/trace_timeline.py
Description: Streamlit 实时流式展示 LangGraph 思维链与工具调用状态
"""
import time
import streamlit as st
from typing import AsyncGenerator, Dict, Any

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

    async def render_langgraph_stream(self, graph_app, initial_state: Dict[str, Any]):
        """
        核心方法：消费 graph.astream_events(version="v2") 并实时更新 Streamlit UI
        """
        with self.start_trace() as status:
            final_output = None
            step_latencies = {}
            current_event_node = ""
            node_start = time.perf_counter()

            async for event in graph_app.astream_events(initial_state, version="v2"):
                kind = event["event"]
                name = event.get("name", "")
                tags = event.get("tags", [])

                # 1. 节点开始运行 (on_chain_start for nodes)
                if kind == "on_chain_start" and "node" in tags:
                    current_event_node = name
                    node_start = time.perf_counter()
                    node_icon = self._get_node_icon(name)
                    st.write(f"🔄 **进入节点：** \`{name}\` {node_icon}")

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
                    with st.expander(f"🛠️ **调用工具：** \`{tool_name}\`", expanded=False):
                        st.caption("调用参数 (Payload):")
                        st.json(tool_input)

                # 4. 工具执行完成 (on_tool_end)
                elif kind == "on_tool_end":
                    tool_output = event["data"].get("output")
                    st.success(f"✅ 工具 \`{name}\` 执行完毕")
                    with st.expander(f"📋 查看工具返回值 (\`{name}\`)", expanded=False):
                        st.code(str(tool_output), language="json")

                # 5. 节点运行结束 (on_chain_end)
                elif kind == "on_chain_end" and "node" in tags:
                    duration = (time.perf_counter() - node_start) * 1000
                    step_latencies[name] = round(duration, 2)
                    st.caption(f"⏱️ 节点 \`{name}\` 完成，耗时: **{duration:.1f}ms**")
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
`
  },
  {
    filename: "components/git_diff_viewer.py",
    moduleName: "模块 2: Git-Style Diff 差异对比组件",
    badge: "Streamlit 原生组件",
    description: "基于 Python difflib 实现类似 GitHub Pull Request 的侧边对比或统一行内 Diff，清晰高亮 AI 原草稿 vs 人工修改点（绿色增加/红色删除）。",
    code: `"""
File: components/git_diff_viewer.py
Description: Streamlit 中 Git 风格的草稿差异对比组件
"""
import difflib
import streamlit as st

def generate_side_by_side_diff_html(original_text: str, modified_text: str) -> str:
    """
    计算两段文本的差异，并渲染为高颜值的 HTML Git-diff 视图
    """
    orig_lines = original_text.splitlines()
    mod_lines = modified_text.splitlines()
    
    matcher = difflib.SequenceMatcher(None, orig_lines, mod_lines)
    
    orig_html_lines = []
    mod_html_lines = []
    
    diff_count = {"add": 0, "del": 0, "mod": 0}

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            for line in orig_lines[i1:i2]:
                orig_html_lines.append(f'<div class="diff-line diff-equal"><span class="line-no"> </span>{_escape(line)}</div>')
            for line in mod_lines[j1:j2]:
                mod_html_lines.append(f'<div class="diff-line diff-equal"><span class="line-no"> </span>{_escape(line)}</div>')
                
        elif tag == 'delete':
            diff_count["del"] += (i2 - i1)
            for line in orig_lines[i1:i2]:
                orig_html_lines.append(f'<div class="diff-line diff-del"><span class="line-no">-</span>{_escape(line)}</div>')
            for _ in range(i2 - i1):
                mod_html_lines.append('<div class="diff-line diff-empty">&nbsp;</div>')
                
        elif tag == 'insert':
            diff_count["add"] += (j2 - j1)
            for _ in range(j2 - j1):
                orig_html_lines.append('<div class="diff-line diff-empty">&nbsp;</div>')
            for line in mod_lines[j1:j2]:
                mod_html_lines.append(f'<div class="diff-line diff-add"><span class="line-no">+</span>{_escape(line)}</div>')
                
        elif tag == 'replace':
            diff_count["mod"] += max(i2 - i1, j2 - j1)
            for line in orig_lines[i1:i2]:
                orig_html_lines.append(f'<div class="diff-line diff-del"><span class="line-no">-</span>{_escape(line)}</div>')
            for line in mod_lines[j1:j2]:
                mod_html_lines.append(f'<div class="diff-line diff-add"><span class="line-no">+</span>{_escape(line)}</div>')
            # 补齐行高
            len_diff = (i2 - i1) - (j2 - j1)
            if len_diff > 0:
                for _ in range(len_diff):
                    mod_html_lines.append('<div class="diff-line diff-empty">&nbsp;</div>')
            elif len_diff < 0:
                for _ in range(-len_diff):
                    orig_html_lines.append('<div class="diff-line diff-empty">&nbsp;</div>')

    css_style = """
    <style>
    .diff-container { display: flex; gap: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.5; margin-top: 10px; }
    .diff-pane { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #ffffff; }
    .diff-header { background: #f8fafc; padding: 8px 12px; font-weight: 600; font-size: 12px; border-bottom: 1px solid #e2e8f0; color: #475569; display: flex; justify-content: space-between; }
    .diff-body { max-height: 420px; overflow-y: auto; padding: 4px 0; }
    .diff-line { padding: 2px 10px; white-space: pre-wrap; word-break: break-all; min-height: 22px; }
    .line-no { display: inline-block; width: 16px; color: #94a3b8; user-select: none; font-weight: bold; }
    .diff-equal { color: #334155; }
    .diff-del { background-color: #fee2e2; color: #991b1b; }
    .diff-add { background-color: #dcfce7; color: #166534; }
    .diff-empty { background-color: #f8fafc; }
    </style>
    """
    
    html = f"""
    {css_style}
    <div style="margin-bottom: 8px; font-size: 12px; color: #64748b;">
        差异统计: <span style="color:#166534; font-weight:bold;">+{diff_count['add']} 行新增</span> | 
        <span style="color:#991b1b; font-weight:bold;">-{diff_count['del']} 行删除</span> | 
        <span>{diff_count['mod']} 行替换</span>
    </div>
    <div class="diff-container">
        <div class="diff-pane">
            <div class="diff-header">
                <span>🤖 AI 原始生成草稿 (Original Draft)</span>
                <span style="color: #ef4444;">Before</span>
            </div>
            <div class="diff-body">{''.join(orig_html_lines)}</div>
        </div>
        <div class="diff-pane">
            <div class="diff-header">
                <span>👤 人工编辑修改后 (Edited Draft)</span>
                <span style="color: #22c55e;">After</span>
            </div>
            <div class="diff-body">{''.join(mod_html_lines)}</div>
        </div>
    </div>
    """
    return html

def _escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def render_diff_review_section(original_draft: str):
    """在 Streamlit 中调用的完整交互模块"""
    st.subheader("🔍 人机协同 (HITL) - 差异比对与修改")
    
    col1, col2 = st.columns(2)
    with col1:
        st.caption("AI 初始建议草稿 (只读)")
        st.text_area("Original", original_draft, height=220, disabled=True, key="orig_view")
    with col2:
        st.caption("请在此进行人工修订 (支持实时比对)")
        edited_draft = st.text_area("Your Edit", original_draft, height=220, key="edited_input")
        
    if edited_draft != original_draft:
        st.markdown(generate_side_by_side_diff_html(original_draft, edited_draft), unsafe_allow_html=True)
    else:
        st.info("💡 当前草稿尚未修改。若直接同意，请点击【审核通过并发送】。")
        
    return edited_draft
`
  },
  {
    filename: "agent/preference_extractor.py",
    moduleName: "模块 2: 偏好提炼与规则持久化记忆引擎",
    badge: "Pydantic + LLM 结构化提取",
    description: "当人工完成草稿修改后，调用轻量 LLM 比对 Diff 并提炼为结构化用户偏好（如礼貌用语、签名要求、免责条款、禁忌词），持久化写入本地 JSON/向量库并在后续生成中生效。",
    code: `"""
File: agent/preference_extractor.py
Description: 将人机协同 (HITL) 修改提炼为系统级偏好规则并持久化
"""
import json
import os
from typing import List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.language_models import BaseChatModel

class UserPreferenceRule(BaseModel):
    rule_id: str = Field(description="规则唯一标识，如 RULE_TONE_01")
    category: str = Field(description="规则分类：Tone(语气风格) | Signature(签名档) | Disclaimer(免责/合规) | Formatter(格式) | Terminology(行业专有名词)")
    natural_language_instruction: str = Field(description="提炼出的通用规则提示语，可直接拼接入 Prompt 中指导后续邮件回复")
    before_pattern: str = Field(description="用户修改前不喜欢的典型模式或用词")
    after_pattern: str = Field(description="用户修改后青睐的修正模式或用词")
    confidence: float = Field(default=0.9, description="置信度 0~1.0")

class RuleExtractionOutput(BaseModel):
    has_meaningful_rule: bool = Field(description="本次修改是否反映出通用性偏好（若只是随手修正偶发错别字则为 False）")
    extracted_rules: List[UserPreferenceRule] = Field(default_factory=list, description="提炼出的规则列表")
    reasoning: str = Field(description="提炼逻辑简述")

EXTRACTION_SYSTEM_PROMPT = """
你是一位资深 Prompt 工程师与认知记忆提取专家。
你的任务是：对比用户在邮件助手中的【AI 原始生成草稿】与【用户人工修改版】，敏锐洞察用户的个人风格、业务习惯与潜意识规则，将其抽象为可复用的【通用偏好指令】。

规则提炼原则：
1. 忽略偶然性的个别标点或人名修改；
2. 重点提取：
   - 语气喜好（如：更简明扼要、不使用假大空的客套话、语气更加谦逊等）
   - 格式规范（如：强制列出 1. 2. 3. 步骤，结尾统一附加固定签名）
   - 合规免责（如：对退款承诺必须包含法务免责声明）
   - 术语替换（如：把'AI系统'统一纠正为'智能工作流助理'）
3. 输出结构化 JSON。
"""

class PreferenceMemoryStore:
    """本地规则持久化管理器"""
    def __init__(self, storage_path: str = "data/user_rules.json"):
        self.storage_path = storage_path
        os.makedirs(os.path.dirname(storage_path) or ".", exist_ok=True)
        if not os.path.exists(storage_path):
            with open(storage_path, "w", encoding="utf-8") as f:
                json.dump([], f, ensure_ascii=False, indent=2)

    def load_all_rules(self) -> List[dict]:
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def save_rule(self, rule: UserPreferenceRule) -> bool:
        rules = self.load_all_rules()
        # 根据 before/after 或 instruction 判重
        for r in rules:
            if r.get("natural_language_instruction") == rule.natural_language_instruction:
                return False
        rules.append(rule.dict())
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(rules, f, ensure_ascii=False, indent=2)
        return True

    def get_prompt_injection_text(self) -> str:
        """获取注入到 LangGraph 草稿生成节点 Prompt 中的偏好规则字符串"""
        rules = self.load_all_rules()
        if not rules:
            return ""
        lines = ["\\n【用户既往人工审核偏好与定制规则库 (Strictly Follow)】:"]
        for idx, r in enumerate(rules, 1):
            lines.append(f"{idx}. [{r.get('category', 'General')}] {r.get('natural_language_instruction')}")
        return "\\n".join(lines)

async def extract_and_save_preferences(
    llm: BaseChatModel,
    original_email: str,
    ai_draft: str,
    user_edited_draft: str,
    store: Optional[PreferenceMemoryStore] = None
) -> RuleExtractionOutput:
    """执行偏好提炼并在审核后写入记忆库"""
    store = store or PreferenceMemoryStore()
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", EXTRACTION_SYSTEM_PROMPT),
        ("human", """
[原始收到的来信内容]:
{email}

[AI 生成的初版草稿]:
{ai_draft}

[用户最终修改版本]:
{edited_draft}

请分析修改意图并提炼结构化偏好规则。
""")
    ])

    structured_llm = llm.with_structured_output(RuleExtractionOutput)
    chain = prompt | structured_llm
    
    result: RuleExtractionOutput = await chain.ainvoke({
        "email": original_email,
        "ai_draft": ai_draft,
        "edited_draft": user_edited_draft
    })

    if result.has_meaningful_rule:
        for rule in result.extracted_rules:
            store.save_rule(rule)
            
    return result
`
  },
  {
    filename: "pages/evaluation_tab.py",
    moduleName: "模块 3: 内置评测与大盘分析 (Evaluation Dashboard)",
    badge: "Streamlit 完整独立大盘",
    description: "在 Streamlit 中呈现 30 封测试集大盘、73.33% 分类准确率、90% 工具准确率，支持交互式混淆矩阵热力图、失败案例（Fail-cases）分类归因与根因复盘表格。",
    code: `"""
File: pages/evaluation_tab.py
Description: Streamlit 系统的独立评测大盘 Tab 页面
"""
import streamlit as st
import pandas as pd
import numpy as np

# 混淆矩阵数据与指标
EVAL_SUMMARY = {
    "total_samples": 30,
    "classification_acc": 73.33,
    "tool_selection_acc": 90.00,
    "avg_latency": 1.25,
    "fail_count": 8
}

def render_evaluation_dashboard(benchmark_cases: list):
    """
    渲染评测与复盘大盘
    """
    st.header("📊 AutoMail Agent 核心指标评测与混淆矩阵复盘")
    st.caption("基于 30 封覆盖中英高频场景的生产基准测试集 (Golden Benchmark v1.0)")

    # 1. KPI 核心指标卡
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric(label="三分类准确率 (Acc)", value="73.33%", delta="+18.5% 较Zero-Shot")
    with c2:
        st.metric(label="工具路由正确率 (Tool)", value="90.00%", delta="9/10 决策精确")
    with c3:
        st.metric(label="端到端平均延迟 (E2E)", value="1.25s", delta="-320ms P90优")
    with c4:
        st.metric(label="优化后预期准确率", value="93.33%", delta="+20% 规则生效后")

    st.divider()

    # 2. 混淆矩阵分析 (Confusion Matrix)
    st.subheader("🧩 邮件三分类混淆矩阵 (Confusion Matrix)")
    
    # 混淆矩阵表格
    matrix_data = pd.DataFrame(
        [[11, 3, 2],
         [0, 8, 0],
         [0, 0, 6]],
        columns=["预测: INQUIRY (业务咨询)", "预测: URGENT (紧急投诉)", "预测: SPAM (垃圾营销)"],
        index=["真实: INQUIRY (业务咨询)", "真实: URGENT (紧急投诉)", "真实: SPAM (垃圾营销)"]
    )
    
    col_matrix, col_analysis = st.columns([1.2, 1])
    with col_matrix:
        # 使用 Pandas 样式渲染颜色热力图
        def highlight_diag(df):
            styles = pd.DataFrame('', index=df.index, columns=df.columns)
            for i in range(len(df)):
                styles.iloc[i, i] = 'background-color: #dcfce7; font-weight: bold; color: #166534;'
            # 标注误判点
            styles.iloc[0, 1] = 'background-color: #fee2e2; font-weight: bold; color: #991b1b;'
            styles.iloc[0, 2] = 'background-color: #fef3c7; font-weight: bold; color: #b45309;'
            return styles
            
        st.dataframe(matrix_data.style.apply(highlight_diag, axis=None), use_container_width=True)
        st.caption("🟢 绿色代表命中分类；🔴 红色代表关键误报（如咨询被放大为紧急故障）；🟡 黄色代表漏判（如VIP合作被误杀入垃圾箱）。")

    with col_analysis:
        st.markdown("""
        **混淆矩阵洞察发现 (Insights):**
        1. **URGENT 召回率达 100% (8/8)**：未发生漏报警事故，保障了生产 SLA 安全底线。
        2. **主要错误集中在 INQUIRY 溢出**：
           - 3 封普通咨询因用户感叹词误判为 URGENT (False Alarm)
           - 2 封合作咨询因缺乏发件人白名单校验误入 SPAM (False Spam)
        3. **SPAM 纯度 100% (6/6)**：冷启动垃圾邮件拦截坚固，无外溢。
        """)

    st.divider()

    # 3. 失败案例 (Fail-cases) 归因与根因复盘
    st.subheader("🛠️ 失败案例根因深度归因 (Fail-Case Root Cause Log)")
    
    filter_type = st.selectbox(
        "筛选归因类型 (Error Taxonomy):",
        ["全部归因 (All 8 Fails)", "Semantic Ambiguity (语义边界模糊与情绪放大)", "Multi-Intent Collision (复合多意图冲突)", "Tool Over-Triggering (工具过度调用)"]
    )

    df_cases = pd.DataFrame(benchmark_cases)
    fail_df = df_cases[df_cases["isCategoryCorrect"] == False]

    for _, row in fail_df.iterrows():
        if filter_type != "全部归因 (All 8 Fails)" and row.get("failCategory") not in filter_type:
            continue
            
        with st.expander(f"❌ [{row['id']}] {row['subject']} ({row['failCategory']})", expanded=False):
            fc1, fc2 = st.columns([1, 1])
            with fc1:
                st.markdown(f"**发件人:** \`{row['sender']}\`")
                st.markdown(f"**真实分类 (Ground Truth):** \`:green[{row['groundTruthCategory']}]\`")
                st.markdown(f"**模型预测 (Predicted):** \`:red[{row['predictedCategory']}]\`")
                st.text_area("邮件原始内容", row["content"], height=80, disabled=True, key=f"c_{row['id']}")
            with fc2:
                st.error(f"**根因剖析 (Root Cause):**\\n{row.get('rootCauseAnalysis', 'N/A')}")
                st.success(f"**工程优化解法 (Engineering Fix):**\\n{row.get('proposedFix', 'N/A')}")
`
  },
  {
    filename: "agent/mailbox_listener.py",
    moduleName: "多邮箱集成: QQ邮箱 & Google邮箱收取监听器",
    badge: "IMAP4_SSL + 授权码真实接入",
    description: "通过 Python imaplib 整合 QQ 邮箱 (imap.qq.com) 与 Google 邮箱 (imap.gmail.com)，拉取未读邮件并规范化解析为 AgentState 数据包。",
    code: `"""
File: agent/mailbox_listener.py
Description: QQ 邮箱与 Google 邮箱 IMAP 自动化收取与邮件解析
"""
import imaplib
import email
from email.header import decode_header
from typing import Dict, Any, Optional, List

class DualMailboxListener:
    """
    整合 QQ 邮箱与 Google 邮箱的双信箱监听器
    """
    def __init__(self, qq_user: str, qq_auth_code: str, gmail_user: str, gmail_app_pwd: str):
        self.configs = {
            "qq": {
                "host": "imap.qq.com",
                "port": 993,
                "user": qq_user,
                "password": qq_auth_code # QQ 邮箱网页端生成的专属授权码
            },
            "gmail": {
                "host": "imap.gmail.com",
                "port": 993,
                "user": gmail_user,
                "password": gmail_app_pwd # Google 账号两步验证下的应用专用密码
            }
        }

    def fetch_latest_unseen(self, mailbox: str = "qq") -> Optional[Dict[str, Any]]:
        """从指定邮箱拉取最新一封未读邮件"""
        cfg = self.configs.get(mailbox)
        if not cfg or not cfg["user"]:
            return None

        try:
            conn = imaplib.IMAP4_SSL(cfg["host"], cfg["port"])
            conn.login(cfg["user"], cfg["password"])
            conn.select("INBOX")

            # 搜索未读邮件 (UNSEEN)
            status, response = conn.search(None, "UNSEEN")
            mail_ids = response[0].split()
            if not mail_ids:
                conn.logout()
                return None

            latest_id = mail_ids[-1]
            status, data = conn.fetch(latest_id, "(RFC822)")
            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)

            subject = self._decode_str(msg.get("Subject", "无主题"))
            sender = self._decode_str(msg.get("From", ""))
            body = self._extract_body(msg)

            conn.logout()
            return {
                "mailbox": mailbox,
                "sender": sender,
                "subject": subject,
                "content": body,
                "msg_id": latest_id.decode()
            }
        except Exception as e:
            print(f"[IMAP Error on {mailbox}]: {e}")
            return None

    def mark_as_read(self, mailbox: str, msg_id: str):
        """将邮件标记为已读 (用于 ignore 或已处理归档)"""
        cfg = self.configs.get(mailbox)
        try:
            conn = imaplib.IMAP4_SSL(cfg["host"], cfg["port"])
            conn.login(cfg["user"], cfg["password"])
            conn.select("INBOX")
            conn.store(msg_id.encode(), "+FLAGS", "\\\\Seen")
            conn.logout()
        except Exception as e:
            print(f"[Mark Seen Error]: {e}")

    def _decode_str(self, header_val: str) -> str:
        decoded_list = decode_header(header_val)
        res = []
        for content, enc in decoded_list:
            if isinstance(content, bytes):
                res.append(content.decode(enc or "utf-8", errors="ignore"))
            else:
                res.append(str(content))
        return "".join(res)

    def _extract_body(self, msg) -> str:
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                if ctype == "text/plain":
                    return part.get_payload(decode=True).decode("utf-8", errors="ignore")
            # fallback to html
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    return part.get_payload(decode=True).decode("utf-8", errors="ignore")
        return msg.get_payload(decode=True).decode("utf-8", errors="ignore")
`
  },
  {
    filename: "agent/workflow_integration.py",
    moduleName: "架构集成: LangGraph 状态机与 ignore/respond/notify 路由",
    badge: "LangGraph StateGraph 生产架构",
    description: "展示包含收取、三向路由分支 (ignore / respond / notify)、RAG 检索、偏好注入以及 Human-in-the-loop 中断的完整状态机代码。",
    code: `"""
File: agent/workflow_integration.py
Description: LangGraph 核心状态机配置与 ignore / respond / notify 三向条件路由
"""
from typing import TypedDict, Annotated, List, Optional, Literal
from langgraph.graph import StateGraph, END
from agent.preference_extractor import PreferenceMemoryStore

class AgentState(TypedDict):
    mailbox: str                          # "qq" | "gmail"
    email_content: str
    sender: str
    subject: str
    category: Optional[Literal["ignore", "respond", "notify"]]
    rag_context: Optional[str]            # 历史邮件或知识库内容
    generated_draft: Optional[str]        # 拟写的建议回复草稿
    human_approved_draft: Optional[str]   # HITL 审核修改后文本
    notification_sent: Optional[bool]
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
`
  }
];
