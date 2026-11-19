import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  DatabaseZap,
  Info,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import type { StatsResponse } from '../types';

interface AnalyticsDashboardProps {
  stats: StatsResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onGoToChat: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  stats,
  loading,
  error,
  onRefresh,
  onGoToChat,
}) => {
  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/25 p-5 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display font-semibold text-sm text-rose-900 dark:text-rose-200">
                Unable to load KNN statistics
              </h2>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white shrink-0"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const comparisons = stats?.comparisons ?? 0;
  const isEmpty = comparisons === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] dark:text-[#4cd7f6]">
            Live Scikit-Learn KNeighborsClassifier Telemetry
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-[#F8FAFC] mt-1">
            Preference Learning Analytics
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
            Real-time statistics served directly from the Flask <code className="font-mono text-xs">/stats</code> endpoint.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#171b26] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#3B82F6] transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Empty State when 0 comparisons */}
      {isEmpty ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-8 sm:p-10 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-[#1E293B] border border-blue-200 dark:border-[#3B82F6]/30 flex items-center justify-center mx-auto">
            <BarChart3 className="w-6 h-6 text-[#3B82F6] dark:text-[#4cd7f6]" />
          </div>
          <div className="max-w-lg mx-auto space-y-2">
            <h3 className="font-display font-semibold text-xl text-slate-900 dark:text-[#F8FAFC]">
              No Preference Data Collected Yet
            </h3>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
              The KNN classifier is currently <strong>untrained</strong> (<code className="font-mono text-xs">0</code> comparisons). Ask a question in the Chat Interface and choose between Answer A and Answer B to start training the model.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={onGoToChat}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-all"
            >
              Start First Comparison
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 4 KPI Summary Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-4 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Comparisons</div>
              <div className="font-mono font-bold text-2xl tabular-nums text-slate-900 dark:text-[#F8FAFC]">
                {stats?.comparisons ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Head-to-head choices
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-4 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                Positive Samples (y=1)
              </div>
              <div className="font-mono font-bold text-2xl tabular-nums text-emerald-600 dark:text-emerald-400">
                {stats?.positive_samples ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Selected answer vectors
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-4 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ThumbsDown className="w-3.5 h-3.5 text-rose-500" />
                Negative Samples (y=0)
              </div>
              <div className="font-mono font-bold text-2xl tabular-nums text-rose-600 dark:text-rose-400">
                {stats?.negative_samples ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Rejected answer vectors
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-4 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6] dark:text-[#4cd7f6]" />
                KNN Model Status
              </div>
              <div className="font-display font-bold text-lg text-slate-900 dark:text-[#adc6ff] capitalize">
                {stats?.model_status === 'trained'
                  ? `Trained (k=${stats.effective_k})`
                  : stats?.model_status === 'bootstrapping'
                  ? 'Bootstrapping'
                  : 'Untrained'}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                ε = {((stats?.exploration_rate ?? 0.3) * 100).toFixed(0)}% explore
              </div>
            </div>
          </div>

          {/* Predicted Style Preference Scores Chart */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display font-semibold text-base sm:text-lg text-slate-900 dark:text-[#F8FAFC]">
                  Predicted Style Preference Scores (All 8 Styles)
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Blended probability from Scikit-learn KNN (70%) + regularized pairwise ranking (30%).
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-[#adc6ff]">
                {stats?.total_samples ?? 0} total vectors in memory
              </span>
            </div>

            <div className="space-y-3.5">
              {(stats?.knn_scores || []).map((entry, idx) => {
                const pct = Math.round(entry.preference_score * 100);
                const knnPct = Math.round(entry.knn_probability * 100);
                return (
                  <div
                    key={entry.style}
                    className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#171b26]/70 p-3.5 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded text-[11px] font-mono font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-display font-semibold text-sm text-slate-900 dark:text-[#F8FAFC]">
                          {entry.style}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{entry.selected_count} won
                        </span>
                        <span className="text-rose-600 dark:text-rose-400">
                          -{entry.rejected_count} lost
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          KNN: {knnPct}%
                        </span>
                        <span className="font-bold text-[#2563EB] dark:text-[#4cd7f6]">
                          Score: {pct}%
                        </span>
                      </div>
                    </div>

                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{entry.description}</span>
                      <span className="font-mono">
                        vec: [{entry.feature_vector.map((v) => v.toFixed(1)).join(', ')}]
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Selected vs Rejected Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 space-y-3">
              <h3 className="font-display font-semibold text-base text-slate-900 dark:text-[#F8FAFC]">
                Selected Answer Styles
              </h3>
              {Object.keys(stats?.selected_styles || {}).length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No styles selected yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats?.selected_styles || {}).map(([style, count]) => (
                    <div
                      key={style}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 text-xs"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200">{style}</span>
                      <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {count} selected
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 space-y-3">
              <h3 className="font-display font-semibold text-base text-slate-900 dark:text-[#F8FAFC]">
                Rejected Answer Styles
              </h3>
              {Object.keys(stats?.rejected_styles || {}).length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No styles rejected yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats?.rejected_styles || {}).map(([style, count]) => (
                    <div
                      key={style}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/40 text-xs"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200">{style}</span>
                      <span className="font-mono font-bold tabular-nums text-rose-700 dark:text-rose-400">
                        {count} rejected
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Recent Comparisons Table */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 space-y-3">
            <h3 className="font-display font-semibold text-base text-slate-900 dark:text-[#F8FAFC]">
              Recent Pairwise Comparisons
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 pr-4 font-semibold">Question</th>
                    <th className="py-2.5 px-3 font-semibold">Preferred Style</th>
                    <th className="py-2.5 px-3 font-semibold">Rejected Style</th>
                    <th className="py-2.5 px-3 font-semibold">Policy</th>
                    <th className="py-2.5 pl-3 text-right font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {(stats?.recent_comparisons || []).map((item) => (
                    <tr key={item.request_id} className="hover:bg-slate-50 dark:hover:bg-[#171b26]/60">
                      <td className="py-2.5 pr-4 max-w-xs truncate text-slate-800 dark:text-slate-200">
                        {item.question}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {item.selected_style}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {item.rejected_style}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#2563EB] dark:text-[#adc6ff] whitespace-nowrap">
                        {item.decision_mode}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Limitations & Volatile Memory Documentation */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/75 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-display font-semibold text-slate-900 dark:text-[#F8FAFC]">
          <Info className="w-4 h-4 text-[#3B82F6] dark:text-[#4cd7f6]" />
          Documented Limitations of Feature-Based KNN &amp; Volatile Memory
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-600 dark:text-[#94A3B8]">
          {(stats?.limitations || [
            'Context-agnostic features: Static 8D style vectors do not encode the question topic.',
            'Cold-start sensitivity: Predictions require initial user choices before KNN neighborhoods stabilize.',
            'Uniform Euclidean metric: All 8 dimensions share equal weight without learned metric scaling.',
            'Volatile in-memory state: No database is used; restarting Flask clears learned preferences.',
          ]).map((limitation, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg bg-slate-50 dark:bg-[#171b26] border border-slate-200/70 dark:border-slate-800 p-3"
            >
              <DatabaseZap className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0 mt-0.5" />
              <span>{limitation}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
