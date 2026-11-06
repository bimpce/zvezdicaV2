import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, useFamily, useInvalidateAll } from "@/lib/data";
import { setMode } from "@/lib/mode";

export const Route = createFileRoute("/_authenticated/parent/settings")({
  head: () => ({ meta: [{ title: "Nastavitve | Zvezdica" }, { name: "description", content: "Nastavitve družine." }, { property: "og:title", content: "Nastavitve | Zvezdica" }, { property: "og:description", content: "Nastavitve družine." }] }),
  component: Settings,
});

function Settings() {
  const { data: family } = useFamily();
  const refresh = useInvalidateAll();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", parent: "" });
  useEffect(() => { if (family) setF({ name: family.name, parent: family.parent_name }); }, [family]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!family || !f.name.trim()) return toast.error("Ime družine je obvezno.");
    const { error } = await supabase.from("families").update({ name: f.name.trim(), parent_name: f.parent.trim() }).eq("id", family.id);
    if (error) return toast.error(errMsg(error));
    toast.success("Shranjeno");
    refresh();
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1>Nastavitve</h1>
      <form onSubmit={save} className="space-y-4 rounded-2xl bg-card p-4 shadow-soft xs:p-6">
        <div className="space-y-1.5"><Label>Ime družine</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Tvoje ime</Label><Input value={f.parent} onChange={(e) => setF({ ...f, parent: e.target.value })} /></div>
        <Button type="submit" className="btn-block">Shrani</Button>
      </form>
      <Button variant="outline" className="btn-block" onClick={async () => { setMode(null); await supabase.auth.signOut(); navigate({ to: "/" }); }}>
        <LogOut /> Odjava
      </Button>
    </div>
  );
}
