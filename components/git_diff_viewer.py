"""
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
