import React from 'react';
import { Menu, Moon, Settings2, Sun } from 'lucide-react';
import type { HealthResponse, NavView, StatsResponse, ThemeMode } from '../types';

interface TopBarProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  health: HealthResponse | null;
  backendOnline: boolean;
  stats: StatsResponse | null;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenMobileMenu: () => void;
}

const VIEW_TITLES: Record<NavView, string> = {
  chat: 'Dual Comparison Feed',
  analytics: 'KNN Preference Analytics',
  architecture: 'Decision ML Architecture',
  scene3d: '3D KNN Vector Space',
  settings: 'Settings & API Config',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onSelectView,
  health,
  backendOnline,
  stats,
  theme,
  onToggleTheme,
  onOpenMobileMenu,
}) => {
  const epsilon = stats?.exploration_rate ?? 0.3;
  const explorePct = Math.round(epsilon * 100);
  const exploitPct = 100 - explorePct;
  const comparisons = stats?.comparisons ?? 0;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-3 bg-white/90 dark:bg-[#0f131d]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-display font-semibold text-base sm:text-lg text-slate-900 dark:text-[#F8FAFC] truncate">
          {VIEW_TITLES[activeView]}
        </h1>
      </div>

      {/* Real backend telemetry readouts */}
      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        <div className="hidden md:flex items-center gap-4 text-xs text-slate-600 dark:text-[#94A3B8]">
          <span className="whitespace-nowrap">
            Explore/Exploit:{' '}
            <strong className="font-mono tabular-nums text-slate-900 dark:text-[#d0bcff]">
              {explorePct}/{exploitPct}
            </strong>
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            ·
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-700 dark:text-slate-300">
              {backendOnline
                ? health?.api_key_configured
                  ? 'Flask + OpenAI Ready'
                  : 'Flask Ready (API Key Missing)'
                : 'Flask Offline'}
            </span>
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            ·
          </span>
          <span className="whitespace-nowrap">
            Learned Preferences:{' '}
            <strong className="font-mono tabular-nums text-[#2563EB] dark:text-[#4cd7f6]">
              {comparisons}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171b26] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Toggle light/dark theme"
            aria-label="Toggle light/dark theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => onSelectView('settings')}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171b26] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Open Settings & API Config"
            aria-label="Open Settings & API Config"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
