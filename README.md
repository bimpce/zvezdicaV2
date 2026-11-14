# Zvezdica

Družinska aplikacija za domača opravila: starši razpišejo opravila s točkami, otroci jih
označijo kot opravljena, starši potrdijo, otroci pa točke unovčijo za nagrade.

Cilj projekta je opisan v [docs/vodilna-zvezda.md](docs/vodilna-zvezda.md).

## Tehnologija

- React 19, TanStack Start/Router, TanStack Query, Vite, TypeScript
- Tailwind 4 in komponente shadcn/ui
- Supabase (prijava in Postgres z RLS)

## Razvoj

Potrebuješ Node.js in npm.

```sh
npm install
cp .env.example .env   # vpiši podatke svojega projekta Supabase
npm run dev            # http://localhost:8080
```

Drugi ukazi: `npm test`, `npm run lint`, `npm run build`, `npm run preview`.

## Baza

Shema je v `supabase/migrations/`. Na nov projekt Supabase jo preneseš s
[Supabase CLI](https://supabase.com/docs/guides/cli):

```sh
npx supabase login
npx supabase link --project-ref <ref-projekta>
npx supabase db push
```

V nadzorni plošči Supabase pod Authentication → URL Configuration nastavi naslov
aplikacije (Site URL in Redirect URLs), da potrditvene povezave iz e-pošte vodijo nazaj
v aplikacijo.

## Objava

`npm run build` ustvari strežnik v `.output/`. Privzeto je to običajen strežnik Node
(`node .output/server/index.mjs`). Na Vercelu, Netlifyju in Cloudflare Pages Nitro cilj
zazna sam; drug cilj izbereš s spremenljivko `NITRO_PRESET`.

Gostitelju nastavi iste spremenljivke okolja kot v `.env.example`.
