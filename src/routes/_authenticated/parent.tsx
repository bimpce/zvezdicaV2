import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
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
  const t = useT();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: family } = useFamily();
  const { data: comps = [] } = useCompletions();
  const { data: reds = [] } = useRedemptions();
  const pending = comps.filter((c) => c.status === "pending").length + reds.filter((r) => r.status === "pending").length;
  const is = (p: string) => (p === "/parent" ? pathname === "/parent" || pathname === "/parent/" : pathname.startsWith(p));

  return (
    <AppShell
      title={family?.name ?? t("Družina")}
      nav={[
        { to: "/parent", label: t("Domov"), icon: Home, active: is("/parent") },
        { to: "/parent/chores", label: t("Opravila"), icon: ListTodo, active: is("/parent/chores") },
        { to: "/parent/children", label: t("Otroci"), icon: Users, active: is("/parent/children") },
        { to: "/parent/rewards", label: t("Nagrade"), icon: Gift, active: is("/parent/rewards") },
        { to: "/parent/approvals", label: t("Potrditve"), icon: CheckCheck, active: is("/parent/approvals"), badge: pending },
        { to: "/parent/settings", label: t("Nastavitve"), icon: Settings, active: is("/parent/settings") },
      ]}
      footer={
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button variant="ghost" size="sm" onClick={() => { setMode(null); navigate({ to: "/profiles" }); }}>
            <UserRound /> {t("Zamenjaj profil")}
          </Button>
        </div>
      }
    >
      <Outlet />
    </AppShell>
  );
}
