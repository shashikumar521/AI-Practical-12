import React, { useState } from 'react';
import {
  Check,
  Copy,
  Cpu,
  Database,
  GitBranch,
  Layers,
  Scale,
  Sliders,
  Sparkles,
} from 'lucide-react';
import type { StatsResponse } from '../types';

interface DecisionArchitectureProps {
  stats: StatsResponse | null;
  onUpdateConfig: (k: number, epsilon: number) => Promise<void>;
}

const PIPELINE_STEPS = [
  {
    id: '01',
    title: 'Prompt Ingestion',
    subtitle: 'POST /ask',
    summary:
      'React sends the user question and optional sampling bias mode to Flask. Request size and empty-prompt validation run immediately.',
    vectorNote: 'Input sanitized (max 4,000 chars) · No external DB lookup.',
  },
  {
    id: '02',
    title: 'Decision Engine',
    subtitle: 'Explore vs Exploit',
    summary:
      'DecisionEngine checks whether to explore under-sampled styles (ε-greedy) or exploit top KNN-ranked styles while enforcing Euclidean style diversity (Δ ≥ 1.05).',
    vectorNote: 'Avoids near-identical pairs like Technical vs Professional back-to-back unless forced.',
  },
  {
    id: '03',
    title: 'Dual Generation',
    subtitle: 'OpenAI Structured JSON',
    summary:
      'ai_service.py sends both style instructions to OpenAI Chat Completions and enforces structured JSON output {"answer_a", "answer_b"} so content genuinely differs.',
    vectorNote: 'API key stays strictly in Python backend environment variables.',
  },
  {
    id: '04',
    title: 'Human Choice',
    subtitle: 'POST /choose',
    summary:
      'The user compares Answer A and Answer B side-by-side and selects their preferred formulation. Duplicate selections for the same request_id are blocked (409).',
    vectorNote: 'Selected style receives label y = +1; rejected style receives y = 0.',
  },
  {
    id: '05',
    title: '8D Feature Vectoring',
    subtitle: 'NumPy Style Matrix',
    summary:
      'Each of the 8 styles maps to a unique 8-dimensional vector across [Simple, Detailed, Technical, Examples, Step-by-Step, Professional, Beginner-Friendly, Short].',
    vectorNote: 'Unique continuous weights avoid duplicate feature vectors.',
  },
  {
    id: '06',
    title: 'KNN Refit',
    subtitle: 'Scikit-Learn KNeighbors',
    summary:
      'PreferenceModel appends both vectors to RAM and refits KNeighborsClassifier(weights="distance", metric="euclidean") whenever ≥ 2 samples with both classes exist.',
    vectorNote: 'Blends KNN predict_proba (70%) with Laplace-smoothed pairwise ranking (30%).',
  },
  {
    id: '07',
    title: 'Next Turn Adaptation',
    subtitle: 'Closed-Loop Convergence',
    summary:
      'Updated preference probabilities immediately steer the next /ask decision so future answers converge toward the user’s preferred communication style.',
    vectorNote: 'Ephemeral session memory clears instantly on /reset or Flask restart.',
  },
];

const PYTHON_SNIPPET = `import numpy as np
from sklearn.neighbors import KNeighborsClassifier

FEATURE_NAMES = [
    "Simple", "Detailed", "Technical", "Examples",
    "Step-by-step", "Professional", "Beginner-friendly", "Short"
]

class PreferenceModel:
    def __init__(self, n_neighbors=3):
        self.n_neighbors = n_neighbors
        self.X_samples = []  # 8D stylistic feature vectors
        self.y_labels = []   # 1 = selected style, 0 = rejected style
        self._knn = None

    def record_comparison(self, chosen_vec, rejected_vec):
        self.X_samples.extend([chosen_vec, rejected_vec])
        self.y_labels.extend([1, 0])
        if len(self.X_samples) >= 2 and len(set(self.y_labels)) == 2:
            k = min(self.n_neighbors, len(self.X_samples))
            self._knn = KNeighborsClassifier(
                n_neighbors=k, weights="distance", metric="euclidean"
            )
            self._knn.fit(np.asarray(self.X_samples), np.asarray(self.y_labels))`;

export const DecisionArchitecture: React.FC<DecisionArchitectureProps> = ({
  stats,
  onUpdateConfig,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [kValue, setKValue] = useState<number>(stats?.n_neighbors ?? 3);
  const [epsilonValue, setEpsilonValue] = useState<number>(stats?.exploration_rate ?? 0.3);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  const step = PIPELINE_STEPS[activeStep];
  const latestComparison = stats?.recent_comparisons?.[0];

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(PYTHON_SNIPPET);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleApplyParams = async () => {
    setSavingConfig(true);
    setConfigSaved(false);
    try {
      await onUpdateConfig(kValue, epsilonValue);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2000);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7">
      {/* Hero Banner matching Stitch Decision ML Architecture page */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] dark:text-[#4cd7f6]">
            Non-Parametric Active Learning Engine · ε-Greedy Policy
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-4xl tracking-tight text-slate-900 dark:text-[#F8FAFC] text-balance">
            How Preference Learning &amp; KNN Decision Logic Works
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8] leading-relaxed">
            A closed-loop feedback pipeline powered by Scikit-learn K-Nearest Neighbors instance clustering and diversity-constrained exploration/exploitation—running entirely in Flask RAM.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#171b26] px-3.5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Metric Space
            </div>
            <div className="font-mono font-semibold text-sm text-[#2563EB] dark:text-[#4cd7f6] mt-1">
              Euclidean 8D
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#171b26] px-3.5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Bandit Policy
            </div>
            <div className="font-mono font-semibold text-sm tabular-nums text-slate-900 dark:text-[#d0bcff] mt-1">
              ε = {(stats?.exploration_rate ?? epsilonValue).toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#171b26] px-3.5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Model State
            </div>
            <div className="font-mono font-semibold text-sm text-slate-900 dark:text-[#adc6ff] capitalize mt-1">
              {stats?.model_status ?? 'untrained'}
            </div>
          </div>
        </div>
      </section>

      {/* 7-Step Interactive Pipeline Flow */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Deterministic Workflow
            </div>
            <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-[#F8FAFC]">
              Visual 7-Step Interactive Pipeline Flow
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Click any step node to inspect logic
          </span>
        </div>

        {/* Step Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {PIPELINE_STEPS.map((item, idx) => {
            const isSelected = idx === activeStep;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`text-left rounded-xl border p-3 transition-all ${
                  isSelected
                    ? 'border-[#3B82F6] bg-blue-50 dark:bg-[#1E293B] shadow-[0_0_18px_-4px_rgba(59,130,246,0.3)]'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#171b26]/70 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="text-[11px] font-mono font-bold text-[#2563EB] dark:text-[#4cd7f6]">
                  {item.id}
                </div>
                <div className="font-display font-semibold text-xs text-slate-900 dark:text-[#F8FAFC] mt-1">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {item.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Inspector + Live Dispatch Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171b26] p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[#2563EB] dark:text-[#4cd7f6]">
              <span>STAGE {step.id}</span>
              <span>·</span>
              <span>{step.subtitle}</span>
            </div>
            <h4 className="font-display font-semibold text-lg text-slate-900 dark:text-[#F8FAFC]">
              {step.title}
            </h4>
            <p className="text-sm text-slate-600 dark:text-[#c2c6d6] leading-relaxed">
              {step.summary}
            </p>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0e18] px-3.5 py-2.5 text-xs font-mono text-slate-700 dark:text-[#adc6ff]">
              {step.vectorNote}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0e18] p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase">
              <span>Latest Style Dispatch</span>
              <GitBranch className="w-3.5 h-3.5 text-[#3B82F6]" />
            </div>

            {latestComparison ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#171b26] p-3 text-xs text-slate-700 dark:text-slate-200 truncate">
                  Prompt: {latestComparison.question}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    className={`rounded-lg border p-2.5 text-xs ${
                      latestComparison.selected === 'A'
                        ? 'border-emerald-500/60 bg-emerald-50/70 dark:bg-emerald-950/25'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#171b26]'
                    }`}
                  >
                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      Style A {latestComparison.selected === 'A' ? '· Preferred' : ''}
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {latestComparison.style_a}
                    </div>
                  </div>
                  <div
                    className={`rounded-lg border p-2.5 text-xs ${
                      latestComparison.selected === 'B'
                        ? 'border-emerald-500/60 bg-emerald-50/70 dark:bg-emerald-950/25'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#171b26]'
                    }`}
                  >
                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      Style B {latestComparison.selected === 'B' ? '· Preferred' : ''}
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {latestComparison.style_b}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-800 p-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                Submit a question in Chat Interface and pick A or B to inspect live dispatched style pairs here.
              </div>
            )}

            <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
              8 distinct stylistic centroids in [0, 1]^8 feature space
            </div>
          </div>
        </div>
      </section>

      {/* 3 Strategy Cards matching Stitch */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-[#8B5CF6]/15 border border-violet-200 dark:border-[#8B5CF6]/35 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#8B5CF6] dark:text-[#d0bcff]" />
            </div>
            <span className="text-xs font-mono text-[#8B5CF6] dark:text-[#d0bcff]">
              ε = {(stats?.exploration_rate ?? epsilonValue).toFixed(2)} Sampling
            </span>
          </div>
          <h3 className="font-display font-semibold text-base text-slate-900 dark:text-[#F8FAFC]">
            Exploration Strategy
          </h3>
          <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
            Prevents premature lock-in by rotating under-sampled styles into comparisons while enforcing a minimum Euclidean distance (Δ ≥ 1.05) between Style A and Style B.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-[#3B82F6]/15 border border-blue-200 dark:border-[#3B82F6]/35 flex items-center justify-center">
              <Scale className="w-4 h-4 text-[#3B82F6] dark:text-[#adc6ff]" />
            </div>
            <span className="text-xs font-mono text-[#2563EB] dark:text-[#adc6ff]">
              (1 - ε) Exploitation
            </span>
          </div>
          <h3 className="font-display font-semibold text-base text-slate-900 dark:text-[#F8FAFC]">
            Exploitation Strategy
          </h3>
          <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
            Serves high-scoring style neighborhoods predicted by Scikit-learn KNeighborsClassifier probability estimates blended with pairwise head-to-head ranking feedback.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-[#06B6D4]/15 border border-cyan-200 dark:border-[#06B6D4]/35 flex items-center justify-center">
              <Database className="w-4 h-4 text-[#0891B2] dark:text-[#4cd7f6]" />
            </div>
            <span className="text-xs font-mono text-[#0891B2] dark:text-[#4cd7f6]">
              Zero Database
            </span>
          </div>
          <h3 className="font-display font-semibold text-base text-slate-900 dark:text-[#F8FAFC]">
            In-Memory Volatile State
          </h3>
          <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
            No SQL, MongoDB, or Firebase is used. All training vectors live inside Python RAM for this single-user prototype and vanish when Flask restarts or Reset is pressed.
          </p>
        </div>
      </section>

      {/* Python Flask & Scikit-Learn Implementation Snippet */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-[#0a0e18] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-[#4cd7f6]" />
            <span>backend/modules/preference_model.py</span>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyCode()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 transition-colors"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCode ? 'Copied' : 'Copy Code'}
          </button>
        </div>
        <pre className="p-4 sm:p-5 overflow-x-auto text-xs leading-relaxed font-mono text-slate-200">
          <code>{PYTHON_SNIPPET}</code>
        </pre>
      </section>

      {/* Live Backend Parameter Controls */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#2563EB] dark:text-[#4cd7f6]">
              Live Backend Tuning
            </div>
            <h3 className="font-display font-semibold text-base sm:text-lg text-slate-900 dark:text-[#F8FAFC]">
              Decision &amp; KNN Parameter Controls
            </h3>
          </div>
          <button
            type="button"
            disabled={savingConfig}
            onClick={() => void handleApplyParams()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white hover:shadow-[0_0_16px_rgba(59,130,246,0.35)] disabled:opacity-50"
          >
            {configSaved ? <Check className="w-3.5 h-3.5" /> : <Sliders className="w-3.5 h-3.5" />}
            {configSaved ? 'Saved to Flask' : savingConfig ? 'Applying...' : 'Apply to Flask Engine'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171b26] p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#3B82F6]" />
                Neighbors (k)
              </span>
              <span className="font-mono font-bold tabular-nums text-[#2563EB] dark:text-[#4cd7f6]">
                k = {kValue}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={7}
              step={1}
              value={kValue}
              onChange={(e) => setKValue(Number(e.target.value))}
              className="w-full accent-[#3B82F6] cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Controls neighborhood smoothing for <code className="font-mono">KNeighborsClassifier</code> (automatically clamped when sample count &lt; k).
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171b26] p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
                Exploration Rate (ε)
              </span>
              <span className="font-mono font-bold tabular-nums text-[#8B5CF6] dark:text-[#d0bcff]">
                ε = {epsilonValue.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={epsilonValue}
              onChange={(e) => setEpsilonValue(Number(e.target.value))}
              className="w-full accent-[#8B5CF6] cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Probability of probing under-explored answer styles instead of exploiting the highest-ranked KNN style.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
