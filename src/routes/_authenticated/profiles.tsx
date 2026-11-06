import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PinInput } from "@/components/PinInput";
import { supabase } from "@/integrations/supabase/client";
import { useChildren, useFamily, type Child } from "@/lib/data";
import { setMode } from "@/lib/mode";
import { isValidPin } from "@/lib/periods";

export const Route = createFileRoute("/_authenticated/profiles")({
  head: () => ({
    meta: [
      { title: "Kdo si? | Zvezdica" },
      { name: "description", content: "Izberi svoj profil v družini." },
      { property: "og:title", content: "Kdo si? | Zvezdica" },
      { property: "og:description", content: "Izberi svoj profil v družini." },
    ],
  }),
  component: Profiles,
});

function Profiles() {
  const navigate = useNavigate();
  const { data: family } = useFamily();
  const { data: children = [] } = useChildren();
  const [child, setChild] = useState<Child | null>(null);
  const [pin, setPin] = useState("");
  const [parentOpen, setParentOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function tryPin(value: string) {
    if (!child) return;
    if (!isValidPin(value)) { toast.error("PIN mora imeti točno 6 številk."); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_child_pin", { _child_id: child.id, _pin: value });
    setBusy(false);
    if (error || !data) {
      setPin("");
      { toast.error("Napačen PIN. Poskusi znova."); return; }
    }
    setMode({ kind: "child", id: child.id, pin: value });
    navigate({ to: "/child/$childId", params: { childId: child.id } });
  }

  async function parentLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.auth.signInWithPassword({ email: u.user?.email ?? "", password: pw });
    setBusy(false);
    if (error) { toast.error("Napačno geslo."); return; }
    setMode({ kind: "parent" });
    navigate({ to: "/parent" });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 md:px-8">
      <div className="mb-8 text-center">
        <p className="text-sm font-bold text-muted-foreground">{family?.name}</p>
        <h1>Kdo si? 👋</h1>
      </div>
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3">
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => { setChild(c); setPin(""); }}
            className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-3xl bg-card p-5 shadow-soft transition hover:-translate-y-0.5"
          >
            <span className="avatar-lg flex items-center justify-center rounded-full bg-secondary">{c.avatar}</span>
            <span className="font-display text-lg font-semibold">{c.name}</span>
          </button>
        ))}
        <button
          onClick={() => setParentOpen(true)}
          className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed bg-muted p-5"
        >
          <ShieldCheck className="h-8 w-8 text-primary" />
          <span className="font-display text-lg font-semibold">Starš</span>
        </button>
      </div>
      {children.length === 0 && (
        <p className="mt-6 text-center text-muted-foreground">Ni še otrok. Prijavi se kot starš in jih dodaj.</p>
      )}
      <Button variant="ghost" className="mx-auto mt-10" onClick={() => { setMode(null); supabase.auth.signOut(); navigate({ to: "/" }); }}>
        <LogOut /> Odjava naprave
      </Button>

      <Dialog open={!!child} onOpenChange={(o) => !o && setChild(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center font-display text-2xl">
              {child?.avatar} Živjo, {child?.name}!
            </DialogTitle>
          </DialogHeader>
          <p className="text-center text-muted-foreground">Vnesi svoj 6-mestni PIN</p>
          <PinInput value={pin} onChange={setPin} autoFocus onComplete={tryPin} />
          <Button variant="hero" size="lg" className="w-full" disabled={busy} onClick={() => tryPin(pin)}>
            Prijava
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={parentOpen} onOpenChange={setParentOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-3xl sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display text-2xl">Starševski dostop</DialogTitle></DialogHeader>
          <form onSubmit={parentLogin} className="space-y-4">
            <Input type="password" placeholder="Geslo" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus required />
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>Prijava</Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
