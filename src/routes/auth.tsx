import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useT, useTitle } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/lib/data";
import { unlockParent } from "@/lib/parent";

type Mode = "signup" | "login";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode: Mode } => ({
    mode: s["mode"] === "signup" ? "signup" : "login",
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
  const t = useT();
  useTitle("Prijava | Zvezdica");
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [f, setF] = useState({ family: "", name: "", email: "", password: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });
  // Seconds until "send again" is allowed (Supabase limits how many emails it sends).
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);
  const redirectTo = () => window.location.origin + "/profiles";

  /** Readable text for the sign-up / email errors Supabase returns. */
  function authError(err: unknown) {
    const code = err && typeof err === "object" ? (err as { code?: unknown }).code : undefined;
    if (code === "over_email_send_rate_limit")
      return t("Poslanih je bilo preveč sporočil. Poskusi znova čez nekaj minut.");
    if (code === "user_already_exists")
      return t("Ta e-poštni naslov je že registriran. Prijavi se.");
    return errMsg(err);
  }

  async function resend() {
    if (cooldown > 0 || !f.email) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: f.email,
      options: { emailRedirectTo: redirectTo() },
    });
    setBusy(false);
    if (error) {
      toast.error(authError(error));
      return;
    }
    toast.success(t("Sporočilo smo poslali znova."));
    setCooldown(60);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && (!f.family.trim() || !f.name.trim())) {
      toast.error(t("Vnesi ime družine in svoje ime."));
      return;
    }
    if (f.password.length < 6) {
      toast.error(t("Geslo mora imeti vsaj 6 znakov."));
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: f.email,
          password: f.password,
          options: {
            emailRedirectTo: redirectTo(),
            data: { family_name: f.family.trim(), parent_name: f.name.trim() },
          },
        });
        if (error) throw error;
        // An already registered address gets no new email: Supabase answers with a user
        // that has no identities (to hide which addresses exist). Say so instead of
        // promising an email that never comes.
        if (data.user && data.user.identities?.length === 0) {
          toast.error(t("Ta e-poštni naslov je že registriran. Prijavi se."));
          navigate({ to: "/auth", search: { mode: "login" } });
          return;
        }
        if (!data.session) {
          setSent(true);
          setCooldown(60);
        } else if (await unlockParent(f.password).catch(() => false))
          navigate({ to: "/parent/children", search: { welcome: true } });
        else navigate({ to: "/profiles" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: f.email,
          password: f.password,
        });
        if (error?.code === "email_not_confirmed") {
          // Not "wrong password": the address is just not confirmed yet. Offer a new email.
          toast.error(t("E-poštni naslov še ni potrjen."));
          setSent(true);
          return;
        }
        if (error) throw new Error(t("Napačen e-poštni naslov ali geslo."));
        // Same password opens parent mode in the database; if that fails, pick a profile.
        const ok = await unlockParent(f.password).catch(() => false);
        navigate({ to: ok ? "/parent" : "/profiles" });
      }
    } catch (err) {
      toast.error(authError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <Link
        to="/"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("Nazaj")}
      </Link>
      <div className="rounded-3xl bg-card p-5 shadow-soft xs:p-8">
        {sent ? (
          <div className="space-y-3 text-center">
            <h1>{t("Preveri e-pošto 📬")}</h1>
            <p className="text-muted-foreground">
              {t(
                "Poslali smo ti povezavo za potrditev na {email}. Po potrditvi se prijavi in dodaj otroke.",
                { email: f.email },
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("Ne najdeš sporočila? Preveri mapo z neželeno pošto ali ga pošlji znova.")}
            </p>
            <Button
              type="button"
              variant="hero"
              className="btn-block"
              disabled={busy || cooldown > 0}
              onClick={resend}
            >
              {cooldown > 0 ? t("Pošlji znova ({n} s)", { n: cooldown }) : t("Pošlji znova")}
            </Button>
            <Button asChild variant="outline" className="btn-block">
              <Link to="/auth" search={{ mode: "login" }} onClick={() => setSent(false)}>
                {t("Na prijavo")}
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h1>{mode === "signup" ? t("Ustvari družino") : t("Prijava v družino")}</h1>
            {mode === "signup" && (
              <>
                <Field label={t("Ime družine")}>
                  <Input
                    value={f.family}
                    onChange={set("family")}
                    placeholder={t("npr. Novakovi")}
                    required
                  />
                </Field>
                <Field label={t("Tvoje ime")}>
                  <Input
                    value={f.name}
                    onChange={set("name")}
                    placeholder={t("npr. Mojca")}
                    required
                  />
                </Field>
              </>
            )}
            <Field label={t("E-poštni naslov")}>
              <Input
                type="email"
                value={f.email}
                onChange={set("email")}
                required
                autoComplete="email"
              />
            </Field>
            <Field label={t("Geslo")}>
              <Input
                type="password"
                value={f.password}
                onChange={set("password")}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </Field>
            <Button type="submit" variant="hero" size="lg" disabled={busy} className="w-full">
              {busy ? t("Trenutek ...") : mode === "signup" ? t("Ustvari družino") : t("Prijava")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {mode === "signup" ? t("Že imaš družino? ") : t("Nimaš še družine? ")}
              <Link
                to="/auth"
                search={{ mode: mode === "signup" ? "login" : "signup" }}
                className="font-bold text-primary"
              >
                {mode === "signup" ? t("Prijava") : t("Ustvari družino")}
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
    <label className="block space-y-1.5">
      <span className="text-sm font-bold leading-none">{label}</span>
      {children}
    </label>
  );
}
