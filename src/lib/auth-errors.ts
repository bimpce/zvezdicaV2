import { errMsg } from "./data";

/** Readable text for the sign-up, email and password errors Supabase Auth returns. */
export function authErrorText(t: (s: string) => string, err: unknown) {
  const code = err && typeof err === "object" ? (err as { code?: unknown }).code : undefined;
  if (code === "over_email_send_rate_limit")
    return t("Poslanih je bilo preveč sporočil. Poskusi znova čez nekaj minut.");
  if (code === "user_already_exists") return t("Ta e-poštni naslov je že registriran. Prijavi se.");
  if (code === "same_password") return t("Novo geslo mora biti drugačno od starega.");
  if (code === "weak_password") return t("Geslo je prešibko. Izberi daljše geslo.");
  return errMsg(err);
}
