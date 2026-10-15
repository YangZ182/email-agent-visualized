"""AutoMail Agent Studio - Streamlit 入口

运行方式：
    uv run streamlit run streamlit_app.py
"""
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

from components.git_diff_viewer import render_diff_review_section  # noqa: E402
from components.trace_timeline import StreamlitAgentTracer  # noqa: E402
from pages.evaluation_tab import render_evaluation_dashboard  # noqa: E402

st.set_page_config(page_title="AutoMail Agent Studio", page_icon="📬", layout="wide")
st.title("📬 AutoMail Agent Studio")

tab_agent, tab_eval = st.tabs(["🤖 Agent 工作台", "📊 评测大盘"])

with tab_agent:
    tracer = StreamlitAgentTracer()
    status = tracer.start_trace("🤖 LangGraph Agent 空闲（等待邮件触发）")
    with status:
        st.write("配置 GEMINI_API_KEY 与邮箱授权码后，即可启动双邮箱 (QQ/Gmail) 监听工作流。")
    sample_original = "感谢您的来信，我们将尽快处理您的退款请求。"
    render_diff_review_section(sample_original)

with tab_eval:
    render_evaluation_dashboard(benchmark_cases=[])
