import json

from agent.preference_extractor import PreferenceMemoryStore, UserPreferenceRule


def test_save_and_inject_rules(tmp_path):
    store = PreferenceMemoryStore(str(tmp_path / "rules.json"))
    rule = UserPreferenceRule(
        rule_id="RULE_TONE_01",
        category="Tone",
        natural_language_instruction="回复需简明扼要，不使用客套话",
        before_pattern="您好！非常感谢您...",
        after_pattern="您好，",
    )
    assert store.save_rule(rule) is True
    assert store.save_rule(rule) is False  # 判重
    text = store.get_prompt_injection_text()
    assert "RULE" not in text or "Tone" in text
    data = json.loads((tmp_path / "rules.json").read_text())
    assert len(data) == 1 and data[0]["category"] == "Tone"
