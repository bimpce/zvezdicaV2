import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useChildren, useChores, useCompletions } from "@/lib/data";
import { getParentSeenAt, setParentSeenAt } from "@/lib/seen";

export function NotificationBell() {
  const { data: comps = [] } = useCompletions();
  const { data: chores = [] } = useChores();
  const { data: kids = [] } = useChildren();
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => setSeenAt(getParentSeenAt()), []);

  const pending = comps.filter((c) => c.status === "pending");
  const unread = pending.filter((c) => !seenAt || c.submitted_at > seenAt).length;

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (o) {
      const now = new Date().toISOString();
      setParentSeenAt(now);
      setSeenAt(now);
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-11 w-11" aria-label="Obvestila">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 min-w-5 rounded-full bg-accent px-1 text-center text-[0.65rem] font-bold text-accent-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl p-2">
        <p className="px-2 py-1 font-display font-semibold">Obvestila</p>
        {pending.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">Ni novih oddanih opravil.</p>}
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {pending.slice(0, 20).map((c) => {
            const kid = kids.find((k) => k.id === c.child_id);
            const chore = chores.find((x) => x.id === c.chore_id);
            return (
              <li key={c.id}>
                <Link
                  to="/parent/approvals"
                  onClick={() => setOpen(false)}
                  className="block min-h-11 rounded-xl px-2 py-2 text-sm hover:bg-muted"
                >
                  <span className="font-bold">{kid?.avatar} {kid?.name}</span> je označil/a opravilo{" "}
                  <span className="font-bold">„{chore?.title}"</span> kot opravljeno.
                  <span className="block text-xs text-muted-foreground">
                    {new Date(c.submitted_at).toLocaleString("sl-SI", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
