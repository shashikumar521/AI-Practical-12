import type {
  AskRequest,
  AskResponse,
  ChooseRequest,
  ChooseResponse,
  ConfigRequest,
  ConfigResponse,
  HealthResponse,
  ResetResponse,
  StatsResponse,
} from '../types';

/**
 * Resolve backend base URL:
 * - When running locally on localhost / 127.0.0.1, connect directly to VITE_API_URL (default http://127.0.0.1:5000).
 * - When running inside a hosted/cloud preview domain (e.g. AI Studio iframe), route via `/api`
 *   so the port-3000 server proxies directly to the Flask backend on 127.0.0.1:5000.
 */
export function resolveApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');
  if (typeof window === 'undefined') {
    return configured;
  }
  const host = window.location.hostname;
  const isLocalBrowser = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
  return isLocalBrowser ? configured : '/api';
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'API_ERROR', status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = resolveApiBaseUrl();
  const url = `${baseUrl}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch {
    throw new ApiError(
      'Unable to reach the Flask backend server. Make sure the Python Flask backend is running on port 5000.',
      'BACKEND_UNAVAILABLE',
      0
    );
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    if (!response.ok) {
      throw new ApiError(
        `Backend returned HTTP ${response.status}.`,
        'INVALID_SERVER_RESPONSE',
        response.status
      );
    }
  }

  if (!response.ok) {
    const message =
      typeof data.error === 'string' && data.error.trim()
        ? data.error
        : `Request failed with status ${response.status}.`;
    const code = typeof data.code === 'string' ? data.code : 'REQUEST_FAILED';
    throw new ApiError(message, code, response.status);
  }

  return data as unknown as T;
}

export const preferenceApi = {
  checkHealth(): Promise<HealthResponse> {
    return requestJson<HealthResponse>('/');
  },

  askQuestion(payload: AskRequest): Promise<AskResponse> {
    return requestJson<AskResponse>('/ask', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  chooseAnswer(payload: ChooseRequest): Promise<ChooseResponse> {
    return requestJson<ChooseResponse>('/choose', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getStats(): Promise<StatsResponse> {
    return requestJson<StatsResponse>('/stats');
  },

  resetPreferences(): Promise<ResetResponse> {
    return requestJson<ResetResponse>('/reset', {
      method: 'POST',
    });
  },

  updateConfig(payload: ConfigRequest): Promise<ConfigResponse> {
    return requestJson<ConfigResponse>('/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
