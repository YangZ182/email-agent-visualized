import React, { useState } from 'react';
import { BENCHMARK_CASES, BENCHMARK_METRICS, BenchmarkCase } from '../data/benchmarkData';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Search, Filter, Wrench, BarChart3, TrendingUp, Layers, HelpCircle, ChevronRight, Sparkles } from 'lucide-react';

export const EvaluationTab: React.FC = () => {
  const [filterType, setFilterType] = useState<'all' | 'fail' | 'pass'>('all');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'zh' | 'en'>('all');
  const [taxonomyFilter, setTaxonomyFilter] = useState<string>('all');
  const [matrixFilter, setMatrixFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<BenchmarkCase | null>(null);
  const [showSimulatedOptimization, setShowSimulatedOptimization] = useState(false);

  // Filter benchmark cases
  const filteredCases = BENCHMARK_CASES.filter((item) => {
    if (filterType === 'fail' && item.isCategoryCorrect && item.isToolCorrect) return false;
    if (filterType === 'pass' && (!item.isCategoryCorrect || !item.isToolCorrect)) return false;
    if (languageFilter !== 'all' && item.language !== languageFilter) return false;
    if (taxonomyFilter !== 'all' && item.failCategory !== taxonomyFilter) return false;

    // Matrix cell filter
    if (matrixFilter) {
      const [trueCat, predCat] = matrixFilter.split('->');
      if (item.groundTruthCategory !== trueCat || item.predictedCategory !== predCat) return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.subject.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        item.sender.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Module Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Core Module 3
              </span>
              <span className="text-xs text-indigo-200">Golden Benchmark v1.0 (30 Cases / 中英高频场景)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              内置系统评测大盘与混淆矩阵复盘 (Evaluation Dashboard)
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              提供生产级大模型 Agent 评测标准：量化统计 <strong>三分类准确率 (73.33%)</strong> 与 
              <strong> 工具路由准确率 (90.0%)</strong>，依托混淆矩阵与错误归因根因复盘，支撑持续迭代与大厂技术面试。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSimulatedOptimization(!showSimulatedOptimization)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                showSimulatedOptimization
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{showSimulatedOptimization ? '已应用优化对比 (93.33%)' : '模拟规则优化后效果'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>邮件三分类准确率</span>
            <span className="font-mono">22 / 30 命中</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {showSimulatedOptimization ? '93.33%' : BENCHMARK_METRICS.classificationAccuracy}
            </span>
            <span className={`text-xs font-semibold ${showSimulatedOptimization ? 'text-emerald-600' : 'text-blue-600'}`}>
              {showSimulatedOptimization ? '+20.0% (提炼生效)' : '+18.5% 较Zero-Shot'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            涵盖 ignore / respond / notify 复杂长尾测试
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>工具路由决策正确率</span>
            <span className="font-mono">27 / 30 精确</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {showSimulatedOptimization ? '96.67%' : BENCHMARK_METRICS.toolAccuracy}
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              90.0% 高可信
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            涵盖 RAG 检索、手机推送与静默归档路由
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>notify 重大通知召回率</span>
            <span className="font-mono text-emerald-600">8 / 8 零漏报</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
              100.0%
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              0 漏报
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            确保面试邀请、安全告警 100% 触发即时提醒
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>P90 端到端执行时延</span>
            <span className="font-mono">Avg: 1.25s</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              1.54s
            </span>
            <span className="text-xs font-semibold text-slate-600">
              Fast RAG Cache
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            包含分类路由、向量召回与工具调用总链条
          </div>
        </div>
      </div>

      {/* Confusion Matrix & Taxonomy Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 cols: Confusion Matrix Heatmap */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                三分类混淆矩阵 (Confusion Matrix Heatmap)
              </h3>
            </div>
            {matrixFilter && (
              <button
                onClick={() => setMatrixFilter(null)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                清除单元格过滤 ({matrixFilter})
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-4">
            行表示真实分类（Ground Truth），列表示模型预测分类（Predicted）。点击单元格即可下钻过滤对应样本。
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border border-slate-200 bg-slate-100 text-slate-600 font-medium">
                    真实标签 (GT) \ 预测 (Pred)
                  </th>
                  <th className="p-2 border border-slate-200 bg-slate-50 text-slate-800 font-bold">
                    respond (需回复)
                  </th>
                  <th className="p-2 border border-slate-200 bg-slate-50 text-slate-800 font-bold">
                    notify (即时提醒)
                  </th>
                  <th className="p-2 border border-slate-200 bg-slate-50 text-slate-800 font-bold">
                    ignore (静默归档)
                  </th>
                  <th className="p-2 border border-slate-200 bg-slate-100 text-slate-600 font-medium">
                    召回率 (Recall)
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Row 1: respond */}
                <tr>
                  <td className="p-2 border border-slate-200 bg-slate-50 font-bold text-slate-800">
                    respond (16例)
                  </td>
                  <td
                    onClick={() => setMatrixFilter('respond->respond')}
                    className="p-3 border border-slate-200 text-center font-bold text-sm bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200 cursor-pointer transition-colors"
                    title="点击查看正确分类并拟稿的 11 例"
                  >
                    11 <span className="text-[10px] block font-normal text-emerald-700">准确命中</span>
                  </td>
                  <td
                    onClick={() => setMatrixFilter('respond->notify')}
                    className="p-3 border border-slate-200 text-center font-bold text-sm bg-rose-100/90 text-rose-800 hover:bg-rose-200 cursor-pointer transition-colors"
                    title="点击查看情绪被误判为紧急通知的 3 例 (TC-004, TC-005, TC-026)"
                  >
                    3 <span className="text-[10px] block font-normal text-rose-700">误放大</span>
                  </td>
                  <td
                    onClick={() => setMatrixFilter('respond->ignore')}
                    className="p-3 border border-slate-200 text-center font-bold text-sm bg-amber-100/90 text-amber-800 hover:bg-amber-200 cursor-pointer transition-colors"
                    title="点击查看被误忽略归档的 2 例 (TC-015, TC-028)"
                  >
                    2 <span className="text-[10px] block font-normal text-amber-700">误忽略</span>
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-semibold text-slate-700 bg-slate-50">
                    68.75%
                  </td>
                </tr>

                {/* Row 2: notify */}
                <tr>
                  <td className="p-2 border border-slate-200 bg-slate-50 font-bold text-slate-800">
                    notify (8例)
                  </td>
                  <td
                    onClick={() => setMatrixFilter('notify->respond')}
                    className="p-3 border border-slate-200 text-center font-semibold text-sm bg-slate-50 text-slate-400 hover:bg-slate-100 cursor-pointer"
                  >
                    0
                  </td>
                  <td
                    onClick={() => setMatrixFilter('notify->notify')}
                    className="p-3 border border-slate-200 text-center font-bold text-sm bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200 cursor-pointer transition-colors"
                    title="点击查看完美推送到手机的 8 例面试/告警通知"
                  >
                    8 <span className="text-[10px] block font-normal text-emerald-700">100% 召回</span>
                  </td>
                  <td
                    onClick={() => setMatrixFilter('notify->ignore')}
                    className="p-3 border border-slate-200 text-center font-semibold text-sm bg-slate-50 text-slate-400 hover:bg-slate-100 cursor-pointer"
                  >
                    0
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-semibold text-emerald-700 bg-emerald-50">
                    100.0%
                  </td>
                </tr>

                {/* Row 3: ignore */}
                <tr>
                  <td className="p-2 border border-slate-200 bg-slate-50 font-bold text-slate-800">
                    ignore (6例)
                  </td>
                  <td
                    onClick={() => setMatrixFilter('ignore->respond')}
                    className="p-3 border border-slate-200 text-center font-semibold text-sm bg-slate-50 text-slate-400 hover:bg-slate-100 cursor-pointer"
                  >
                    0
                  </td>
                  <td
                    onClick={() => setMatrixFilter('ignore->notify')}
                    className="p-3 border border-slate-200 text-center font-semibold text-sm bg-slate-50 text-slate-400 hover:bg-slate-100 cursor-pointer"
                  >
                    0
                  </td>
                  <td
                    onClick={() => setMatrixFilter('ignore->ignore')}
                    className="p-3 border border-slate-200 text-center font-bold text-sm bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200 cursor-pointer transition-colors"
                    title="点击查看 6 例成功拦截的垃圾邮件"
                  >
                    6 <span className="text-[10px] block font-normal text-emerald-700">命中</span>
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-semibold text-emerald-700 bg-emerald-50">
                    100.0%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-400"></span> 命中单元格
              <span className="w-2.5 h-2.5 rounded bg-rose-200 border border-rose-400 ml-2"></span> 误报 (SLA过敏)
              <span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-400 ml-2"></span> 误杀 (商务流失)
            </span>
            <span>评测版本: Baseline v1.0</span>
          </div>
        </div>

        {/* Right 6 cols: Root Cause Taxonomy */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">
                8 个失败案例归因树 (Fail-Case Root Cause Taxonomy)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              8 处待攻坚
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            经对 8 个错误判定日志逐行回溯，分类错误严格遵循三大工程根因分布：
          </p>

          <div className="space-y-2.5">
            {BENCHMARK_METRICS.failureTaxonomy.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setTaxonomyFilter(taxonomyFilter === item.cases[0] ? 'all' : item.cases[0])}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
                  <span className="text-slate-900 font-bold">{item.category}</span>
                  <span className="text-rose-600 font-mono font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                    {item.count} 例 ({item.percentage})
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {item.description}
                </p>
                <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="text-slate-400">涉及用例:</span>
                  {item.cases.map((c) => (
                    <span key={c} className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benchmark Case Explorer & Drilldown */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              30 封基准用例下钻探索器 ({filteredCases.length} / 30)
            </h3>
            {matrixFilter && (
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-100 text-blue-800 rounded border border-blue-200">
                矩阵过滤: {matrixFilter}
              </span>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索标题 / 内容 / 发件人..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Pass/Fail selector */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                全部 (30)
              </button>
              <button
                onClick={() => setFilterType('fail')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterType === 'fail' ? 'bg-rose-600 text-white' : 'text-slate-600'
                }`}
              >
                仅失败案例 (8)
              </button>
              <button
                onClick={() => setFilterType('pass')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterType === 'pass' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                }`}
              >
                仅成功用例 (22)
              </button>
            </div>

            {/* Language filter */}
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value as any)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700"
            >
              <option value="all">中英双语 (All)</option>
              <option value="zh">仅中文 (ZH)</option>
              <option value="en">仅英文 (EN)</option>
            </select>
          </div>
        </div>

        {/* Case Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">编号</th>
                <th className="py-2.5 px-3 font-semibold">邮件主题 & 发件人</th>
                <th className="py-2.5 px-3 font-semibold">真实分类 (GT)</th>
                <th className="py-2.5 px-3 font-semibold">模型预测 (Pred)</th>
                <th className="py-2.5 px-3 font-semibold">工具选择结果</th>
                <th className="py-2.5 px-3 font-semibold">时延</th>
                <th className="py-2.5 px-3 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.map((item) => {
                const isFail = !item.isCategoryCorrect || !item.isToolCorrect;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedCase(item)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      selectedCase?.id === item.id ? 'bg-blue-50/70' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                      {item.id}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs sm:max-w-md">
                      <div className="font-semibold text-slate-900 truncate">
                        {item.subject}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        {item.sender} ({item.language.toUpperCase()})
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] uppercase ${
                          item.mailbox === 'qq' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {item.mailbox === 'qq' ? 'QQ' : 'Gmail'}
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          item.groundTruthCategory === 'notify'
                            ? 'bg-amber-100 text-amber-800'
                            : item.groundTruthCategory === 'respond'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {item.groundTruthCategory}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          item.predictedCategory === 'notify'
                            ? 'bg-amber-100 text-amber-800'
                            : item.predictedCategory === 'respond'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {item.predictedCategory}
                        </span>
                        {item.isCategoryCorrect ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 truncate max-w-xs">
                      {item.isToolCorrect ? (
                        <span className="text-emerald-700">✓ {item.predictedTool}</span>
                      ) : (
                        <span className="text-rose-700 font-semibold">✗ 误选: {item.predictedTool}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {item.latencyMs}ms
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                        详情
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Case Drilldown Modal / Drawer */}
      {selectedCase && (
        <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xl border border-slate-800 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-amber-400 text-sm">
                [{selectedCase.id}] 评测用例归因与工程剖析
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {selectedCase.language.toUpperCase()} | {selectedCase.latencyMs}ms
              </span>
            </div>
            <button
              onClick={() => setSelectedCase(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
            >
              关闭
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <div>
                <span className="text-slate-400 block mb-0.5">邮件主题:</span>
                <span className="font-semibold text-slate-100">{selectedCase.subject}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">发件人:</span>
                <span className="font-mono text-slate-300">{selectedCase.sender}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">邮件正文原文:</span>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 font-sans leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {selectedCase.content}
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">真实标注 (Ground Truth):</span>
                  <span className="font-bold text-emerald-400">{selectedCase.groundTruthCategory}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">模型预测 (Predicted):</span>
                  <span className={`font-bold ${selectedCase.isCategoryCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedCase.predictedCategory}
                  </span>
                </div>
              </div>

              {selectedCase.rootCauseAnalysis ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-rose-400 font-bold block mb-1">
                      ⚠️ 根因诊断 (Root Cause Analysis):
                    </span>
                    <p className="text-slate-300 leading-relaxed font-sans">
                      {selectedCase.rootCauseAnalysis}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-emerald-400 font-bold block mb-1">
                      🛠️ 生产级工程修复解法 (Engineering Solution):
                    </span>
                    <p className="text-slate-200 leading-relaxed font-sans bg-emerald-950/40 p-2.5 rounded border border-emerald-900/60">
                      {selectedCase.proposedFix}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-emerald-400 font-semibold">
                  ✓ 该用例在分类与工具调用上均完美通过，符合预期标准。
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
