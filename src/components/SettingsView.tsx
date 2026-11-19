import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Moon,
  RefreshCw,
  RotateCcw,
  Server,
  Sun,
  Trash2,
} from 'lucide-react';
import { resolveApiBaseUrl } from '../services/api';
import type { HealthResponse, StatsResponse, ThemeMode } from '../types';

interface SettingsViewProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  health: HealthResponse | null;
  backendOnline: boolean;
  stats: StatsResponse | null;
  onRefreshHealth: () => Promise<void>;
  onResetPreferences: () => Promise<void>;
  onClearChatHistory: () => void;
  isResetting: boolean;
  actionMessage: string | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onToggleTheme,
  health,
  backendOnline,
  stats,
  onRefreshHealth,
  onResetPreferences,
  onClearChatHistory,
  isResetting,
  actionMessage,
}) => {
  const activeBaseUrl = resolveApiBaseUrl();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] dark:text-[#4cd7f6]">
          Configuration &amp; System Diagnostics
        </div>
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-[#F8FAFC] mt-1">
          Settings &amp; API Config
        </h2>
        <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
          Manage theme, session memory, backend connection health, and project architecture details.
        </p>
      </div>

      {actionMessage && (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Backend & OpenAI API Health Card */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-[#3B82F6] dark:text-[#4cd7f6]" />
            <h3 className="font-display font-semibold text-base text-slate-900 dark:text-[#F8FAFC]">
              Flask Backend &amp; OpenAI API Status
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void onRefreshHealth()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#3B82F6] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check Connection
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171b26] p-3.5 space-y-1">
            <div className="text-slate-500 dark:text-slate-400">Flask Server Status</div>
            <div className="font-semibold flex items-center gap-2 text-slate-900 dark:text-[#F8FAFC]">
              <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {backendOnline ? 'Connected & Healthy' : 'Offline / Unreachable'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171b26] p-3.5 space-y-1">
            <div className="text-slate-500 dark:text-slate-400">OpenAI API Key (Backend Env)</div>
            <div className="font-semibold flex items-center gap-2 text-slate-900 dark:text-[#F8FAFC]">
              {health?.api_key_configured ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Configured ({health.model})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Missing OPENAI_API_KEY</span>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171b26] p-3.5 space-y-1">
            <div className="text-slate-500 dark:text-slate-400">Configured Frontend API Target</div>
            <div className="font-mono text-slate-800 dark:text-[#adc6ff] truncate">
              {activeBaseUrl} (VITE_API_URL: {import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'})
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171b26] p-3.5 space-y-1">
            <div className="text-slate-500 dark:text-slate-400">In-Memory Learned Samples</div>
            <div className="font-mono font-bold tabular-nums text-slate-900 dark:text-[#4cd7f6]">
              {stats?.learned_samples ?? 0} samples ({stats?.comparisons ?? 0} comparisons)
            </div>
          </div>
        </div>

        {!health?.api_key_configured && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/25 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
            <div className="font-semibold">How to configure your OpenAI API key securely:</div>
            <p>
              1. Copy <code className="font-mono px-1 rounded bg-amber-100 dark:bg-amber-900/50">backend/.env.example</code> to{' '}
              <code className="font-mono px-1 rounded bg-amber-100 dark:bg-amber-900/50">backend/.env</code> (or set environment variables in your host).
            </p>
            <p>
              2. Set <code className="font-mono px-1 rounded bg-amber-100 dark:bg-amber-900/50">OPENAI_API_KEY=sk-...</code> and optionally{' '}
              <code className="font-mono px-1 rounded bg-amber-100 dark:bg-amber-900/50">OPENAI_MODEL=gpt-4o-mini</code>. The key stays strictly on the Python server and is never exposed in React.
            </p>
          </div>
        )}
      </section>

      {/* Appearance & Session Controls */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 sm:p-6 space-y-4">
        <h3 className="font-display font-semibold text-base text-slate-900 dark:text-[#F8FAFC]">
          Appearance &amp; Temporary Memory Controls
        </h3>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC]">
                Interface Theme
              </div>
              <div className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Switch between nocturnal Dark Mode (Stitch default) and crisp Light Mode.
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#171b26] text-xs font-medium text-slate-800 dark:text-slate-100 hover:border-[#3B82F6] transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>

          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC]">
                Reset Learned Preferences
              </div>
              <div className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Calls <code className="font-mono">POST /reset</code> to clear all KNN preference samples and comparison history from Flask RAM.
              </div>
            </div>
            <button
              type="button"
              disabled={isResetting}
              onClick={() => void onResetPreferences()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-50 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Preferences
            </button>
          </div>

          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC]">
                Clear Temporary Chat History
              </div>
              <div className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Clears conversation cards stored in current React session memory without affecting backend stats.
              </div>
            </div>
            <button
              type="button"
              onClick={onClearChatHistory}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#171b26] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#3B82F6] transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Chat History
            </button>
          </div>
        </div>
      </section>

      {/* About & No-Database Explanation */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Database className="w-5 h-5 text-[#8B5CF6] dark:text-[#d0bcff]" />
          <h3 className="font-display font-semibold text-base text-slate-900 dark:text-[#F8FAFC]">
            About PreferenceAI &amp; No-Database Architecture
          </h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
          <strong>PreferenceAI</strong> — <em>&ldquo;Two answers. Your choice. Smarter conversations.&rdquo;</em> — is a B.Tech Artificial Intelligence &amp; Machine Learning project demonstrating human-in-the-loop preference learning using Scikit-learn K-Nearest Neighbors (KNN), NumPy feature vectors, epsilon-greedy exploration/exploitation, and OpenAI dual-style generation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-[#94A3B8]">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171b26] p-3.5 space-y-1">
            <div className="font-semibold text-slate-900 dark:text-[#F8FAFC]">
              Why preferences reset on restart
            </div>
            <p>
              No SQL, MongoDB, or Firebase database is connected. All preference vectors live strictly in temporary Python RAM and vanish when Flask stops.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171b26] p-3.5 space-y-1">
            <div className="font-semibold text-slate-900 dark:text-[#F8FAFC]">
              Single-user learning prototype
            </div>
            <p>
              This prototype maintains one shared in-memory preference state. Supporting multiple concurrent users would require isolated per-user session memory.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
