// Which family member is using this device right now (per browser tab session).
const KEY = "zv_mode";
export type Mode = { kind: "parent" } | { kind: "child"; id: string; pin: string };

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
