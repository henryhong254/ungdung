const BASE = "/polaris";

export function api(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, init);
}
