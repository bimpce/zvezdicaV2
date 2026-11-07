import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useT, useTitle } from "@/lib/i18n";
import { useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/family-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zvezdica — družinska opravila in točke" },
      { name: "description", content: "Starši dodelijo opravila, otroci zbirajo točke. Preprosto, pregledno, zabavno." },
      { property: "og:title", content: "Zvezdica — družinska opravila in točke" },
      { property: "og:description", content: "Starši dodelijo opravila, otroci zbirajo točke." },
    ],
  }),
  component: Index,
});

function Index() {
  const t = useT();
  useTitle("Zvezdica — družinska opravila in točke");
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/profiles" });
    });
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-8 px-4 py-8 md:flex-row md:gap-12 md:px-8">
      <div className="flex flex-1 flex-col gap-5 text-center md:text-left">
        <div className="flex items-center justify-center gap-2 md:justify-start">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sun text-sun-foreground">
            <Star className="h-6 w-6 fill-current" />
          </span>
          <span className="font-display text-2xl font-semibold">Zvezdica</span>
        </div>
        <h1 className="md:text-5xl">{t("Opravila, ki prinašajo zvezdice ⭐")}</h1>
        <p className="text-muted-foreground md:text-lg">
          {t("Starši dodelijo opravila, otroci jih opravijo in zbirajo točke. Vse na enem mestu.")}
        </p>
        <div className="flex flex-col gap-3 xs:flex-row xs:justify-center md:justify-start">
          <Button asChild variant="hero" size="lg" className="btn-block">
            <Link to="/auth" search={{ mode: "signup" }}>{t("Ustvari družino")}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="btn-block">
            <Link to="/auth" search={{ mode: "login" }}>{t("Prijava v družino")}</Link>
          </Button>
        </div>
      </div>
      <img
        src={hero}
        alt={t("Družina skupaj opravlja hišna opravila")}
        className="w-full max-w-md flex-1 rounded-3xl shadow-soft"
        width={1024}
        height={832}
      />
    </main>
  );
}
