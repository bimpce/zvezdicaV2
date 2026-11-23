import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, useFamily, useInvalidateAll } from "@/lib/data";
import { lockParent } from "@/lib/parent";
import { LANGS, setLang, useT, useTitle } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/parent/settings")({
  head: () => ({
    meta: [
      { title: "Nastavitve | Zvezdica" },
      { name: "description", content: "Nastavitve družine." },
      { property: "og:title", content: "Nastavitve | Zvezdica" },
      { property: "og:description", content: "Nastavitve družine." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { data: family } = useFamily();
  const refresh = useInvalidateAll();
  const t = useT();
  useTitle("Nastavitve | Zvezdica");
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", parent: "" });
  // Fill the form once per family; background refreshes must not wipe unsaved typing.
  const familyId = family?.id;
  useEffect(() => {
    if (family) setF({ name: family.name, parent: family.parent_name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!family || !f.name.trim()) {
      toast.error(t("Ime družine je obvezno."));
      return;
    }
    const { error } = await supabase
      .from("families")
      .update({ name: f.name.trim(), parent_name: f.parent.trim() })
      .eq("id", family.id);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success(t("Shranjeno"));
    refresh();
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1>{t("Nastavitve")}</h1>
      <form onSubmit={save} className="space-y-4 rounded-2xl bg-card p-4 shadow-soft xs:p-6">
        <div className="space-y-1.5">
          <Label>{t("Ime družine")}</Label>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("Tvoje ime")}</Label>
          <Input value={f.parent} onChange={(e) => setF({ ...f, parent: e.target.value })} />
        </div>
        <Button type="submit" className="btn-block">
          {t("Shrani")}
        </Button>
      </form>
      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-soft xs:p-6">
        <div>
          <h2>{t("Jezik")}</h2>
          <p className="text-sm text-muted-foreground">{t("Jezik aplikacije na tej napravi.")}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 xs:grid-cols-3">
          {LANGS.map((l) => (
            <Button
              key={l.code}
              type="button"
              variant={t.lang === l.code ? "default" : "outline"}
              className={cn("min-h-11")}
              onClick={() => setLang(l.code)}
              aria-pressed={t.lang === l.code}
            >
              {l.label}
            </Button>
          ))}
        </div>
      </section>
      <Button
        variant="outline"
        className="btn-block"
        onClick={async () => {
          await lockParent();
          await supabase.auth.signOut();
          navigate({ to: "/" });
        }}
      >
        <LogOut /> {t("Odjava")}
      </Button>
    </div>
  );
}
