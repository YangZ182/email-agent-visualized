export type RouteCategory = 'ignore' | 'respond' | 'notify';
export type MailboxSource = 'qq' | 'gmail';

export interface SampleEmail {
  id: string;
  uid: string;
  mailbox: MailboxSource;
  sender: string;
  recipient: string;
  subject: string;
  content: string;
  expectedCategory: RouteCategory;
  defaultAiDraft: string;
  expectedTool?: 'send_email_tool' | 'Question' | 'none';
  questionPrompt?: string;
}

export interface PreferenceRule {
  id: string;
  kind: 'triage' | 'response';
  title: string;
  ruleText: string;
  source: string;
}

// 严格对应 YangZ182/email-agent 中 tests/ui_fixture_app.py 与 evaluation/dataset.py 的真实邮件
export const REAL_EMAILS: SampleEmail[] = [
  {
    id: "qq-90002",
    uid: "90002",
    mailbox: "qq",
    sender: "测试发件人 <sender@example.com>",
    recipient: "2942397812@qq.com",
    subject: "确认收件",
    content: "请确认收到附件，谢谢。",
    expectedCategory: "respond",
    expectedTool: "send_email_tool",
    defaultAiDraft: "确认收到，谢谢。"
  },
  {
    id: "qq-90001",
    uid: "90001",
    mailbox: "qq",
    sender: "项目协作方 <collab@company.example.com>",
    recipient: "2942397812@qq.com",
    subject: "报告提交日期",
    content: "您好，请确认报告将在何时提交。",
    expectedCategory: "respond",
    expectedTool: "Question",
    questionPrompt: "Agent 问询：请确认报告提交日期。",
    defaultAiDraft: "您好，报告将在本周五前提交，谢谢。"
  },
  {
    id: "qq-90003",
    uid: "90003",
    mailbox: "qq",
    sender: "服务账单中心 <billing@service.example.com>",
    recipient: "2942397812@qq.com",
    subject: "账户续费通知",
    content: "**服务将在下周续费**，扣款金额为￥1,499，无需回复。\n\n[查看账户详情](https://example.com/account?tracking=123456789)\n\n续费说明：如需更改请在控制台设置。",
    expectedCategory: "notify",
    expectedTool: "none",
    defaultAiDraft: ""
  },
  {
    id: "gmail-eval-01",
    uid: "gm-4012",
    mailbox: "gmail",
    sender: "Alex Dev <alex-dev@stanford.edu>",
    recipient: "zheyang3858@gmail.com",
    subject: "Quick sync on LangGraph email assistant project",
    content: "Hi Zhe, are you available for a 15-minute sync on the email-agent architecture this Thursday at 2 PM PST? Please let me know if this works.",
    expectedCategory: "respond",
    expectedTool: "send_email_tool",
    defaultAiDraft: "Hi Alex,\n\nThanks for reaching out! Thursday at 2 PM PST works for me.\n\nBest regards,\nZhe"
  },
  {
    id: "gmail-eval-02",
    uid: "gm-4015",
    mailbox: "gmail",
    sender: "DevOps Alerts <alerts@cloud-platform.com>",
    recipient: "zheyang3858@gmail.com",
    subject: "Scheduled maintenance - database downtime",
    content: "The production database will be unavailable from 02:00 to 04:00 UTC on 2026-10-12 for scheduled maintenance. Plan work around this window. No reply is required.",
    expectedCategory: "notify",
    expectedTool: "none",
    defaultAiDraft: ""
  },
  {
    id: "qq-90005",
    uid: "90005",
    mailbox: "qq",
    sender: "技术图书商城 <promo@bookstore.example.com>",
    recipient: "2942397812@qq.com",
    subject: "促销广告：全场技术图书五折",
    content: "本周全场正版技术图书五折促销，点击商城浏览商品。本邮件为系统广告，无须回复。",
    expectedCategory: "ignore",
    expectedTool: "none",
    defaultAiDraft: ""
  }
];

// 严格对应 YangZ182/email-agent 仓库中 data/preferences/*.md 的真实规则
export const REPO_PREFERENCES: PreferenceRule[] = [
  {
    id: "PREF-TRIAGE-01",
    kind: "triage",
    title: "最高优先级：验证码类邮件一律归为 NOTIFY",
    ruleText: "邮件主题或正文出现验证码、校验码、动态口令、OTP、verification code 等关键词，必须选择 NOTIFY。此规则优先于所有 IGNORE/RESPOND 规则，绝不代发或代点击，仅提醒本人查看。",
    source: "data/preferences/triage_preferences.md"
  },
  {
    id: "PREF-RESPONSE-01",
    kind: "response",
    title: "单句确认与简洁落款",
    ruleText: "使用单句确认，不加多余客套问候语或冗长落款（例如回复：“Received.” 或 “确认收到，谢谢。”）。保持客观克制，绝不虚构事实。",
    source: "data/preferences/response_preferences.md"
  },
  {
    id: "PREF-RESPONSE-02",
    kind: "response",
    title: "事实不完备时主动触发 Question",
    ruleText: "遇到会议排期邀约或缺少关键事实时，助手绝不臆造时间与结论，必须调用 Question 工具向用户提问获取确切事实。",
    source: "src/email_assistant/email_assistant_hitl.py"
  },
  {
    id: "PREF-TRIAGE-02",
    kind: "triage",
    title: "通知邮件免回复（Notify 无需起草）",
    ruleText: "重要账户信息、续费提醒、体检通知与系统维护归为 NOTIFY，提醒用户知悉，不自动回复正文。",
    source: "data/preferences/triage_preferences.md"
  }
];
