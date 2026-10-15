import React, { useState } from 'react';
import { REAL_EMAILS, SampleEmail, RouteCategory, REPO_PREFERENCES, PreferenceRule } from '../data/sampleEmails';
import { Play, CheckCircle2, Mail, Send, Sparkles, BookOpen, RefreshCw, Edit3, Check, RotateCcw, AlertCircle, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

export const AgentWorkspaceTab: React.FC = () => {
  const [emails, setEmails] = useState<SampleEmail[]>(REAL_EMAILS);
  const [selectedEmailId, setSelectedEmailId] = useState<string>(REAL_EMAILS[0].id);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  // 人工修改版本初始严格为空，遵照要求不预填相同内容
  const [editedDrafts, setEditedDrafts] = useState<Record<string, string>>({});
  const [rules, setRules] = useState<PreferenceRule[]>(REPO_PREFERENCES);
  const [notice, setNotice] = useState<string | null>(null);

  // 流程图节点点亮状态 (左到右)
  const [isRunning, setIsRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || emails[0];

  // 统计双邮箱未读数量
  const qqUnreadCount = emails.filter((e) => e.mailbox === 'qq').length;
  const gmailUnreadCount = emails.filter((e) => e.mailbox === 'gmail').length;

  // 运行 LangGraph 从左到右的状态机点亮动画
  const runWorkflowAnimation = (targetEmail: SampleEmail) => {
    setIsRunning(true);
    setActiveNode('fetch');
    setCompletedNodes([]);

    const route = targetEmail.expectedCategory;
    let sequence: string[] = [];

    if (route === 'ignore') {
      sequence = ['fetch', 'triage_router', 'mark_as_read_ignore'];
    } else if (route === 'notify') {
      sequence = ['fetch', 'triage_router', 'triage_interrupt'];
    } else {
      // respond 触发 Respond Agent 子图：llm_call -> interrupt_handler -> send_tool -> mark_as_read
      sequence = ['fetch', 'triage_router', 'respond_agent_subgraph', 'llm_call', 'interrupt_handler', 'send_email_tool', 'mark_as_read_node'];
    }

    let idx = 0;
    const timer = setInterval(() => {
      idx += 1;
      if (idx < sequence.length) {
        setActiveNode(sequence[idx]);
        setCompletedNodes(sequence.slice(0, idx));
      } else {
        clearInterval(timer);
        setActiveNode(null);
        setCompletedNodes(sequence);
        setIsRunning(false);
      }
    }, 450);
  };

  const handleSelectEmail = (email: SampleEmail) => {
    setSelectedEmailId(email.id);
    runWorkflowAnimation(email);
  };

  // 重新加载初始邮箱邮件
  const handleResetEmails = () => {
    setEmails(REAL_EMAILS);
    setSelectedEmailId(REAL_EMAILS[0].id);
    setEditedDrafts({});
    setEditingEmailId(null);
    setNotice("已重新同步收件箱未读邮件列表。");
    setTimeout(() => setNotice(null), 3000);
  };

  // Notify 邮件：按原有项目，给出 [转为回复] 与 [忽略]
  const handleNotifyToRespond = (emailId: string) => {
    setEmails((prev) =>
      prev.map((e) => {
        if (e.id === emailId) {
          return {
            ...e,
            expectedCategory: 'respond',
            expectedTool: 'send_email_tool',
            defaultAiDraft: `您好！关于您来信所提事项，我已查阅并在此回复：已了解相关日程并着手准备。如有最新变动请随时联系。祝好！`
          };
        }
        return e;
      })
    );
    setNotice("已将本通知转为待回复 (Respond)，并由 Respond Agent 起草。");
    setTimeout(() => setNotice(null), 3000);
    const updated = emails.find((e) => e.id === emailId);
    if (updated) {
      runWorkflowAnimation({ ...updated, expectedCategory: 'respond' });
    }
  };

  const handleNotifyIgnore = (emailId: string) => {
    // 遵照要求：处理完这条就应该消失
    setEmails((prev) => prev.filter((e) => e.id !== emailId));
    setNotice("已处理通知并标记已读，该邮件已移出未读列表。");
    setTimeout(() => setNotice(null), 3000);
  };

  // Respond 邮件：重新生成草稿
  const handleRegenerateDraft = (emailId: string) => {
    setEmails((prev) =>
      prev.map((e) => {
        if (e.id === emailId) {
          return {
            ...e,
            defaultAiDraft: e.defaultAiDraft.includes("Best regards")
              ? `Hi Alex,\n\nConfirming receipt. Thursday at 2 PM PST works perfectly for our sync.\n\nBest,\nZhe`
              : `您好，已收到您的来信。我们将按约定流程推进，谢谢！`
          };
        }
        return e;
      })
    );
    setNotice("AI 已依据当前偏好重新生成回复草稿。");
    setTimeout(() => setNotice(null), 2500);
  };

  // Respond 邮件：直接发送 -> 发送完该邮件立即消失！
  const handleDirectSend = (email: SampleEmail) => {
    // 邮件发送完这条就应该消失
    setEmails((prev) => prev.filter((e) => e.id !== email.id));
    setNotice(`UID ${email.uid} 已成功发送至固定测试收件人 2942397812@qq.com，本邮件已从未读列表移除。`);
    try {
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
    } catch (_) {}
    setTimeout(() => setNotice(null), 4000);
  };

  // Respond 邮件：批准并发送修改版 -> 发送完该邮件立即消失，并提炼偏好
  const handleSendModified = (email: SampleEmail, modifiedText: string) => {
    if (!modifiedText.trim()) {
      handleDirectSend(email);
      return;
    }

    // 参考原有项目 memory.py：propose_preference 产生一条偏好候选并沉淀进记忆
    const newRule: PreferenceRule = {
      id: `PREF-RESP-0${rules.length + 1}`,
      kind: 'response',
      title: '人工编辑审核沉淀规则',
      ruleText: `在回复此类邮件时，采纳用户最新风格约束：${modifiedText.slice(0, 40)}...`,
      source: 'data/preferences/response_preferences.md'
    };

    setRules((prev) => [newRule, ...prev]);
    // 邮件发送完这条就应该消失
    setEmails((prev) => prev.filter((e) => e.id !== email.id));
    setEditingEmailId(null);
    setNotice(`UID ${email.uid} 已发送修改版正文，并已将改写偏好写入 response_preferences.md。`);
    try {
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    } catch (_) {}
    setTimeout(() => setNotice(null), 4000);
  };

  // 饱和度与高亮计算
  const isLit = (nodeId: string) => activeNode === nodeId || completedNodes.includes(nodeId);
  const isActive = (nodeId: string) => activeNode === nodeId;

  return (
    <div className="space-y-5">
      {/* 状态通知条 */}
      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-700 hover:text-emerald-900 text-xs">
            关闭
          </button>
        </div>
      )}

      {/* 1. 顶部 LangGraph 流程图 (从左到右，重点呈现 Respond Agent 内部节点与边，饱和度驱动) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            <h2 className="text-sm font-bold text-slate-900">
              LangGraph 状态机与 Respond Agent 内部执行走向 (从左到右实时点亮)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {selectedEmail && (
              <span className="text-xs text-slate-500 font-mono">
                当前分类: <strong className="text-blue-600 uppercase font-semibold">{selectedEmail.expectedCategory}</strong>
              </span>
            )}
            <button
              onClick={() => selectedEmail && runWorkflowAnimation(selectedEmail)}
              disabled={isRunning || !selectedEmail}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isRunning ? '流转中...' : '重新点亮'}</span>
            </button>
          </div>
        </div>

        {/* 简洁横向流程图画布 */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[900px] flex items-center gap-2.5 py-2 text-xs font-medium select-none">
            {/* 节点 1: fetch_mail */}
            <div
              className={`px-3 py-2 rounded-lg border-2 transition-all duration-300 text-center shrink-0 ${
                isActive('fetch')
                  ? 'border-blue-600 bg-blue-100 text-blue-950 shadow-xs ring-2 ring-blue-400 font-bold'
                  : isLit('fetch')
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              <div>📥 邮箱收取</div>
              <div className="text-[10px] opacity-75 font-mono">fetch_mail</div>
            </div>

            {/* 边 */}
            <div className={`h-0.5 w-6 transition-colors duration-300 ${isLit('triage_router') ? 'bg-blue-600' : 'bg-slate-200'}`} />

            {/* 节点 2: triage_router */}
            <div
              className={`px-3 py-2 rounded-lg border-2 transition-all duration-300 text-center shrink-0 ${
                isActive('triage_router')
                  ? 'border-indigo-600 bg-indigo-100 text-indigo-950 shadow-xs ring-2 ring-indigo-400 font-bold'
                  : isLit('triage_router')
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              <div>🏷️ triage_router</div>
              <div className="text-[10px] opacity-75 font-mono">三分类路由</div>
            </div>

            {/* 三路分流分支 */}
            <div className="flex flex-col gap-2 pl-2">
              {/* 分支 1: ignore */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${
                  isLit('mark_as_read_ignore') ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  ignore
                </span>
                <div className={`h-0.5 w-4 transition-colors ${isLit('mark_as_read_ignore') ? 'bg-slate-700' : 'bg-slate-200'}`} />
                <div
                  className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] transition-all duration-300 shrink-0 ${
                    isActive('mark_as_read_ignore')
                      ? 'border-slate-800 bg-slate-200 text-slate-950 shadow-xs font-bold'
                      : isLit('mark_as_read_ignore')
                      ? 'border-slate-600 bg-slate-100 text-slate-800'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  📭 mark_as_read_node &rarr; END
                </div>
              </div>

              {/* 分支 2: notify */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${
                  isLit('triage_interrupt') ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  notify
                </span>
                <div className={`h-0.5 w-4 transition-colors ${isLit('triage_interrupt') ? 'bg-amber-500' : 'bg-slate-200'}`} />
                <div
                  className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] transition-all duration-300 shrink-0 ${
                    isActive('triage_interrupt')
                      ? 'border-amber-600 bg-amber-100 text-amber-950 shadow-xs font-bold'
                      : isLit('triage_interrupt')
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  🔔 triage_interrupt_handler (等待人工知悉 / 转为回复)
                </div>
              </div>

              {/* 分支 3: respond -> 内部展开 Respond Agent 子图 */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${
                  isLit('respond_agent_subgraph') ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  respond
                </span>
                <div className={`h-0.5 w-4 transition-colors ${isLit('respond_agent_subgraph') ? 'bg-emerald-500' : 'bg-slate-200'}`} />

                {/* Respond Agent 子图容器 */}
                <div className={`border-2 rounded-xl p-2 flex items-center gap-2 transition-all duration-300 ${
                  isLit('respond_agent_subgraph')
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 bg-slate-50/40'
                }`}>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase px-1">
                    Respond Agent:
                  </span>

                  {/* 子节点 1: llm_call */}
                  <div
                    className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] transition-all duration-300 ${
                      isActive('llm_call')
                        ? 'border-emerald-600 bg-emerald-200 text-emerald-950 shadow-xs font-bold'
                        : isLit('llm_call')
                        ? 'border-emerald-500 bg-white text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    🤖 llm_call
                  </div>

                  <span className={`text-xs ${isLit('interrupt_handler') ? 'text-emerald-600 font-bold' : 'text-slate-300'}`}>&rarr;</span>

                  {/* 子节点 2: interrupt_handler */}
                  <div
                    className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] transition-all duration-300 ${
                      isActive('interrupt_handler')
                        ? 'border-indigo-600 bg-indigo-200 text-indigo-950 shadow-xs font-bold'
                        : isLit('interrupt_handler')
                        ? 'border-indigo-500 bg-white text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    🛑 interrupt_handler (HITL)
                  </div>

                  <span className={`text-xs ${isLit('send_email_tool') ? 'text-emerald-600 font-bold' : 'text-slate-300'}`}>&rarr;</span>

                  {/* 子节点 3: send_email_tool */}
                  <div
                    className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] transition-all duration-300 ${
                      isActive('send_email_tool')
                        ? 'border-emerald-600 bg-emerald-200 text-emerald-950 shadow-xs font-bold'
                        : isLit('send_email_tool')
                        ? 'border-emerald-500 bg-white text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    📤 send_email_tool
                  </div>

                  <span className={`text-xs ${isLit('mark_as_read_node') ? 'text-emerald-600 font-bold' : 'text-slate-300'}`}>&rarr;</span>

                  {/* 结束节点: mark_as_read_node */}
                  <div
                    className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] transition-all duration-300 ${
                      isActive('mark_as_read_node')
                        ? 'border-emerald-700 bg-emerald-300 text-emerald-950 shadow-xs font-bold'
                        : isLit('mark_as_read_node')
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    📭 mark_as_read &rarr; END
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 下方交互页面：收件箱邮件一排一排呈现 + 右侧悬浮规则记忆边栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 左侧 8 列：邮件列表与内嵌审核 */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            {/* 顶栏：显示读取到未读邮件数，无色块纯净设计 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  收件箱未读邮件列表
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600">
                  QQ 邮箱 (2942397812@qq.com): <strong>{qqUnreadCount}</strong> 封未读 | Google 邮箱 (zheyang3858@gmail.com): <strong>{gmailUnreadCount}</strong> 封未读
                </span>
                {emails.length < REAL_EMAILS.length && (
                  <button
                    onClick={handleResetEmails}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>恢复列表</span>
                  </button>
                )}
              </div>
            </div>

            {/* 邮箱列表：一排一排呈现 */}
            {emails.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <div className="text-sm font-medium">所有邮件已处理完毕并移出未读收件箱！</div>
                <button
                  onClick={handleResetEmails}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  重新加载邮件列表
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {emails.map((email) => {
                  const isSelected = selectedEmailId === email.id;
                  const isEditing = editingEmailId === email.id;
                  const currentEditDraft = editedDrafts[email.id] ?? '';

                  return (
                    <div
                      key={email.id}
                      onClick={() => handleSelectEmail(email)}
                      className={`rounded-xl border transition-all ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50/20 ring-1 ring-blue-300 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* 邮件行卡片头部 */}
                      <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">
                              {email.mailbox === 'qq' ? 'QQ 邮箱' : 'Google 邮箱'}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-xs text-slate-500 font-mono truncate">
                              {email.sender}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              UID: {email.uid}
                            </span>
                          </div>
                          <div className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                            {email.subject}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1 font-sans">
                            {email.content}
                          </div>
                        </div>

                        {/* 状态徽标 */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                            email.expectedCategory === 'respond'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : email.expectedCategory === 'notify'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {email.expectedCategory.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* 展开的交互处理区 */}
                      {isSelected && (
                        <div className="p-3.5 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs">
                          {/* 邮件完整正文 */}
                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700 font-sans leading-relaxed">
                            <div className="text-[11px] text-slate-400 mb-1 font-mono">邮件原文：</div>
                            {email.content}
                          </div>

                          {/* 1. NOTIFY 分支：按照原有项目，直接给出 [转为回复 (Respond)] 与 [忽略 (Ignore)] */}
                          {email.expectedCategory === 'notify' && (
                            <div className="p-3 rounded-lg bg-amber-50/90 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                                  <span>🔔 系统分类为重要通知 (Notify)</span>
                                </div>
                                <div className="text-amber-800 text-[11px]">
                                  本邮件属于重要提醒事项，当前未起草回复。您可以选择确认知悉并标记已读，或将其转入回复流程。
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotifyToRespond(email.id);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs transition-colors"
                                >
                                  转为回复 (Respond)
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotifyIgnore(email.id);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium text-xs transition-colors"
                                >
                                  已知悉 / 忽略 (Ignore)
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 2. IGNORE 分支 */}
                          {email.expectedCategory === 'ignore' && (
                            <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-between">
                              <span>🚫 营销广告已归类为 Ignore 并自动标记已读。</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotifyToRespond(email.id);
                                  }}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  重新归类为 Respond
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEmails((prev) => prev.filter((item) => item.id !== email.id));
                                  }}
                                  className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px]"
                                >
                                  移出列表
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 3. RESPOND 分支：直接在下方放出 AI 的草稿和按钮让用户确认是重新生成、修改还是可以直接发送 */}
                          {email.expectedCategory === 'respond' && (
                            <div className="space-y-3">
                              {/* 如果有问询要求 */}
                              {email.questionPrompt && (
                                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs">
                                  <strong>{email.questionPrompt}</strong>
                                  <div className="text-[11px] text-purple-700 mt-0.5">
                                    助手遵守偏好规则：遇到排期邀约绝不臆造时间，先向用户确认后再起草。
                                  </div>
                                </div>
                              )}

                              {/* AI 建议草稿与操作栏 */}
                              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                    AI 生成草稿:
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRegenerateDraft(email.id);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition-colors"
                                    >
                                      <RefreshCw className="w-3 h-3 text-slate-500" />
                                      <span>重新生成</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingEmailId(isEditing ? null : email.id);
                                      }}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                                        isEditing
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                      }`}
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>{isEditing ? '收起修改' : '修改草稿'}</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDirectSend(email);
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shadow-2xs transition-colors"
                                    >
                                      <Send className="w-3 h-3" />
                                      <span>直接发送</span>
                                    </button>
                                  </div>
                                </div>

                                {/* AI 草稿正文 */}
                                <div className="p-2.5 bg-slate-50 rounded border border-slate-100 text-slate-800 font-sans whitespace-pre-wrap leading-relaxed">
                                  {email.defaultAiDraft}
                                </div>
                              </div>

                              {/* 按照要求：修改界面，人工修改版本那里是空的，没有黑色大矩形，没有多余的框，也不显示增减几行 */}
                              {isEditing && (
                                <div className="p-3 bg-white rounded-lg border border-blue-200 space-y-3">
                                  <div className="font-semibold text-slate-800 text-xs">
                                    人工修改回复正文（留空则默认采纳上方 AI 草稿）：
                                  </div>
                                  <textarea
                                    value={currentEditDraft}
                                    onChange={(e) =>
                                      setEditedDrafts((prev) => ({ ...prev, [email.id]: e.target.value }))
                                    }
                                    className="w-full h-28 p-2.5 text-xs font-sans bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                                    placeholder="输入您希望人工修改或替换的最终正文（例如：补充具体提交时间、精简问候语、补充项目链接）..."
                                  />

                                  <div className="flex items-center justify-between pt-1">
                                    <span className="text-[11px] text-slate-500">
                                      提示：发送后邮件将从列表消失，修改习惯将自动提炼为通用偏好存入规则库。
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendModified(email, currentEditDraft);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                                    >
                                      批准并发送修改版
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 右侧 4 列：用户偏好记忆规则库 (Rule Memory) 悬浮边栏 */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs sticky top-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  用户偏好记忆规则库
                </h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {rules.length} 条已生效
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              严格同步自 <code>YangZ182/email-agent</code> 仓库中的 <code>data/preferences/*.md</code> 文件，指导大模型的分流决策与草稿措辞。
            </p>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white transition-all text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[11px] text-slate-700">
                      {rule.id}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      rule.kind === 'triage' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {rule.kind.toUpperCase()}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-800 text-xs">
                    {rule.title}
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {rule.ruleText}
                  </p>

                  <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                    来源: {rule.source}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
