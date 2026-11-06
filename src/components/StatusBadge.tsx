import { cn } from "@/lib/utils";
import type { ChoreStatus } from "@/lib/data";

const map: Record<ChoreStatus, { label: string; cls: string }> = {
  todo: { label: "Čaka na izvedbo", cls: "bg-status-todo-bg text-status-todo" },
  pending: { label: "V pregledu", cls: "bg-status-pending-bg text-status-pending" },
  approved: { label: "Potrjeno", cls: "bg-status-approved-bg text-status-approved" },
  rejected: { label: "Zavrnjeno", cls: "bg-status-rejected-bg text-status-rejected" },
};

export function StatusBadge({ status }: { status: ChoreStatus }) {
  const m = map[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", m.cls)}>
      {m.label}
    </span>
  );
}
