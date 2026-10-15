"""
File: agent/preference_extractor.py
Description: 将人机协同 (HITL) 修改提炼为系统级偏好规则并持久化
"""
import json
import os

from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field


class UserPreferenceRule(BaseModel):
    rule_id: str = Field(description="规则唯一标识，如 RULE_TONE_01")
    category: str = Field(description="规则分类：Tone(语气风格) | Signature(签名档) | Disclaimer(免责/合规) | Formatter(格式) | Terminology(行业专有名词)")
    natural_language_instruction: str = Field(description="提炼出的通用规则提示语，可直接拼接入 Prompt 中指导后续邮件回复")
    before_pattern: str = Field(description="用户修改前不喜欢的典型模式或用词")
    after_pattern: str = Field(description="用户修改后青睐的修正模式或用词")
    confidence: float = Field(default=0.9, description="置信度 0~1.0")

class RuleExtractionOutput(BaseModel):
    has_meaningful_rule: bool = Field(description="本次修改是否反映出通用性偏好（若只是随手修正偶发错别字则为 False）")
    extracted_rules: list[UserPreferenceRule] = Field(default_factory=list, description="提炼出的规则列表")
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

    def load_all_rules(self) -> list[dict]:
        try:
            with open(self.storage_path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def save_rule(self, rule: UserPreferenceRule) -> bool:
        rules = self.load_all_rules()
        # 根据 before/after 或 instruction 判重
        for r in rules:
            if r.get("natural_language_instruction") == rule.natural_language_instruction:
                return False
        rules.append(rule.model_dump())
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(rules, f, ensure_ascii=False, indent=2)
        return True

    def get_prompt_injection_text(self) -> str:
        """获取注入到 LangGraph 草稿生成节点 Prompt 中的偏好规则字符串"""
        rules = self.load_all_rules()
        if not rules:
            return ""
        lines = ["\n【用户既往人工审核偏好与定制规则库 (Strictly Follow)】:"]
        for idx, r in enumerate(rules, 1):
            lines.append(f"{idx}. [{r.get('category', 'General')}] {r.get('natural_language_instruction')}")
        return "\n".join(lines)

async def extract_and_save_preferences(
    llm: BaseChatModel,
    original_email: str,
    ai_draft: str,
    user_edited_draft: str,
    store: PreferenceMemoryStore | None = None
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
