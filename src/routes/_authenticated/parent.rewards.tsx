import { createFileRoute } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, useChildren, useFamily } from "@/lib/data";
import { useRewards, type Reward } from "@/lib/rewards";

export const Route = createFileRoute("/_authenticated/parent/rewards")({
  head: () => ({ meta: [{ title: "Nagrade | Zvezdica" }, { name: "description", content: "Katalog nagrad, ki jih otroci kupijo s točkami." }, { property: "og:title", content: "Nagrade | Zvezdica" }, { property: "og:description", content: "Katalog nagrad, ki jih otroci kupijo s točkami." }] }),
  component: Rewards,
});

const EMOJIS = ["🎁", "🎮", "📺", "🍕", "🍦", "🎬", "🧸", "📚", "🌙", "🚲", "🏞️", "💶"];
const IDEAS = [
  { title: "30 min videoiger", emoji: "🎮", points: 20 },
  { title: "Pica večer", emoji: "🍕", points: 40 },
  { title: "Obisk kina", emoji: "🎬", points: 100 },
  { title: "Izlet po izbiri", emoji: "🏞️", points: 150 },
];

type Draft = { id?: string; title: string; emoji: string; points: number; child_id: string | null; active: boolean };
const empty: Draft = { title: "", emoji: "🎁", points: 50, child_id: null, active: true };

function Rewards() {
  const t = useT();
  const { data: rewards = [], refetch } = useRewards();
  const { data: kids = [] } = useChildren();
  const { data: family } = useFamily();
  const [draft, setDraft] = useState<Draft | null>(null);

  async function save(d: Draft) {
    if (!family) return;
    if (!d.title.trim() || d.points < 1) { toast.error(t("Vpiši naziv in točke.")); return; }
    const row = { title: d.title.trim(), emoji: d.emoji, points: d.points, child_id: d.child_id, active: d.active, family_id: family.id };
    const { error } = d.id ? await supabase.from("rewards").update(row).eq("id", d.id) : await supabase.from("rewards").insert(row);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(t("Nagrada shranjena"));
    setDraft(null);
    void refetch();
  }
  async function remove(r: Reward) {
    if (!confirm(t("Izbrišem nagrado „{title}\"?", { title: r.title }))) return;
    const { error } = await supabase.from("rewards").delete().eq("id", r.id);
    if (error) toast.error(errMsg(error)); else void refetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between">
        <h1>{t("Nagrade")}</h1>
        <Button variant="hero" className="btn-block" onClick={() => setDraft({ ...empty })}><Plus /> {t("Nova nagrada")}</Button>
      </div>

      {rewards.length === 0 && (
        <div className="space-y-3 rounded-2xl bg-muted p-5">
          <p className="text-muted-foreground">{t("Še ni nagrad. Dodaj svojo ali izberi idejo:")}</p>
          <div className="flex flex-wrap gap-2">
            {IDEAS.map((i) => (
              <Button key={i.title} variant="outline" onClick={() => setDraft({ ...empty, ...i, title: t(i.title) })}>{i.emoji} {t(i.title)} · {i.points}</Button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {rewards.map((r) => (
          <div key={r.id} className={`flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft ${r.active ? "" : "opacity-60"}`}>
            <span className="avatar-md flex shrink-0 items-center justify-center rounded-full bg-secondary">{r.emoji}</span>
            <div className="min-w-0 flex-1">
              <h3 className="break-words">{r.title}</h3>
              <p className="text-sm text-muted-foreground">
                {r.child_id ? t("Samo za: {name}", { name: kids.find((k) => k.id === r.child_id)?.name ?? "?" }) : t("Za vse otroke")}
                {!r.active && t(" · skrita")}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-sun px-2.5 py-1 text-sm font-extrabold text-sun-foreground">{r.points} ⭐</span>
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t("Uredi")} onClick={() => setDraft({ ...r })}><Pencil /></Button>
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t("Izbriši")} onClick={() => remove(r)}><Trash2 /></Button>
          </div>
        ))}
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-3xl sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display text-xl">{draft?.id ? t("Uredi nagrado") : t("Nova nagrada")}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>{t("Naziv")}</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={t("npr. Pica večer")} /></div>
              <div className="space-y-1.5">
                <Label>{t("Sličica")}</Label>
                <div className="flex flex-wrap gap-1">
                  {EMOJIS.map((e) => (
                    <button key={e} type="button" onClick={() => setDraft({ ...draft, emoji: e })} className={`h-11 w-11 rounded-xl text-2xl ${draft.emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-muted"}`}>{e}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5"><Label>{t("Cena v točkah")}</Label><Input type="number" min={1} value={draft.points} onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })} /></div>
              <div className="space-y-1.5">
                <Label>{t("Za koga")}</Label>
                <select className="h-11 w-full rounded-md border bg-background px-3" value={draft.child_id ?? ""} onChange={(e) => setDraft({ ...draft, child_id: e.target.value || null })}>
                  <option value="">{t("Vsi otroci")}</option>
                  {kids.map((k) => <option key={k.id} value={k.id}>{k.avatar} {k.name}</option>)}
                </select>
              </div>
              <label className="flex items-center justify-between gap-2"><span className="font-bold">{t("Vidna otrokom")}</span><Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /></label>
              <Button variant="hero" className="w-full" onClick={() => save(draft)}>{t("Shrani")}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
