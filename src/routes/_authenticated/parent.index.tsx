import { createFileRoute, Link } from "@tanstack/react-router";
import { useT, useTitle } from "@/lib/i18n";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApprovalList } from "@/components/ApprovalList";
import { ChoreDialog } from "@/components/ChoreDialog";
import { childChoreList, pointsFor, useChildren, useChores, useCompletions, useFamily } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/parent/")({
  head: () => ({ meta: [{ title: "Domov | Zvezdica" }, { name: "description", content: "Pregled družine." }, { property: "og:title", content: "Domov | Zvezdica" }, { property: "og:description", content: "Pregled družine." }] }),
  component: ParentHome,
});

function ParentHome() {
  const t = useT();
  useTitle("Domov | Zvezdica");
  const { data: family } = useFamily();
  const { data: kids = [] } = useChildren();
  const { data: chores = [] } = useChores();
  const { data: comps = [] } = useCompletions();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 xs:flex-row xs:items-end xs:justify-between">
        <div>
          <p className="text-sm font-bold text-muted-foreground">{t("Živjo, {name} 👋", { name: family?.parent_name || t("starš") })}</p>
          <h1>{t("Pregled družine")}</h1>
        </div>
        <Button variant="hero" className="btn-block" onClick={() => setOpen(true)}><Plus /> {t("Dodaj opravilo")}</Button>
      </div>

      <section className="space-y-3">
        <h2>{t("Otroci")}</h2>
        {kids.length === 0 ? (
          <div className="rounded-2xl bg-muted p-6 text-center">
            <p className="mb-3 text-muted-foreground">{t("Dodaj prvega otroka, da začneš.")}</p>
            <Button asChild className="btn-block"><Link to="/parent/children">{t("Dodaj otroka")}</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {kids.map((k) => {
              const list = childChoreList(k.id, chores, comps);
              const todo = list.filter((x) => x.status === "todo" || x.status === "rejected").length;
              return (
                <div key={k.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
                  <span className="avatar-md flex shrink-0 items-center justify-center rounded-full bg-secondary">{k.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate">{k.name}</h3>
                    <p className="text-sm text-muted-foreground">{t("{n} za opraviti", { n: todo })}</p>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-gradient-points px-3 py-2 text-center text-sun-foreground">
                    <div className="font-display text-xl font-bold leading-none">{pointsFor(k.id, comps)}</div>
                    <div className="text-[0.65rem] font-bold">{t("točk")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2>{t("Čaka na potrditev")}</h2>
          <Link to="/parent/approvals" className="text-sm font-bold text-primary">{t("Vse")}</Link>
        </div>
        <ApprovalList limit={4} />
      </section>
      <ChoreDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
