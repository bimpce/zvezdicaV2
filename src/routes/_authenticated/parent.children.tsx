import { createFileRoute, Link } from "@tanstack/react-router";
import { useT, useTitle } from "@/lib/i18n";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PinInput } from "@/components/PinInput";
import { supabase } from "@/integrations/supabase/client";
import {
  AVATARS,
  errMsg,
  useChildren,
  useCompletions,
  useInvalidateAll,
  type Child,
} from "@/lib/data";
import { isValidPin } from "@/lib/periods";
import { availablePoints, useRedemptions } from "@/lib/rewards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/parent/children")({
  validateSearch: (s: Record<string, unknown>): { welcome?: boolean } =>
    s["welcome"] === true || s["welcome"] === "true" ? { welcome: true } : {},
  head: () => ({
    meta: [
      { title: "Otroci | Zvezdica" },
      { name: "description", content: "Dodaj in uredi profile otrok." },
      { property: "og:title", content: "Otroci | Zvezdica" },
      { property: "og:description", content: "Dodaj in uredi profile otrok." },
    ],
  }),
  component: Children,
});

type DialogState =
  { kind: "add" } | { kind: "edit"; child: Child } | { kind: "pin"; child: Child } | null;

function Children() {
  const t = useT();
  useTitle("Otroci | Zvezdica");
  const { welcome } = Route.useSearch();
  const { data: kids = [] } = useChildren();
  const { data: comps = [] } = useCompletions();
  const { data: reds = [] } = useRedemptions();
  const refresh = useInvalidateAll();
  const [dlg, setDlg] = useState<DialogState>(welcome ? { kind: "add" } : null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string>(AVATARS[0]!);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  function openDlg(d: DialogState) {
    setDlg(d);
    setPin("");
    if (d?.kind === "edit") {
      setName(d.child.name);
      setAvatar(d.child.avatar);
    } else {
      setName("");
      setAvatar(AVATARS[kids.length % AVATARS.length]!);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dlg) return;
    if (dlg.kind !== "pin" && !name.trim()) {
      toast.error(t("Vnesi ime otroka."));
      return;
    }
    if (dlg.kind !== "edit" && !isValidPin(pin)) {
      toast.error(t("PIN mora imeti točno 6 številk."));
      return;
    }
    setBusy(true);
    try {
      if (dlg.kind === "add") {
        const { error } = await supabase.rpc("add_child", {
          _name: name,
          _pin: pin,
          _avatar: avatar,
        });
        if (error) throw error;
        toast.success(t("{name} dodan/a! 🎉", { name: name.trim() }));
      } else if (dlg.kind === "edit") {
        const { error } = await supabase
          .from("children")
          .update({ name: name.trim(), avatar })
          .eq("id", dlg.child.id);
        if (error) throw error;
        toast.success(t("Profil posodobljen"));
      } else {
        const { error } = await supabase.rpc("reset_child_pin", {
          _child_id: dlg.child.id,
          _pin: pin,
        });
        if (error) throw error;
        toast.success(t("PIN ponastavljen"));
      }
      refresh();
      setDlg(null);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Child) {
    if (!confirm(t("Izbrišem profil {name}? Izgubljene bodo vse točke.", { name: c.name }))) return;
    const { error } = await supabase.from("children").delete().eq("id", c.id);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success(t("Profil izbrisan"));
    refresh();
  }

  return (
    <div className="space-y-6">
      {welcome && (
        <div className="rounded-2xl bg-secondary p-4 text-secondary-foreground">
          <b>{t("Dobrodošli!")}</b> {t("Dodajte otroke, nato jim dodelite opravila.")}{" "}
          {kids.length > 0 && (
            <Link to="/parent/chores" className="font-bold underline">
              {t("Naprej na opravila →")}
            </Link>
          )}
        </div>
      )}
      <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between">
        <h1>{t("Otroci")}</h1>
        <Button variant="hero" className="btn-block" onClick={() => openDlg({ kind: "add" })}>
          <Plus /> {t("Dodaj otroka")}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {kids.map((k) => (
          <div
            key={k.id}
            className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-soft xs:flex-row xs:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="avatar-md flex shrink-0 items-center justify-center rounded-full bg-secondary">
                {k.avatar}
              </span>
              <div className="min-w-0">
                <h3 className="truncate">{k.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("{n} točk", { n: availablePoints(k.id, comps, reds) })}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("Uredi")}
                onClick={() => openDlg({ kind: "edit", child: k })}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("Ponastavi PIN")}
                onClick={() => openDlg({ kind: "pin", child: k })}
              >
                <KeyRound />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("Izbriši")}
                onClick={() => remove(k)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="max-h-[92vh] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {dlg?.kind === "add"
                ? t("Nov otrok")
                : dlg?.kind === "edit"
                  ? t("Uredi profil")
                  : t("Nov PIN za {name}", { name: dlg?.kind === "pin" ? dlg.child.name : "" })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {dlg?.kind !== "pin" && (
              <>
                <div className="space-y-1.5">
                  <Label>{t("Ime")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>Avatar</Label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {AVATARS.map((a) => (
                      <button
                        type="button"
                        key={a}
                        onClick={() => setAvatar(a)}
                        aria-label={`Avatar ${a}`}
                        className={cn(
                          "flex aspect-square min-h-11 items-center justify-center rounded-xl border-2 text-2xl",
                          avatar === a
                            ? "border-primary bg-secondary"
                            : "border-transparent bg-muted",
                        )}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {dlg?.kind !== "edit" && (
              <div className="space-y-1.5">
                <Label>{t("6-mestni PIN")}</Label>
                <PinInput value={pin} onChange={setPin} />
              </div>
            )}
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              {t("Shrani")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
