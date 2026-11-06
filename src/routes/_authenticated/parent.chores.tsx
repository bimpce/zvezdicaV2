import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoreDialog } from "@/components/ChoreDialog";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, useChildren, useChores, useInvalidateAll, type Chore } from "@/lib/data";
import { frequencyLabel, isChoreActive } from "@/lib/periods";

export const Route = createFileRoute("/_authenticated/parent/chores")({
  head: () => ({ meta: [{ title: "Opravila | Zvezdica" }, { name: "description", content: "Ustvarjaj in urejaj družinska opravila." }, { property: "og:title", content: "Opravila | Zvezdica" }, { property: "og:description", content: "Ustvarjaj in urejaj družinska opravila." }] }),
  component: Chores,
});

function Chores() {
  const { data: chores = [] } = useChores();
  const { data: kids = [] } = useChildren();
  const refresh = useInvalidateAll();
  const [edit, setEdit] = useState<Chore | null>(null);
  const [open, setOpen] = useState(false);

  async function remove(c: Chore) {
    if (!confirm(`Izbrišem opravilo »${c.title}«?`)) return;
    const { error } = await supabase.from("chores").delete().eq("id", c.id);
    if (error) return toast.error(errMsg(error));
    toast.success("Opravilo izbrisano");
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between">
        <h1>Opravila</h1>
        <Button variant="hero" className="btn-block" onClick={() => { setEdit(null); setOpen(true); }}><Plus /> Dodaj opravilo</Button>
      </div>
      {chores.length === 0 && <p className="rounded-2xl bg-muted p-6 text-center text-muted-foreground">Še ni opravil.</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {chores.map((c) => (
          <div key={c.id} className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="break-words">{c.title}</h3>
                {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
              </div>
              <span className="shrink-0 rounded-full bg-sun px-2.5 py-1 text-sm font-extrabold text-sun-foreground">{c.points} t</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">{frequencyLabel[c.frequency]}</span>
              {!isChoreActive(c) && <span className="rounded-full bg-status-todo-bg px-2.5 py-1 text-status-todo">Neaktivno</span>}
              {c.chore_assignments.map((a) => {
                const k = kids.find((x) => x.id === a.child_id);
                return k && <span key={a.child_id} className="rounded-full bg-muted px-2.5 py-1">{k.avatar} {k.name}</span>;
              })}
            </div>
            <div className="mt-3 flex justify-end gap-1">
              <Button variant="ghost" size="icon" aria-label="Uredi" onClick={() => { setEdit(c); setOpen(true); }}><Pencil /></Button>
              <Button variant="ghost" size="icon" aria-label="Izbriši" onClick={() => remove(c)}><Trash2 /></Button>
            </div>
          </div>
        ))}
      </div>
      <ChoreDialog open={open} onOpenChange={setOpen} chore={edit} />
    </div>
  );
}
