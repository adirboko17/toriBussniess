import { getToken, notifyUnauthorized } from './session';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://www.wetori.co.il').replace(/\/+$/, '');

export type ApiErrorKind = 'http' | 'offline' | 'timeout' | 'auth';

export class ApiError extends Error {
  status: number;
  kind: ApiErrorKind;
  constructor(message: string, status: number, kind: ApiErrorKind) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  timeoutMs?: number;
  signal?: AbortSignal;
};

function fallbackMessage(status: number) {
  if (status === 401) return 'פג תוקף ההתחברות. יש להתחבר מחדש.';
  if (status === 403) return 'אין הרשאה לפעולה הזו.';
  if (status === 404) return 'הפריט לא נמצא.';
  if (status === 413) return 'הקובץ גדול מדי.';
  if (status === 429) return 'יותר מדי ניסיונות. נסו שוב בעוד רגע.';
  if (status >= 500) return 'שגיאת שרת. נסו שוב בעוד רגע.';
  return 'הפעולה נכשלה. נסו שוב.';
}

export async function api<T = Record<string, unknown>>(path: string, options: Options = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 30_000);
  options.signal?.addEventListener('abort', () => controller.abort());

  const token = getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? (body ? 'POST' : 'GET'),
      headers,
      body,
      signal: controller.signal,
      credentials: 'omit',
    });
  } catch (error) {
    if (timedOut) throw new ApiError('השרת לא הגיב בזמן. בדקו את החיבור ונסו שוב.', 0, 'timeout');
    if (options.signal?.aborted) throw error;
    throw new ApiError('אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.', 0, 'offline');
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text().catch(() => '');
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }
  const serverMessage =
    (typeof data.message === 'string' && data.message) ||
    (typeof data.error === 'string' && data.error) ||
    '';

  if (response.status === 401 && token) {
    notifyUnauthorized();
    throw new ApiError(serverMessage || fallbackMessage(401), 401, 'auth');
  }
  if (!response.ok || data.ok === false) {
    throw new ApiError(serverMessage || fallbackMessage(response.status), response.status, 'http');
  }
  return data as T;
}

export function errorMessage(error: unknown, fallback = 'הפעולה נכשלה. נסו שוב.') {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isNetworkError(error: unknown) {
  return error instanceof ApiError && (error.kind === 'offline' || error.kind === 'timeout');
}
