import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Gift, History, ListTodo, LogOut, Star, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMarkChoresSeen, useSeenChores } from "@/lib/seen";
import { supabase } from "@/integrations/supabase/client";
import { childChoreList, errMsg, pointsFor, useChildren, useChores, useCompletions, useInvalidateAll } from "@/lib/data";
import { getMode, setMode } from "@/lib/mode";
import { Progress } from "@/components/ui/progress";
import { availablePoints, rewardsFor, useGoal, useRedemptions, useRewards, type Reward } from "@/lib/rewards";
import { frequencyLabel } from "@/lib/periods";

type Tab = "tasks" | "points" | "rewards" | "history";

export const Route = createFileRoute("/_authenticated/child/$childId")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    s["tab"] === "points" || s["tab"] === "rewards" || s["tab"] === "history" ? { tab: s["tab"] } : {},
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
  const totalEarned = pointsFor(childId, comps);
  const { data: reds = [] } = useRedemptions();
  const { data: allRewards = [] } = useRewards();
  const points = availablePoints(childId, comps, reds);
  const myRewards = rewardsFor(childId, allRewards);
  const myReds = reds.filter((r) => r.child_id === childId);
  const { goal, setGoal } = useGoal(childId);
  const goalReward = myRewards.find((r) => r.id === goal);
  const [redeeming, setRedeeming] = useState<Reward | null>(null);
  const mine = comps.filter((c) => c.child_id === childId);
  const approved = mine.filter((c) => c.status === "approved");
  const { data: seenData, isSuccess: seenLoaded } = useSeenChores(childId);
  const markSeen = useMarkChoresSeen(childId);
  const [dismissed, setDismissed] = useState(false);
  const recent = Date.now() - 2 * 86400000;
  // no rows yet = first use: only chores from the last 2 days count as new
  const seen = seenLoaded && seenData.size > 0 ? seenData : null;
  const newOnes = !seenLoaded ? [] : list.filter(({ chore, status }) =>
    status === "todo" && (seen ? !seen.has(chore.id) : new Date(chore.created_at).getTime() > recent));
  const newIds = new Set(newOnes.map((n) => n.chore.id));
  useEffect(() => {
    if (seenLoaded && seenData.size === 0 && chores.length) {
      const old = list.filter(({ chore }) => new Date(chore.created_at).getTime() <= recent).map(({ chore }) => chore.id);
      void markSeen(old);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenLoaded, chores.length]);

  async function done(choreId: string, key: string) {
    const m = getMode();
    if (m?.kind !== "child") return;
    setBusy(choreId);
    const { error } = await supabase.rpc("child_submit", { _child_id: childId, _pin: m.pin, _chore_id: choreId, _period_key: key });
    setBusy(null);
    if (error) { toast.error(errMsg(error)); return; }
    void markSeen([choreId]);
    toast.success("Poslano staršem v pregled! 🚀");
    refresh();
  }

  async function redeem(r: Reward) {
    const m = getMode();
    if (m?.kind !== "child") return;
    setBusy(r.id);
    const { error } = await supabase.rpc("child_redeem", { _child_id: childId, _pin: m.pin, _reward_id: r.id });
    setBusy(null);
    setRedeeming(null);
    if (error) { toast.error(errMsg(error)); return; }
    if (goal === r.id) void setGoal(null);
    toast.success("Zahtevek poslan staršem! 🎁");
    refresh();
  }

  const nav = [
    { to: "/child/$childId", params: { childId }, search: {}, label: "Moja opravila", icon: ListTodo, active: tab === "tasks" },
    { to: "/child/$childId", params: { childId }, search: { tab: "points" }, label: "Moje točke", icon: Trophy, active: tab === "points" },
    { to: "/child/$childId", params: { childId }, search: { tab: "rewards" }, label: "Nagrade", icon: Gift, active: tab === "rewards" },
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
      <Dialog open={!dismissed && newOnes.length > 0} onOpenChange={(o) => !o && setDismissed(true)}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] rounded-3xl text-center sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-center font-display text-2xl">Hej, imaš {newOnes.length === 1 ? "novo opravilo" : "nova opravila"}! 🌟</DialogTitle></DialogHeader>
          <ul className="space-y-2">
            {newOnes.map(({ chore }) => (
              <li key={chore.id} className="flex items-center justify-between gap-2 rounded-2xl bg-muted p-3 text-left font-bold">
                <span className="min-w-0 break-words">{chore.title}</span>
                <span className="shrink-0 rounded-full bg-sun px-2.5 py-1 text-sun-foreground">+{chore.points}</span>
              </li>
            ))}
          </ul>
          <Button variant="hero" size="lg" className="w-full" onClick={() => setDismissed(true)}>Gremo! 💪</Button>
        </DialogContent>
      </Dialog>
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-points p-5 text-sun-foreground xs:flex-row xs:p-6">
          <span className="avatar-lg flex shrink-0 items-center justify-center rounded-full bg-card">{me?.avatar}</span>
          <div className="min-w-0 flex-1 text-center xs:text-left">
            <h1 className="break-words">Živjo, {me?.name}!</h1>
            <p className="font-bold">Točke na voljo</p>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-9 w-9 fill-current max-[375px]:h-7 max-[375px]:w-7" />
            <span className="font-display text-5xl font-bold max-[375px]:text-4xl">{points}</span>
          </div>
        </div>

        {goalReward && (tab === "tasks" || tab === "rewards") && (
          <div className="space-y-2 rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between gap-2 font-bold">
              <span className="min-w-0 break-words">🎯 Moj cilj: {goalReward.emoji} {goalReward.title}</span>
              <span className="shrink-0">{Math.min(points, goalReward.points)} / {goalReward.points} ⭐</span>
            </div>
            <Progress value={Math.min(100, (points / goalReward.points) * 100)} className="h-4" />
            <p className="text-sm text-muted-foreground">
              {points >= goalReward.points ? "Imaš dovolj točk — lahko unovčiš! 🎉" : `Še ${goalReward.points - points} točk!`}
            </p>
          </div>
        )}

        {tab === "tasks" && (
          <section className="space-y-3">
            <h2>Moja opravila</h2>
            {list.length === 0 && <p className="rounded-2xl bg-muted p-6 text-center text-muted-foreground">Trenutno nimaš opravil. 😎</p>}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {list.map(({ chore, key, status, completion }) => (
                <div key={chore.id} className="rounded-2xl bg-card p-4 shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words">
                        {chore.title}
                        {newIds.has(chore.id) && <span className="ml-2 inline-block rounded-full bg-accent px-2 py-0.5 align-middle text-xs font-extrabold text-accent-foreground">Novo</span>}
                      </h3>
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
              <Stat label="Vse zvezdice skupaj" value={totalEarned} />
              <Stat label="Potrjenih opravil" value={approved.length} />
              <Stat label="V pregledu" value={mine.filter((c) => c.status === "pending").length} />
            </div>
          </section>
        )}

        {tab === "rewards" && (
          <section className="space-y-3">
            <h2>Nagrade</h2>
            {myRewards.length === 0 && <p className="rounded-2xl bg-muted p-6 text-center text-muted-foreground">Starši še niso dodali nagrad. 🎁</p>}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {myRewards.map((r) => {
                const can = points >= r.points;
                const isGoal = goal === r.id;
                return (
                  <div key={r.id} className={`rounded-2xl bg-card p-4 shadow-soft ${isGoal ? "ring-2 ring-primary" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span className="avatar-md flex shrink-0 items-center justify-center rounded-full bg-secondary text-2xl">{r.emoji}</span>
                      <h3 className="min-w-0 flex-1 break-words">{r.title}</h3>
                      <span className="shrink-0 rounded-full bg-sun px-2.5 py-1 font-extrabold text-sun-foreground">{r.points} ⭐</span>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 xs:flex-row">
                      <Button variant={can ? "hero" : "outline"} className="btn-block xs:flex-1" disabled={!can || busy === r.id} onClick={() => setRedeeming(r)}>
                        <Gift /> {can ? "Unovči" : `Še ${r.points - points} točk`}
                      </Button>
                      <Button variant="ghost" className="btn-block xs:flex-1" onClick={() => setGoal(isGoal ? null : r.id)}>
                        <Star className={isGoal ? "fill-current" : ""} /> {isGoal ? "Moj cilj" : "Nastavi kot cilj"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {myReds.length > 0 && (
              <>
                <h2>Moje unovčitve</h2>
                <ul className="space-y-2">
                  {myReds.slice(0, 20).map((r) => {
                    const rw = allRewards.find((x) => x.id === r.reward_id);
                    return (
                      <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
                        <span className="text-2xl">{rw?.emoji ?? "🎁"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-bold">{rw?.title ?? "Nagrada"} · {r.points} točk</p>
                          <p className="text-sm text-muted-foreground">{new Date(r.requested_at).toLocaleDateString("sl-SI")}</p>
                        </div>
                        <StatusBadge status={r.status} />
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <Dialog open={!!redeeming} onOpenChange={(o) => !o && setRedeeming(null)}>
              <DialogContent className="max-w-[calc(100vw-1.5rem)] rounded-3xl text-center sm:max-w-sm">
                <DialogHeader><DialogTitle className="text-center font-display text-2xl">Res želiš porabiti {redeeming?.points} točk za {redeeming?.emoji} {redeeming?.title}?</DialogTitle></DialogHeader>
                <p className="text-muted-foreground">Starši bodo potrdili, ko ti nagrado izročijo.</p>
                <div className="flex flex-col gap-2">
                  <Button variant="hero" size="lg" className="w-full" disabled={!!busy} onClick={() => redeeming && redeem(redeeming)}>Da, unovči! 🎁</Button>
                  <Button variant="outline" className="w-full" onClick={() => setRedeeming(null)}>Ne še</Button>
                </div>
              </DialogContent>
            </Dialog>
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
