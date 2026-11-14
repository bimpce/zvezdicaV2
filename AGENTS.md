## Project rules
- Children are not auth users: the device is signed in as the parent's account; child identity is a per-tab session (src/lib/mode.ts) verified by PIN via security-definer RPCs (`verify_child_pin`, `child_submit`). Why: kids log in with name + PIN only.
- PIN hashes are never readable by clients (column-level grants on `children`); always select explicit child columns.
- Recurring chores reset by period key (src/lib/periods.ts); a completion is unique per chore/child/period. Why: no cron needed.
- Reward points: available = approved chore points minus pending+approved redemptions (src/lib/rewards.ts); children redeem only via `child_redeem` RPC (PIN + balance check). Why: pending requests reserve points so they cannot be double-spent.
- UI text: Slovenian source strings wrapped in `t()` from src/lib/i18n.ts (en/de dictionary there); language is per-device in localStorage. Why: simple, no extra library.
- Database: schema changes go in a new timestamped SQL file in `supabase/migrations/` (applied with `supabase db push`); never edit an already applied migration. After a schema change regenerate `src/integrations/supabase/types.ts` with `supabase gen types typescript`.
- Secrets: `.env` is not committed. Only the Supabase URL and publishable key may live in `VITE_` variables; the service role key is server-only.
- Package manager: npm (`package-lock.json`).
