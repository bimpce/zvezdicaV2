import { createFileRoute } from "@tanstack/react-router";
import { ApprovalList } from "@/components/ApprovalList";
import { RedemptionList } from "@/components/RedemptionList";
import { StatusBadge } from "@/components/StatusBadge";
import { useChildren, useChores, useCompletions } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/parent/approvals")({
  head: () => ({ meta: [{ title: "Potrditve | Zvezdica" }, { name: "description", content: "Potrdi ali zavrni opravljena opravila." }, { property: "og:title", content: "Potrditve | Zvezdica" }, { property: "og:description", content: "Potrdi ali zavrni opravljena opravila." }] }),
  component: Approvals,
});

function Approvals() {
  const { data: comps = [] } = useCompletions();
  const { data: chores = [] } = useChores();
  const { data: kids = [] } = useChildren();
  const history = comps.filter((c) => c.status !== "pending").slice(0, 30);
  return (
    <div className="space-y-8">
      <h1>Potrditve</h1>
      <ApprovalList />
      <section className="space-y-3">
        <h2>Nagrade v pregledu</h2>
        <RedemptionList />
      </section>
      <section className="space-y-3">
        <h2>Zgodovina aktivnosti</h2>
        {history.length === 0 && <p className="text-muted-foreground">Še ni zgodovine.</p>}
        <ul className="divide-y rounded-2xl bg-card shadow-soft">
          {history.map((c) => {
            const kid = kids.find((k) => k.id === c.child_id);
            return (
              <li key={c.id} className="flex flex-col gap-1 p-4 xs:flex-row xs:items-center xs:gap-3">
                <span className="min-w-0 flex-1 break-words font-bold">
                  {kid?.avatar} {kid?.name} — {chores.find((x) => x.id === c.chore_id)?.title}
                  {c.note && <span className="block text-sm font-normal text-muted-foreground">„{c.note}"</span>}
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={c.status} />
                  {c.status === "approved" && <span className="text-sm font-extrabold text-status-approved">+{c.points}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
