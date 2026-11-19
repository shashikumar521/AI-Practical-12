import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  Code2,
  Copy,
  GitBranch,
  Lightbulb,
  Loader2,
  Send,
  SlidersHorizontal,
  ThumbsUp,
  Zap,
} from 'lucide-react';
import type { BiasMode, ChatTurn, StatsResponse } from '../types';
import { SafeMarkdown } from './SafeMarkdown';

interface ChatInterfaceProps {
  turns: ChatTurn[];
  stats: StatsResponse | null;
  backendOnline: boolean;
  apiKeyConfigured: boolean;
  biasMode: BiasMode;
  onChangeBiasMode: (mode: BiasMode) => void;
  onSubmitQuestion: (question: string) => Promise<void>;
  onSelectAnswer: (turnId: string, selected: 'A' | 'B') => Promise<void>;
  onOpenSettings: () => void;
}

const STARTER_CARDS = [
  {
    kicker: 'EXPLAIN CONCEPT SIMPLY',
    title: 'What is Machine Learning and how does it learn?',
    prompt: 'What is Machine Learning and how does it actually learn from data?',
    cta: 'Compare Dual Explanations',
    icon: Lightbulb,
  },
  {
    kicker: 'PROFESSIONAL TONE',
    title: 'Executive briefing on enterprise AI adoption',
    prompt: 'Write an executive update explaining why enterprise AI adoption requires human-in-the-loop evaluation.',
    cta: 'Compare Concise vs Detailed',
    icon: Briefcase,
  },
  {
    kicker: 'ALGORITHM DEEP-DIVE',
    title: 'Dynamic Programming vs. Greedy Algorithms',
    prompt: 'Compare Dynamic Programming vs. Greedy Algorithms with clear trade-offs and an example.',
    cta: 'Compare Technical vs Examples',
    icon: Code2,
  },
  {
    kicker: 'ML IMPLEMENTATION',
    title: 'How does K-Nearest Neighbors (KNN) classify data?',
    prompt: 'Explain how a K-Nearest Neighbors (KNN) classifier predicts preferences using distance metrics.',
    cta: 'Compare Step-by-Step vs Short',
    icon: GitBranch,
  },
];

function formatWordCount(text?: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatDecisionLabel(mode?: string): string {
  switch (mode) {
    case 'initial_default':
      return 'Initial Contrast Pair';
    case 'bootstrap_explore':
      return 'Early Exploration';
    case 'exploration':
      return 'Exploration (ε-Sampling)';
    case 'exploit_hybrid':
      return 'KNN Exploit + Challenger';
    case 'exploitation':
      return 'KNN Exploitation';
    default:
      return 'Decision Engine';
  }
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  turns,
  stats,
  backendOnline,
  apiKeyConfigured,
  biasMode,
  onChangeBiasMode,
  onSubmitQuestion,
  onSelectAnswer,
  onOpenSettings,
}) => {
  const [questionInput, setQuestionInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (turns.length > 0) {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [turns.length]);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Ignore clipboard permission errors silently
    }
  };

  const handleSend = async (rawPrompt?: string) => {
    const text = (rawPrompt ?? questionInput).trim();
    if (!text) {
      setInputError('Please enter a question before submitting.');
      return;
    }
    if (isSubmitting) return;

    setInputError(null);
    if (!rawPrompt) {
      setQuestionInput('');
    }
    setIsSubmitting(true);
    try {
      await onSubmitQuestion(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const nNeighbors = stats?.n_neighbors ?? 3;
  const modelStatusText =
    stats?.model_status === 'trained'
      ? `KNN Active (k=${stats.effective_k || nNeighbors})`
      : stats?.model_status === 'bootstrapping'
      ? `Bootstrapping (${stats.comparisons}/2 pairs)`
      : 'Untrained (0 comparisons)';

  const topScores = (stats?.knn_scores || []).slice(0, 4);

  return (
    <div className="flex flex-col min-h-[calc(100vh-57px)]">
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-40 space-y-6">
        {/* Session Status Banner (matches Stitch banner) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#171b26]/90 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-[#1E293B] border border-blue-200 dark:border-[#3B82F6]/30 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-[#3B82F6] dark:text-[#4cd7f6]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                <span>In-Memory Active Session</span>
                <span className="text-[11px] font-mono font-medium text-[#2563EB] dark:text-[#4cd7f6]">
                  TRANSIENT RAM (NO DB)
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
                Preference weights &amp; KNN feature samples live only in Flask memory and reset when the server restarts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#0f131d] border border-slate-200 dark:border-slate-800 font-mono tabular-nums text-slate-700 dark:text-[#adc6ff]">
              {modelStatusText}
            </span>
          </div>
        </div>

        {/* Missing Backend / Missing API Key Warning Banner */}
        {(!backendOnline || !apiKeyConfigured) && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/25 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                {!backendOnline ? (
                  <span>
                    <strong>Flask backend unreachable.</strong> Start the Python server with{' '}
                    <code className="font-mono px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50">
                      python3 backend/app.py
                    </code>{' '}
                    on port 5000.
                  </span>
                ) : (
                  <span>
                    <strong>OPENAI_API_KEY is not configured.</strong> Add your OpenAI API key to{' '}
                    <code className="font-mono px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50">
                      backend/.env
                    </code>{' '}
                    to generate dual AI answers.
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white shrink-0 whitespace-nowrap"
            >
              View Setup Guide
            </button>
          </div>
        )}

        {/* Hero & Starter Prompt Cards (shown when no turns yet, matching Stitch layout) */}
        {turns.length === 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111827]/75 p-6 sm:p-8 space-y-7">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="text-xs font-medium text-[#2563EB] dark:text-[#4cd7f6] tracking-wide">
                  Adaptive Dual-Generation Protocol · Two answers. Your choice. Smarter conversations.
                </div>
                <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-slate-900 dark:text-[#F8FAFC] text-balance">
                  Find the answer that works best for you.
                </h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                  Every question produces two genuinely distinct stylistic answers selected by our decision engine. Pick the one you prefer—our Scikit-learn KNN classifier learns your preference profile in real time.
                </p>
              </div>

              {/* Compact Real Preference Signal Preview */}
              <div className="lg:w-72 shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0e18]/80 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Style Priors
                  </span>
                  <span className="text-[#2563EB] dark:text-[#4cd7f6] tabular-nums">
                    {stats?.comparisons ? `${stats.comparisons} votes` : 'Cold Start'}
                  </span>
                </div>
                <div className="space-y-2">
                  {(topScores.length > 0
                    ? topScores
                    : [
                        { style: 'Simple Explanation', preference_score: 0.5 },
                        { style: 'Technical Explanation', preference_score: 0.5 },
                        { style: 'Example-Based Explanation', preference_score: 0.5 },
                        { style: 'Step-by-Step Explanation', preference_score: 0.5 },
                      ]
                  ).map((entry) => (
                    <div key={entry.style} className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="truncate pr-2">{entry.style}</span>
                        <span className="font-mono tabular-nums text-slate-500 dark:text-[#adc6ff]">
                          {Math.round(entry.preference_score * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] transition-all duration-300"
                          style={{ width: `${Math.round(entry.preference_score * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4 Starter Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STARTER_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.kicker}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleSend(card.prompt)}
                    className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#171b26]/90 hover:bg-white dark:hover:bg-[#1E293B]/90 hover:border-[#3B82F6]/50 p-4 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <div className="space-y-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-[#1E293B] border border-blue-200/80 dark:border-slate-700 flex items-center justify-center text-[#3B82F6] dark:text-[#adc6ff]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                        {card.kicker}
                      </div>
                      <div className="font-display font-semibold text-sm text-slate-900 dark:text-[#F8FAFC] leading-snug">
                        {card.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#2563EB] dark:text-[#4cd7f6] group-hover:translate-x-0.5 transition-transform">
                      <span>{card.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Active Conversation Turns */}
        <div className="space-y-8">
          {turns.map((turn, idx) => {
            const turnNum = String(idx + 1).padStart(2, '0');
            return (
              <article key={turn.id} className="space-y-4">
                {/* User Question Bubble */}
                <div className="flex flex-col items-end gap-1.5">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Turn {turnNum} · {new Date(turn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · You
                  </div>
                  <div className="max-w-2xl rounded-2xl rounded-tr-sm px-4 py-3 bg-blue-50 dark:bg-[#1E293B] border border-blue-200 dark:border-[#3B82F6]/35 text-sm sm:text-[15px] text-slate-900 dark:text-[#F8FAFC] leading-relaxed">
                    {turn.question}
                  </div>
                </div>

                {/* Loading Skeleton State */}
                {turn.status === 'loading' && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/80 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-sm font-medium text-slate-800 dark:text-[#dfe2f1]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6] dark:text-[#4cd7f6]" />
                        <span>Selecting two stylistic vectors &amp; generating dual answers...</span>
                      </div>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        OpenAI + KNN Decision Engine
                      </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {[0, 1].map((slot) => (
                        <div
                          key={slot}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171b26] p-5 space-y-3 animate-pulse"
                        >
                          <div className="flex items-center justify-between">
                            <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                            <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                          </div>
                          <div className="space-y-2 pt-2">
                            <div className="h-3.5 w-full rounded bg-slate-200 dark:bg-slate-800" />
                            <div className="h-3.5 w-11/12 rounded bg-slate-200 dark:bg-slate-800" />
                            <div className="h-3.5 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
                            <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                          </div>
                          <div className="pt-3">
                            <div className="h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error State */}
                {turn.status === 'error' && (
                  <div className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                          Unable to generate dual comparison
                        </div>
                        <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300">
                          {turn.errorMessage}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void handleSend(turn.question)}
                      className="px-3.5 py-2 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white shrink-0 whitespace-nowrap disabled:opacity-50"
                    >
                      Retry Question
                    </button>
                  </div>
                )}

                {/* Ready Comparison Cards */}
                {turn.status === 'ready' && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111827]/80 p-4 sm:p-5 space-y-4">
                    {/* Comparison Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display font-semibold text-sm sm:text-base text-slate-900 dark:text-[#F8FAFC]">
                            {turn.selectedChoice
                              ? `Comparison Turn ${turnNum} Resolved`
                              : 'Dual Candidate Comparison'}
                          </h3>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-[#94A3B8]">
                            · {formatDecisionLabel(turn.decisionMode)}
                            {typeof turn.latencyMs === 'number' ? ` · ${turn.latencyMs}ms` : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                          {turn.selectedChoice
                            ? `Selected Answer ${turn.selectedChoice} (${
                                turn.selectedChoice === 'A' ? turn.styleA : turn.styleB
                              }) recorded into temporary KNN memory.`
                            : 'Select the answer style you prefer. Your choice trains the in-memory KNN preference classifier.'}
                        </p>
                      </div>

                      {turn.learnedFeedback && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 text-xs font-medium text-emerald-700 dark:text-emerald-300 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            Learned: {turn.learnedFeedback.selectedStyle} ({turn.learnedFeedback.learnedSamples} samples)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Side-by-side Answer A and Answer B */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                      {(['A', 'B'] as const).map((slot) => {
                        const styleLabel = slot === 'A' ? turn.styleA : turn.styleB;
                        const answerText = slot === 'A' ? turn.answerA : turn.answerB;
                        const vector = slot === 'A' ? turn.styleAVector : turn.styleBVector;
                        const isSelected = turn.selectedChoice === slot;
                        const isRejected = Boolean(turn.selectedChoice && turn.selectedChoice !== slot);
                        const copyId = `${turn.id}-${slot}`;
                        const wordCount = formatWordCount(answerText);

                        return (
                          <div
                            key={slot}
                            className={`flex flex-col justify-between rounded-xl border p-4 sm:p-5 transition-all duration-200 ${
                              isSelected
                                ? 'border-[#3B82F6] bg-blue-50/40 dark:bg-[#1E293B]/90 shadow-[0_0_24px_-4px_rgba(59,130,246,0.22)]'
                                : isRejected
                                ? 'border-slate-200 dark:border-slate-800/70 bg-slate-50/60 dark:bg-[#0f131d]/70 opacity-80'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#171b26]/90 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            {/* Card Top Bar */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`w-6 h-6 rounded-md text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                                      slot === 'A'
                                        ? 'bg-blue-100 dark:bg-[#3B82F6]/20 text-blue-700 dark:text-[#adc6ff] border border-blue-200 dark:border-[#3B82F6]/40'
                                        : 'bg-violet-100 dark:bg-[#8B5CF6]/20 text-violet-700 dark:text-[#d0bcff] border border-violet-200 dark:border-[#8B5CF6]/40'
                                    }`}
                                  >
                                    {slot}
                                  </span>
                                  <span className="font-display font-semibold text-sm text-slate-900 dark:text-[#F8FAFC] truncate">
                                    {styleLabel}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                    {wordCount} words
                                  </span>
                                  {isSelected && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#3B82F6] text-white">
                                      <Check className="w-3 h-3" />
                                      Your Choice
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => void handleCopy(copyId, answerText || '')}
                                    className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0f131d] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                                    title={`Copy Answer ${slot}`}
                                    aria-label={`Copy Answer ${slot}`}
                                  >
                                    {copiedKey === copyId ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Formatted Response Content */}
                              <div className="min-h-[120px]">
                                <SafeMarkdown content={answerText || ''} />
                              </div>
                            </div>

                            {/* Card Footer: Feature Vector + Choose Button */}
                            <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
                              {vector && (
                                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  <span className="truncate">
                                    8D Vector: [{vector.map((v) => v.toFixed(1)).join(', ')}]
                                  </span>
                                  {typeof turn.styleDistance === 'number' && (
                                    <span className="shrink-0 pl-2 tabular-nums">
                                      Δ={turn.styleDistance.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              )}

                              <button
                                type="button"
                                disabled={Boolean(turn.selectedChoice) || turn.choosing}
                                onClick={() => void onSelectAnswer(turn.id, slot)}
                                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                                  isSelected
                                    ? 'bg-[#3B82F6] text-white cursor-default'
                                    : turn.selectedChoice
                                    ? 'bg-slate-200/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-500 cursor-not-allowed'
                                    : slot === 'A'
                                    ? 'bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] text-white'
                                    : 'bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 hover:border-[#3B82F6] text-slate-900 dark:text-[#F8FAFC]'
                                }`}
                              >
                                {turn.choosing && !turn.selectedChoice ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isSelected ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <ThumbsUp className="w-4 h-4" />
                                )}
                                <span>
                                  {isSelected
                                    ? `Preferred Answer ${slot}`
                                    : turn.selectedChoice
                                    ? `Answer ${slot} Not Selected`
                                    : `Choose Answer ${slot}`}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          <div ref={feedEndRef} />
        </div>
      </div>

      {/* Bottom Sticky Composer Bar (matches Stitch floating prompt box) */}
      <div className="sticky bottom-0 z-20 px-4 sm:px-6 pb-4 pt-2 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent dark:from-[#0B0F19] dark:via-[#0B0F19]/95 dark:to-transparent">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="rounded-2xl border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-[#171b26]/95 backdrop-blur-xl shadow-lg dark:shadow-[0_0_32px_-8px_rgba(15,19,29,0.9)] p-3 sm:p-4 space-y-2.5 focus-within:border-[#3B82F6] transition-colors"
          >
            <textarea
              rows={2}
              value={questionInput}
              onChange={(e) => {
                setQuestionInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask PreferenceAI anything... (e.g., Explain Quantum Computing or compare Python vs Rust)"
              className="w-full resize-none bg-transparent text-sm sm:text-[15px] text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />

            {inputError && (
              <div className="text-xs text-rose-600 dark:text-rose-400">{inputError}</div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#0f131d] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#3B82F6] dark:text-[#4cd7f6]" />
                  <select
                    value={biasMode}
                    onChange={(e) => onChangeBiasMode(e.target.value as BiasMode)}
                    className="bg-transparent focus:outline-none cursor-pointer font-medium"
                    aria-label="Decision engine exploration bias"
                  >
                    <option value="balanced" className="dark:bg-[#111827]">
                      Bias: Balanced (ε-Greedy)
                    </option>
                    <option value="explore" className="dark:bg-[#111827]">
                      Bias: Explore New Styles
                    </option>
                    <option value="exploit" className="dark:bg-[#111827]">
                      Bias: Exploit Top KNN
                    </option>
                  </select>
                </label>

                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <BookOpen className="w-3 h-3" />
                  RAM-Only State
                </span>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <span className="hidden md:inline text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  Shift + Enter for newline
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting || !questionInput.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Dual</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-500">
            PreferenceAI stores temporary preference vectors in Flask RAM. No database connected.
          </p>
        </div>
      </div>
    </div>
  );
};
