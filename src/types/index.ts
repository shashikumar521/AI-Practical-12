export type AnswerStyle =
  | 'Simple Explanation'
  | 'Detailed Explanation'
  | 'Technical Explanation'
  | 'Example-Based Explanation'
  | 'Short Answer'
  | 'Step-by-Step Explanation'
  | 'Professional Explanation'
  | 'Beginner-Friendly Explanation';

export type NavView = 'chat' | 'analytics' | 'architecture' | 'scene3d' | 'settings';

export type BiasMode = 'balanced' | 'explore' | 'exploit';

export type ThemeMode = 'dark' | 'light';

export interface AskRequest {
  question: string;
  bias_mode?: BiasMode;
}

export interface AskResponse {
  request_id: string;
  style_a: AnswerStyle;
  style_b: AnswerStyle;
  answer_a: string;
  answer_b: string;
  decision_mode: string;
  style_distance: number;
  style_a_vector: number[];
  style_b_vector: number[];
  exploration_rate: number;
  latency_ms: number;
}

export interface ChooseRequest {
  request_id: string;
  selected: 'A' | 'B';
}

export interface ChooseResponse {
  message: string;
  selected_style: AnswerStyle;
  rejected_style: AnswerStyle;
  learned_samples: number;
  comparisons: number;
  model_trained: boolean;
  model_status: 'untrained' | 'bootstrapping' | 'trained';
}

export interface StyleScoreEntry {
  style: AnswerStyle;
  knn_probability: number;
  pairwise_score: number;
  preference_score: number;
  selected_count: number;
  rejected_count: number;
  shown_count: number;
  feature_vector: number[];
  description: string;
}

export interface ComparisonRecord {
  request_id: string;
  question: string;
  style_a: AnswerStyle;
  style_b: AnswerStyle;
  selected: 'A' | 'B';
  selected_style: AnswerStyle;
  rejected_style: AnswerStyle;
  decision_mode: string;
  timestamp: string;
}

export interface StatsResponse {
  comparisons: number;
  positive_samples: number;
  negative_samples: number;
  total_samples: number;
  learned_samples: number;
  model_trained: boolean;
  model_status: 'untrained' | 'bootstrapping' | 'trained';
  n_neighbors: number;
  effective_k: number;
  exploration_rate: number;
  feature_names: string[];
  selected_styles: Record<string, number>;
  rejected_styles: Record<string, number>;
  shown_styles: Record<string, number>;
  knn_scores: StyleScoreEntry[];
  recent_comparisons: ComparisonRecord[];
  last_fit_error: string | null;
  limitations: string[];
  storage_notice: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  tagline: string;
  api_key_configured: boolean;
  model: string;
  comparisons: number;
  model_trained: boolean;
  model_status: 'untrained' | 'bootstrapping' | 'trained';
  storage: string;
}

export interface ResetResponse {
  message: string;
}

export interface ConfigRequest {
  n_neighbors?: number;
  exploration_rate?: number;
}

export interface ConfigResponse {
  n_neighbors: number;
  exploration_rate: number;
  model_trained: boolean;
}

export interface ChatTurn {
  id: string;
  question: string;
  createdAt: string;
  status: 'loading' | 'ready' | 'error';
  errorMessage?: string;
  errorCode?: string;
  requestId?: string;
  styleA?: AnswerStyle;
  styleB?: AnswerStyle;
  answerA?: string;
  answerB?: string;
  decisionMode?: string;
  styleDistance?: number;
  styleAVector?: number[];
  styleBVector?: number[];
  latencyMs?: number;
  selectedChoice?: 'A' | 'B';
  choosing?: boolean;
  learnedFeedback?: {
    selectedStyle: AnswerStyle;
    rejectedStyle: AnswerStyle;
    learnedSamples: number;
    modelStatus: 'untrained' | 'bootstrapping' | 'trained';
  };
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  turns: ChatTurn[];
}
