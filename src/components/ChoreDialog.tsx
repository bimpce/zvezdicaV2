import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, useChildren, useFamily, useInvalidateAll, type Chore } from "@/lib/data";
import { frequencyLabel, isoDate, type Frequency } from "@/lib/periods";
import { cn } from "@/lib/utils";

export function ChoreDialog({ open, onOpenChange, chore }: { open: boolean; onOpenChange: (o: boolean) => void; chore?: Chore | null }) {
  const t = useT();
  const { data: family } = useFamily();
  const { data: kids = [] } = useChildren();
  const refresh = useInvalidateAll();
  const [busy, setBusy] = useState(false);
  const empty = { title: "", description: "", points: "10", frequency: "daily" as Frequency, start: isoDate(new Date()), end: "", kids: [] as string[] };
  const [f, setF] = useState(empty);

  useEffect(() => {
    if (!open) return;
    setF(
      chore
        ? { title: chore.title, description: chore.description ?? "", points: String(chore.points), frequency: chore.frequency, start: chore.start_date, end: chore.end_date ?? "", kids: chore.chore_assignments.map((a) => a.child_id) }
        : { ...empty, kids: kids.length === 1 ? [kids[0]!.id] : [] },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chore]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const pts = Number(f.points);
    if (!f.title.trim()) { toast.error(t("Vnesi naziv opravila.")); return; }
    if (!Number.isInteger(pts) || pts < 1) { toast.error(t("Točke morajo biti celo število, večje od 0.")); return; }
    if (f.end && f.end < f.start) { toast.error(t("Datum zaključka ne sme biti pred začetkom.")); return; }
    if (f.kids.length === 0) { toast.error(t("Izberi vsaj enega otroka.")); return; }
    if (!family) return;
    setBusy(true);
    try {
      const row = { family_id: family.id, title: f.title.trim(), description: f.description.trim() || null, points: pts, frequency: f.frequency, start_date: f.start, end_date: f.end || null };
      let id = chore?.id;
      if (id) {
        const { error } = await supabase.from("chores").update(row).eq("id", id);
        if (error) throw error;
        await supabase.from("chore_assignments").delete().eq("chore_id", id);
      } else {
        const { data, error } = await supabase.from("chores").insert(row).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const { error: ae } = await supabase.from("chore_assignments").insert(f.kids.map((k) => ({ chore_id: id!, child_id: k })));
      if (ae) throw ae;
      toast.success(chore ? t("Opravilo posodobljeno") : t("Opravilo dodano"));
      refresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader><DialogTitle className="font-display text-xl">{chore ? t("Uredi opravilo") : t("Novo opravilo")}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5"><Label>{t("Naziv")}</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={t("npr. Pospravi sobo")} /></div>
          <div className="space-y-1.5"><Label>{t("Opis (neobvezno)")}</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>{t("Točke")}</Label><Input type="number" inputMode="numeric" min={1} value={f.points} onChange={(e) => setF({ ...f, points: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>{t("Pogostost")}</Label>
              <Select value={f.frequency} onValueChange={(v) => setF({ ...f, frequency: v as Frequency })}>
                <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(frequencyLabel) as Frequency[]).map((k) => <SelectItem key={k} value={k}>{t(frequencyLabel[k])}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t("Začetek")}</Label><Input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("Zaključek (neobvezno)")}</Label><Input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Dodeli otrokom")}</Label>
            {kids.length === 0 && <p className="text-sm text-muted-foreground">{t("Najprej dodaj otroka.")}</p>}
            <div className="flex flex-wrap gap-2">
              {kids.map((k) => {
                const on = f.kids.includes(k.id);
                return (
                  <button type="button" key={k.id} onClick={() => setF({ ...f, kids: on ? f.kids.filter((x) => x !== k.id) : [...f.kids, k.id] })}
                    className={cn("flex min-h-11 items-center gap-2 rounded-full border-2 px-4 font-bold transition", on ? "border-primary bg-secondary text-secondary-foreground" : "bg-card")}>
                    {k.avatar} {k.name}
                  </button>
                );
              })}
            </div>
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>{chore ? t("Shrani") : t("Dodaj opravilo")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
