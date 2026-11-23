import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // getSession reads the stored login (refreshing it if needed) instead of asking the
    // auth server on every page change; the database rules still check every request.
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth", search: { mode: "login" } });
  },
  component: () => <Outlet />,
});
