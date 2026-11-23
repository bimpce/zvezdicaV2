// Which family member is using this device right now (per browser tab session).
const KEY = "zv_mode";
/**
 * Parent mode carries the token from the `parent_unlock` RPC; the Supabase client sends it
 * as the `x-parent-token` header and the database only allows parent-only changes with it.
 */
export type Mode = { kind: "parent"; token?: string } | { kind: "child"; id: string; pin: string };

export function getMode(): Mode | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}
export function setMode(m: Mode | null) {
  if (m) sessionStorage.setItem(KEY, JSON.stringify(m));
  else sessionStorage.removeItem(KEY);
}

export function parentToken(): string | undefined {
  const m = getMode();
  return m?.kind === "parent" ? m.token : undefined;
}
