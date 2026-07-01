const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function api(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, init);
}
