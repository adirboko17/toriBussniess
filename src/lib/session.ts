import { useSyncExternalStore } from 'react';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type SessionState = {
  status: AuthStatus;
  token: string | null;
  /** Route to open once signed in (tapped notification while logged out). */
  pendingUrl: string | null;
};

let state: SessionState = { status: 'loading', token: null, pendingUrl: null };
const listeners = new Set<() => void>();
let unauthorizedHandler: (() => void) | null = null;

function emit() {
  for (const listener of listeners) listener();
}

export function setSession(patch: Partial<SessionState>) {
  state = { ...state, ...patch };
  emit();
}

export function getSession() {
  return state;
}

export function getToken() {
  return state.token;
}

export function useSession() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized() {
  unauthorizedHandler?.();
}
