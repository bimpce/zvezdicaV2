import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { CheckCheck, Gift, Home, ListTodo, Settings, Users, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { useCompletions, useFamily } from "@/lib/data";
import { getMode, setMode } from "@/lib/mode";
import { useRedemptions } from "@/lib/rewards";

export const Route = createFileRoute("/_authenticated/parent")({
  beforeLoad: () => {
    if (getMode()?.kind !== "parent") throw redirect({ to: "/profiles" });
  },
  component: ParentLayout,
});

function ParentLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: family } = useFamily();
  const { data: comps = [] } = useCompletions();
  const { data: reds = [] } = useRedemptions();
  const pending = comps.filter((c) => c.status === "pending").length + reds.filter((r) => r.status === "pending").length;
  const is = (p: string) => (p === "/parent" ? pathname === "/parent" || pathname === "/parent/" : pathname.startsWith(p));

  return (
    <AppShell
      title={family?.name ?? "Družina"}
      nav={[
        { to: "/parent", label: "Domov", icon: Home, active: is("/parent") },
        { to: "/parent/chores", label: "Opravila", icon: ListTodo, active: is("/parent/chores") },
        { to: "/parent/children", label: "Otroci", icon: Users, active: is("/parent/children") },
        { to: "/parent/rewards", label: "Nagrade", icon: Gift, active: is("/parent/rewards") },
        { to: "/parent/approvals", label: "Potrditve", icon: CheckCheck, active: is("/parent/approvals"), badge: pending },
        { to: "/parent/settings", label: "Nastavitve", icon: Settings, active: is("/parent/settings") },
      ]}
      footer={
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button variant="ghost" size="sm" onClick={() => { setMode(null); navigate({ to: "/profiles" }); }}>
            <UserRound /> Zamenjaj profil
          </Button>
        </div>
      }
    >
      <Outlet />
    </AppShell>
  );
}
