import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { authErrorText } from "@/lib/auth-errors";
import { useT, useTitle } from "@/lib/i18n";
import { unlockParent } from "@/lib/parent";

// The password-reset email links here. Supabase reads the one-time login from the link
// (detectSessionInUrl), so by the time getSession resolves the parent is signed in and
// may set a new password.
//
// Only a visit that arrives from the email link may change the password: the family
// device is always signed in, so otherwise a child could open this page and take over
// the parent password. The link's one-time token is in the address when this code first
// loads (Supabase removes it right after), so remember it now.
const openedFromEmail =
  typeof window !== "undefined" &&
  /type=recovery|[?&]code=/.test(window.location.hash + window.location.search);

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Novo geslo | Zvezdica" },
      { name: "description", content: "Nastavi novo geslo za družinski račun." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const t = useT();
  useTitle("Novo geslo | Zvezdica");
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    void supabase.auth
      .getSession()
      .then(({ data: s }) => alive && setReady((r) => r || (openedFromEmail && !!s.session)));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) {
      toast.error(t("Geslo mora imeti vsaj 6 znakov."));
      return;
    }
    if (pw !== pw2) {
      toast.error(t("Gesli se ne ujemata."));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      toast.error(authErrorText(t, error));
      return;
    }
    toast.success(t("Geslo je spremenjeno."));
    // The new password also opens parent mode on this device.
    const ok = await unlockParent(pw).catch(() => false);
    setBusy(false);
    navigate({ to: ok ? "/parent" : "/profiles" });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <Link
        to="/auth"
        search={{ mode: "login" }}
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("Na prijavo")}
      </Link>
      <div className="rounded-3xl bg-card p-5 shadow-soft xs:p-8">
        {ready === null ? (
          <p className="text-center text-muted-foreground">{t("Trenutek ...")}</p>
        ) : !ready ? (
          <div className="space-y-3 text-center">
            <h1>{t("Povezava ne velja")}</h1>
            <p className="text-muted-foreground">
              {t("Povezava za novo geslo je potekla ali je bila že uporabljena. Zahtevaj novo.")}
            </p>
            <Button asChild variant="hero" className="btn-block">
              <Link to="/auth" search={{ mode: "forgot" }}>
                {t("Pozabljeno geslo?")}
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <h1>{t("Novo geslo")}</h1>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold leading-none">{t("Novo geslo")}</span>
              <Input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                autoFocus
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold leading-none">{t("Ponovi geslo")}</span>
              <Input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </label>
            <Button type="submit" variant="hero" size="lg" disabled={busy} className="w-full">
              {busy ? t("Trenutek ...") : t("Shrani novo geslo")}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
