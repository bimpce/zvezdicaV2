import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useChildren, useChores, useCompletions, useFamily } from "@/lib/data";
import { useRedemptions, useRewards } from "@/lib/rewards";

export function NotificationBell() {
  const t = useT();
  const { data: comps = [] } = useCompletions();
  const { data: chores = [] } = useChores();
  const { data: kids = [] } = useChildren();
  const { data: family } = useFamily();
  const { data: reds = [] } = useRedemptions();
  const { data: rewards = [] } = useRewards();
  const qc = useQueryClient();
  const [localSeen, setLocalSeen] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const seenAt = [localSeen, family?.notifications_seen_at ?? null]
    .filter(Boolean)
    .map((s) => new Date(s!).getTime())
    .reduce((a, b) => Math.max(a, b), 0);

  const pending = comps.filter((c) => c.status === "pending");
  const pendingReds = reds.filter((r) => r.status === "pending");
  const unread = pending.filter((c) => new Date(c.submitted_at).getTime() > seenAt).length
    + pendingReds.filter((r) => new Date(r.requested_at).getTime() > seenAt).length;

  async function onOpenChange(o: boolean) {
    setOpen(o);
    if (o && family) {
      const now = new Date().toISOString();
      setLocalSeen(now);
      await supabase.from("families").update({ notifications_seen_at: now }).eq("id", family.id);
      qc.invalidateQueries({ queryKey: ["family"] });
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-11 w-11" aria-label={t("Obvestila")}>
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 min-w-5 rounded-full bg-accent px-1 text-center text-[0.65rem] font-bold text-accent-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl p-2">
        <p className="px-2 py-1 font-display font-semibold">{t("Obvestila")}</p>
        {pending.length + pendingReds.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">{t("Ni novih oddanih opravil.")}</p>}
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {pendingReds.slice(0, 10).map((r) => {
            const kid = kids.find((k) => k.id === r.child_id);
            const rw = rewards.find((x) => x.id === r.reward_id);
            return (
              <li key={r.id}>
                <Link to="/parent/approvals" onClick={() => setOpen(false)} className="block min-h-11 rounded-xl px-2 py-2 text-sm hover:bg-muted">
                  <span className="font-bold">{kid?.avatar} {kid?.name}</span> {t("želi unovčiti nagrado")}{" "}
                  <span className="font-bold">{rw?.emoji} {t("„{title}“", { title: rw?.title })}</span> ({r.points} {t("točk")}).
                  <span className="block text-xs text-muted-foreground">
                    {new Date(r.requested_at).toLocaleString(t.locale, { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </Link>
              </li>
            );
          })}
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
                  <span className="font-bold">{kid?.avatar} {kid?.name}</span> {t("je označil/a opravilo")}{" "}
                  <span className="font-bold">{t("„{title}“", { title: chore?.title })}</span> {t("kot opravljeno.")}
                  <span className="block text-xs text-muted-foreground">
                    {new Date(c.submitted_at).toLocaleString(t.locale, { dateStyle: "short", timeStyle: "short" })}
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
