import React, { useState } from 'react';
import { Header } from './components/Header';
import { AgentWorkspaceTab } from './components/AgentWorkspaceTab';
import { EvaluationTab } from './components/EvaluationTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('workspace');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {activeTab === 'workspace' && (
          <AgentWorkspaceTab />
        )}

        {activeTab === 'eval' && (
          <EvaluationTab />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            AutoMail Agent · 基于 LangGraph 的双邮箱 (QQ/Gmail) 意图路由与人机协同助手
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/YangZ182/email-agent"
              target="_blank"
              rel="noreferrer"
              className="text-slate-600 hover:text-blue-600 font-medium transition-colors"
            >
              GitHub 仓库: YangZ182/email-agent
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
