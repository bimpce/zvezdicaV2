/** Device-local "seen" markers for reminders (no auth identity for children). */
const CHILD_KEY = (id: string) => `zv-seen-chores-${id}`;
const PARENT_KEY = "zv-parent-notif-seen-at";

export function getSeenChores(childId: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(CHILD_KEY(childId));
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

export function markChoresSeen(childId: string, ids: string[]) {
  const s = getSeenChores(childId) ?? new Set<string>();
  ids.forEach((i) => s.add(i));
  localStorage.setItem(CHILD_KEY(childId), JSON.stringify([...s]));
}

export function getParentSeenAt(): string | null {
  return localStorage.getItem(PARENT_KEY);
}

export function setParentSeenAt(iso: string) {
  localStorage.setItem(PARENT_KEY, iso);
}
