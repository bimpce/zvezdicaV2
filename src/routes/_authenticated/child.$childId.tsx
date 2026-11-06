import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, History, ListTodo, LogOut, Star, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { childChoreList, errMsg, pointsFor, useChildren, useChores, useCompletions, useInvalidateAll } from "@/lib/data";
import { getMode, setMode } from "@/lib/mode";
import { frequencyLabel } from "@/lib/periods";

type Tab = "tasks" | "points" | "history";

export const Route = createFileRoute("/_authenticated/child/$childId")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    s.tab === "points" || s.tab === "history" ? { tab: s.tab } : {},
  beforeLoad: ({ params }) => {
    const m = getMode();
    if (m?.kind !== "child" || m.id !== params.childId) throw redirect({ to: "/profiles" });
  },
  head: () => ({ meta: [{ title: "Moja opravila | Zvezdica" }, { name: "description", content: "Tvoja opravila in točke." }, { property: "og:title", content: "Moja opravila | Zvezdica" }, { property: "og:description", content: "Tvoja opravila in točke." }] }),
  component: ChildView,
});

const cheers = ["Bravo!", "Super!", "Odlično!", "Tako se dela!", "Zvezda si!"];

function ChildView() {
  const { childId } = Route.useParams();
  const { tab = "tasks" } = Route.useSearch();
  const navigate = useNavigate();
  const { data: kids = [] } = useChildren();
  const { data: chores = [] } = useChores();
  const { data: comps = [] } = useCompletions();
  const refresh = useInvalidateAll();
  const [busy, setBusy] = useState<string | null>(null);
  const me = kids.find((k) => k.id === childId);
  const list = childChoreList(childId, chores, comps);
  const points = pointsFor(childId, comps);
  const mine = comps.filter((c) => c.child_id === childId);
  const approved = mine.filter((c) => c.status === "approved");

  async function done(choreId: string, key: string) {
    const m = getMode();
    if (m?.kind !== "child") return;
    setBusy(choreId);
    const { error } = await supabase.rpc("child_submit", { _child_id: childId, _pin: m.pin, _chore_id: choreId, _period_key: key });
    setBusy(null);
    if (error) return toast.error(errMsg(error));
    toast.success("Poslano staršem v pregled! 🚀");
    refresh();
  }

  const nav = [
    { to: "/child/$childId", params: { childId }, search: {}, label: "Moja opravila", icon: ListTodo, active: tab === "tasks" },
    { to: "/child/$childId", params: { childId }, search: { tab: "points" }, label: "Moje točke", icon: Trophy, active: tab === "points" },
    { to: "/child/$childId", params: { childId }, search: { tab: "history" }, label: "Zgodovina", icon: History, active: tab === "history" },
  ];

  return (
    <AppShell
      title={me ? `${me.avatar} ${me.name}` : ""}
      nav={nav}
      footer={
        <Button variant="ghost" size="sm" onClick={() => { setMode(null); navigate({ to: "/profiles" }); }}>
          <LogOut /> Odjava
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-points p-5 text-sun-foreground xs:flex-row xs:p-6">
          <span className="avatar-lg flex shrink-0 items-center justify-center rounded-full bg-card">{me?.avatar}</span>
          <div className="min-w-0 flex-1 text-center xs:text-left">
            <h1 className="break-words">Živjo, {me?.name}!</h1>
            <p className="font-bold">Zbrane točke</p>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-9 w-9 fill-current max-[375px]:h-7 max-[375px]:w-7" />
            <span className="font-display text-5xl font-bold max-[375px]:text-4xl">{points}</span>
          </div>
        </div>

        {tab === "tasks" && (
          <section className="space-y-3">
            <h2>Moja opravila</h2>
            {list.length === 0 && <p className="rounded-2xl bg-muted p-6 text-center text-muted-foreground">Trenutno nimaš opravil. 😎</p>}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {list.map(({ chore, key, status, completion }) => (
                <div key={chore.id} className="rounded-2xl bg-card p-4 shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words">{chore.title}</h3>
                      {chore.description && <p className="text-sm text-muted-foreground">{chore.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={status} />
                        <span className="text-xs font-bold text-muted-foreground">{frequencyLabel[chore.frequency]}</span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-sun px-2.5 py-1 font-extrabold text-sun-foreground">+{chore.points}</span>
                  </div>
                  {status === "rejected" && completion?.note && (
                    <p className="mt-3 rounded-xl bg-status-rejected-bg p-3 text-sm text-status-rejected">„{completion.note}"</p>
                  )}
                  {(status === "todo" || status === "rejected") && (
                    <Button variant="hero" size="lg" className="mt-4 w-full" disabled={busy === chore.id} onClick={() => done(chore.id, key)}>
                      <CheckCircle2 /> {status === "rejected" ? "Poskusi znova" : "Opravljeno"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "points" && (
          <section className="space-y-3">
            <h2>Moje točke</h2>
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-3">
              <Stat label="Skupaj točk" value={points} />
              <Stat label="Potrjenih opravil" value={approved.length} />
              <Stat label="V pregledu" value={mine.filter((c) => c.status === "pending").length} />
            </div>
          </section>
        )}

        {tab === "history" && (
          <section className="space-y-3">
            <h2>Zgodovina</h2>
            {approved.length === 0 && <p className="rounded-2xl bg-muted p-6 text-center text-muted-foreground">Tu se bodo pokazale tvoje zvezdice.</p>}
            <ul className="space-y-2">
              {approved.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
                  <span className="text-2xl">⭐</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{cheers[i % cheers.length]} +{c.points} točk</p>
                    <p className="break-words text-sm text-muted-foreground">
                      {chores.find((x) => x.id === c.chore_id)?.title} · {new Date(c.reviewed_at ?? c.submitted_at).toLocaleDateString("sl-SI")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-4 text-center shadow-soft">
      <div className="font-display text-3xl font-bold text-primary">{value}</div>
      <div className="label-text text-sm font-bold text-muted-foreground">{label}</div>
    </div>
  );
}
