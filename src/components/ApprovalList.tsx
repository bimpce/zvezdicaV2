import { useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, useChildren, useChores, useCompletions, useInvalidateAll, type Completion } from "@/lib/data";

export function ApprovalList({ limit }: { limit?: number }) {
  const t = useT();
  const { data: comps = [] } = useCompletions();
  const { data: chores = [] } = useChores();
  const { data: kids = [] } = useChildren();
  const refresh = useInvalidateAll();
  const [rejecting, setRejecting] = useState<Completion | null>(null);
  const [note, setNote] = useState("");
  const pending = comps.filter((c) => c.status === "pending").slice(0, limit);

  async function review(c: Completion, status: "approved" | "rejected", n?: string) {
    const { error } = await supabase
      .from("completions")
      .update({ status, note: n || null, reviewed_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(status === "approved" ? t("Potrjeno! +{n} točk", { n: c.points }) : t("Opravilo zavrnjeno"));
    setRejecting(null);
    setNote("");
    refresh();
  }

  if (pending.length === 0)
    return <p className="rounded-2xl bg-muted p-6 text-center text-muted-foreground">{t("Ni opravil, ki čakajo na potrditev. 🎉")}</p>;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {pending.map((c) => {
        const kid = kids.find((k) => k.id === c.child_id);
        const chore = chores.find((x) => x.id === c.chore_id);
        return (
          <div key={c.id} className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="avatar-md flex shrink-0 items-center justify-center rounded-full bg-secondary">{kid?.avatar}</span>
              <div className="min-w-0 flex-1">
                <h3 className="break-words">{chore?.title ?? t("Opravilo")}</h3>
                <p className="text-sm text-muted-foreground">
                  {kid?.name} · {new Date(c.submitted_at).toLocaleString(t.locale, { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-sun px-2.5 py-1 text-sm font-extrabold text-sun-foreground">+{c.points}</span>
            </div>
            <div className="mt-4 flex flex-col gap-2 xs:flex-row">
              <Button variant="success" className="btn-block xs:flex-1" onClick={() => review(c, "approved")}><Check /> {t("Potrdi")}</Button>
              <Button variant="outline" className="btn-block xs:flex-1" onClick={() => setRejecting(c)}><X /> {t("Zavrni")}</Button>
            </div>
          </div>
        );
      })}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-3xl sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display text-xl">{t("Zavrni opravilo")}</DialogTitle></DialogHeader>
          <Textarea placeholder={t("Razlaga za otroka (npr. »Postelja še ni pospravljena.«)")} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              if (!note.trim()) { toast.error(t("Dodaj kratko razlago.")); return; }
              if (rejecting) review(rejecting, "rejected", note.trim());
            }}
          >
            {t("Zavrni")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
