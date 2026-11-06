import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/lib/data";
import { setMode } from "@/lib/mode";

type Mode = "signup" | "login";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode: Mode } => ({
    mode: s.mode === "signup" ? "signup" : "login",
  }),
  head: () => ({
    meta: [
      { title: "Prijava | Zvezdica" },
      { name: "description", content: "Ustvari družino ali se prijavi v obstoječo." },
      { property: "og:title", content: "Prijava | Zvezdica" },
      { property: "og:description", content: "Ustvari družino ali se prijavi v obstoječo." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [f, setF] = useState({ family: "", name: "", email: "", password: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && (!f.family.trim() || !f.name.trim()))
      return toast.error("Vnesi ime družine in svoje ime.");
    if (f.password.length < 6) return toast.error("Geslo mora imeti vsaj 6 znakov.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: f.email,
          password: f.password,
          options: {
            emailRedirectTo: window.location.origin + "/profiles",
            data: { family_name: f.family.trim(), parent_name: f.name.trim() },
          },
        });
        if (error) throw error;
        if (data.session) setMode({ kind: "parent" });
        if (data.session) navigate({ to: "/parent/children", search: { welcome: true } });
        else setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw new Error("Napačen e-poštni naslov ali geslo.");
        setMode({ kind: "parent" });
        navigate({ to: "/parent" });
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Nazaj
      </Link>
      <div className="rounded-3xl bg-card p-5 shadow-soft xs:p-8">
        {sent ? (
          <div className="space-y-3 text-center">
            <h1>Preveri e-pošto 📬</h1>
            <p className="text-muted-foreground">
              Poslali smo ti povezavo za potrditev na <b>{f.email}</b>. Po potrditvi se prijavi in dodaj otroke.
            </p>
            <Button asChild variant="outline" className="btn-block">
              <Link to="/auth" search={{ mode: "login" }} onClick={() => setSent(false)}>Na prijavo</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h1>{mode === "signup" ? "Ustvari družino" : "Prijava v družino"}</h1>
            {mode === "signup" && (
              <>
                <Field label="Ime družine"><Input value={f.family} onChange={set("family")} placeholder="Novakovi" required /></Field>
                <Field label="Tvoje ime"><Input value={f.name} onChange={set("name")} placeholder="Mojca" required /></Field>
              </>
            )}
            <Field label="E-poštni naslov"><Input type="email" value={f.email} onChange={set("email")} required autoComplete="email" /></Field>
            <Field label="Geslo"><Input type="password" value={f.password} onChange={set("password")} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></Field>
            <Button type="submit" variant="hero" size="lg" disabled={busy} className="w-full">
              {busy ? "Trenutek ..." : mode === "signup" ? "Ustvari družino" : "Prijava"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Že imaš družino? " : "Nimaš še družine? "}
              <Link to="/auth" search={{ mode: mode === "signup" ? "login" : "signup" }} className="font-bold text-primary">
                {mode === "signup" ? "Prijava" : "Ustvari družino"}
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-bold">{label}</Label>
      {children}
    </div>
  );
}
