import React from 'react';
import {
  BarChart3,
  Cpu,
  GitBranch,
  History,
  MessageSquare,
  Moon,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type { ChatSession, NavView, ThemeMode } from '../types';

interface SidebarProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onResetPreferences: () => void;
  onResetSession: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isResetting: boolean;
}

const NAV_ITEMS: { id: NavView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'chat', label: 'Chat Interface', icon: MessageSquare },
  { id: 'analytics', label: 'KNN Preference Analytics', icon: BarChart3 },
  { id: 'architecture', label: 'Decision ML Architecture', icon: GitBranch },
  { id: 'settings', label: 'Settings & API Config', icon: SlidersHorizontal },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onResetPreferences,
  onResetSession,
  theme,
  onToggleTheme,
  mobileOpen,
  onCloseMobile,
  isResetting,
}) => {
  const sidebarBody = (
    <aside className="flex flex-col h-full w-[268px] bg-white dark:bg-[#111827]/95 border-r border-slate-200 dark:border-slate-800/80 select-none">
      {/* Brand Lockup */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800/70">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center shadow-[0_0_16px_rgba(59,130,246,0.3)] shrink-0">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-[15px] tracking-tight text-slate-900 dark:text-[#F8FAFC] truncate">
              PreferenceAI
            </div>
            <div className="text-[10px] font-semibold tracking-wider text-[#3B82F6] dark:text-[#4cd7f6] uppercase truncate">
              IN-MEMORY KNN ENGINE
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onSelectView('chat');
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-[#1E293B]/80 dark:hover:bg-[#1E293B] border border-blue-200 dark:border-[#3B82F6]/30 text-blue-700 dark:text-[#adc6ff] text-sm font-medium transition-all"
        >
          <span className="flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4 shrink-0" />
            New Chat
          </span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-100/80 dark:bg-[#0f131d] text-blue-600 dark:text-slate-400">
            Ctrl+K
          </span>
        </button>
      </div>

      {/* System Navigation */}
      <div className="px-3 pt-1 pb-3">
        <div className="px-2 pb-2 text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
          System Navigation
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white shadow-[0_0_20px_rgba(59,130,246,0.28)]'
                    : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#1E293B]/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Session History (Frontend In-Memory Only) */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-3 border-t border-slate-200/80 dark:border-slate-800/70">
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
            Session History
          </span>
          <History className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="px-2 pb-2 text-[11px] text-slate-500 dark:text-slate-500">
          Temporary session memory (No DB)
        </p>

        <div className="space-y-1">
          {sessions.map((session) => {
            const isCurrent = session.id === activeSessionId;
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => {
                  onSelectSession(session.id);
                  onSelectView('chat');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-left transition-colors ${
                  isCurrent
                    ? 'bg-slate-100 dark:bg-[#1E293B]/75 text-slate-900 dark:text-[#dfe2f1] font-medium border border-slate-200 dark:border-slate-700/60'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1E293B]/40 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isCurrent ? 'bg-[#06B6D4]' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
                <span className="truncate">{session.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5 bg-slate-50/70 dark:bg-[#0a0e18]/60">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onResetPreferences}
            disabled={isResetting}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-[#1E293B]/60 text-slate-700 dark:text-slate-300 hover:border-red-300 dark:hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            Clear Prefs
          </button>
          <button
            type="button"
            onClick={onResetSession}
            disabled={isResetting}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-[#1E293B]/60 text-slate-700 dark:text-slate-300 hover:border-[#3B82F6]/50 hover:text-[#2563EB] dark:hover:text-[#adc6ff] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            Reset Session
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#1E293B]/60 transition-colors"
        >
          <span className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 text-[#adc6ff]" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            )}
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Toggle</span>
        </button>

        <div className="px-1 text-[10px] text-slate-500 dark:text-slate-500 text-center">
          B.Tech AI &amp; ML Preference Learning Prototype
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0">{sidebarBody}</div>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarBody}</div>
        </div>
      )}
    </>
  );
};
