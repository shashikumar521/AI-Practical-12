import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ChatInterface } from './components/ChatInterface';
import { DecisionArchitecture } from './components/DecisionArchitecture';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ApiError, preferenceApi } from './services/api';
import type {
  BiasMode,
  ChatSession,
  ChatTurn,
  HealthResponse,
  NavView,
  StatsResponse,
  ThemeMode,
} from './types';

function createEmptySession(label = 'New Conversation'): ChatSession {
  return {
    id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: label,
    createdAt: new Date().toISOString(),
    turns: [],
  };
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [activeView, setActiveView] = useState<NavView>('chat');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Temporary frontend-only chat session memory (no database)
  const [sessions, setSessions] = useState<ChatSession[]>(() => [createEmptySession('Active Session')]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || '');

  const [biasMode, setBiasMode] = useState<BiasMode>('balanced');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Sync Tailwind .dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId]
  );

  const fetchBackendState = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [healthRes, statsRes] = await Promise.all([
        preferenceApi.checkHealth(),
        preferenceApi.getStats(),
      ]);
      setHealth(healthRes);
      setStats(statsRes);
      setBackendOnline(true);
      setStatsError(null);
    } catch (err) {
      setBackendOnline(false);
      setStatsError(
        err instanceof ApiError
          ? err.message
          : 'Unable to reach Flask backend at port 5000.'
      );
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBackendState();
  }, [fetchBackendState]);

  const handleNewChat = useCallback(() => {
    const nextSession = createEmptySession(`Session ${sessions.length + 1}`);
    setSessions((prev) => [nextSession, ...prev]);
    setActiveSessionId(nextSession.id);
    setActiveView('chat');
  }, [sessions.length]);

  // Ctrl+K / Cmd+K shortcut for New Chat
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNewChat]);

  const updateTurnInSession = useCallback(
    (sessionId: string, turnId: string, updater: (turn: ChatTurn) => ChatTurn) => {
      setSessions((prev) =>
        prev.map((sess) => {
          if (sess.id !== sessionId) return sess;
          return {
            ...sess,
            turns: sess.turns.map((t) => (t.id === turnId ? updater(t) : t)),
          };
        })
      );
    },
    []
  );

  const handleSubmitQuestion = useCallback(
    async (question: string) => {
      const targetSessionId = activeSession?.id;
      if (!targetSessionId) return;

      const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const pendingTurn: ChatTurn = {
        id: turnId,
        question,
        createdAt: new Date().toISOString(),
        status: 'loading',
      };

      setSessions((prev) =>
        prev.map((sess) => {
          if (sess.id !== targetSessionId) return sess;
          const isFirstTurn = sess.turns.length === 0;
          const truncatedTitle =
            question.length > 36 ? `${question.slice(0, 36)}...` : question;
          return {
            ...sess,
            title: isFirstTurn ? truncatedTitle : sess.title,
            turns: [...sess.turns, pendingTurn],
          };
        })
      );

      try {
        const res = await preferenceApi.askQuestion({
          question,
          bias_mode: biasMode,
        });
        setBackendOnline(true);
        updateTurnInSession(targetSessionId, turnId, (t) => ({
          ...t,
          status: 'ready',
          requestId: res.request_id,
          styleA: res.style_a,
          styleB: res.style_b,
          answerA: res.answer_a,
          answerB: res.answer_b,
          decisionMode: res.decision_mode,
          styleDistance: res.style_distance,
          styleAVector: res.style_a_vector,
          styleBVector: res.style_b_vector,
          latencyMs: res.latency_ms,
        }));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Unexpected error while generating dual responses.';
        const code = err instanceof ApiError ? err.code : 'UNKNOWN_ERROR';
        if (code === 'BACKEND_UNAVAILABLE') {
          setBackendOnline(false);
        }
        updateTurnInSession(targetSessionId, turnId, (t) => ({
          ...t,
          status: 'error',
          errorMessage: message,
          errorCode: code,
        }));
      }
    },
    [activeSession?.id, biasMode, updateTurnInSession]
  );

  const handleSelectAnswer = useCallback(
    async (turnId: string, selected: 'A' | 'B') => {
      const targetSessionId = activeSession?.id;
      if (!targetSessionId) return;
      const targetTurn = activeSession.turns.find((t) => t.id === turnId);
      if (!targetTurn || !targetTurn.requestId || targetTurn.selectedChoice || targetTurn.choosing) {
        return;
      }

      updateTurnInSession(targetSessionId, turnId, (t) => ({
        ...t,
        choosing: true,
      }));

      try {
        const res = await preferenceApi.chooseAnswer({
          request_id: targetTurn.requestId,
          selected,
        });
        updateTurnInSession(targetSessionId, turnId, (t) => ({
          ...t,
          choosing: false,
          selectedChoice: selected,
          learnedFeedback: {
            selectedStyle: res.selected_style,
            rejectedStyle: res.rejected_style,
            learnedSamples: res.learned_samples,
            modelStatus: res.model_status,
          },
        }));
        await fetchBackendState();
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Failed to record preference choice.';
        updateTurnInSession(targetSessionId, turnId, (t) => ({
          ...t,
          choosing: false,
          errorMessage: message,
        }));
      }
    },
    [activeSession, fetchBackendState, updateTurnInSession]
  );

  const handleResetPreferences = useCallback(async () => {
    setIsResetting(true);
    setActionMessage(null);
    try {
      await preferenceApi.resetPreferences();
      await fetchBackendState();
      setActionMessage('In-memory KNN preferences have been reset.');
    } catch (err) {
      setActionMessage(
        err instanceof ApiError ? err.message : 'Unable to reset backend preferences.'
      );
    } finally {
      setIsResetting(false);
    }
  }, [fetchBackendState]);

  const handleClearChatHistory = useCallback(() => {
    const fresh = createEmptySession('Active Session');
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    setActionMessage('Temporary frontend chat history cleared.');
  }, []);

  const handleResetSession = useCallback(async () => {
    await handleResetPreferences();
    handleClearChatHistory();
  }, [handleClearChatHistory, handleResetPreferences]);

  const handleUpdateConfig = useCallback(
    async (k: number, epsilon: number) => {
      await preferenceApi.updateConfig({
        n_neighbors: k,
        exploration_rate: epsilon,
      });
      await fetchBackendState();
    },
    [fetchBackendState]
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-[#dfe2f1] transition-colors">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        sessions={sessions}
        activeSessionId={activeSession?.id || ''}
        onSelectSession={setActiveSessionId}
        onNewChat={handleNewChat}
        onResetPreferences={() => void handleResetPreferences()}
        onResetSession={() => void handleResetSession()}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        isResetting={isResetting}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeView={activeView}
          onSelectView={setActiveView}
          health={health}
          backendOnline={backendOnline}
          stats={stats}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />

        <main className="flex-1">
          {activeView === 'chat' && (
            <ChatInterface
              turns={activeSession?.turns || []}
              stats={stats}
              backendOnline={backendOnline}
              apiKeyConfigured={Boolean(health?.api_key_configured)}
              biasMode={biasMode}
              onChangeBiasMode={setBiasMode}
              onSubmitQuestion={handleSubmitQuestion}
              onSelectAnswer={handleSelectAnswer}
              onOpenSettings={() => setActiveView('settings')}
            />
          )}

          {activeView === 'analytics' && (
            <AnalyticsDashboard
              stats={stats}
              loading={statsLoading}
              error={statsError}
              onRefresh={() => void fetchBackendState()}
              onGoToChat={() => setActiveView('chat')}
            />
          )}

          {activeView === 'architecture' && (
            <DecisionArchitecture
              stats={stats}
              onUpdateConfig={handleUpdateConfig}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              theme={theme}
              onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              health={health}
              backendOnline={backendOnline}
              stats={stats}
              onRefreshHealth={fetchBackendState}
              onResetPreferences={handleResetPreferences}
              onClearChatHistory={handleClearChatHistory}
              isResetting={isResetting}
              actionMessage={actionMessage}
            />
          )}
        </main>
      </div>
    </div>
  );
}
