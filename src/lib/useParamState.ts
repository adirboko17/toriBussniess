import { useState } from 'react';

/**
 * Local state seeded from a route param, re-synced whenever the param changes
 * (e.g. a notification opens the same screen with a different tab).
 */
export function useParamState<T extends string>(param: string | undefined, allowed: readonly T[], fallback: T) {
  const pick = (value: string | undefined) => (allowed.includes(value as T) ? (value as T) : null);
  const [value, setValue] = useState<T>(pick(param) ?? fallback);
  const [seen, setSeen] = useState(param);
  if (param !== seen) {
    setSeen(param);
    const next = pick(param);
    if (next) setValue(next);
  }
  return [value, setValue] as const;
}
