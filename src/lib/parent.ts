import { supabase } from "@/integrations/supabase/client";
import { parentToken, setMode } from "./mode";

/** PostgREST "function not found": the database update has not been applied yet. */
export const isMissingFunction = (e: unknown) =>
  !!e && typeof e === "object" && (e as { code?: unknown }).code === "PGRST202";

/**
 * Enter parent mode: the database checks the account password and hands out a token.
 * Returns false on a wrong password; throws on other errors (e.g. too many tries).
 */
export async function unlockParent(password: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("parent_unlock", { _password: password });
  if (error) {
    // Database not updated yet: fall back to the old check (password re-login).
    if (isMissingFunction(error)) {
      const { data: u } = await supabase.auth.getUser();
      const { error: e2 } = await supabase.auth.signInWithPassword({
        email: u.user?.email ?? "",
        password,
      });
      if (e2) return false;
      setMode({ kind: "parent" });
      return true;
    }
    throw error;
  }
  if (!data) return false;
  setMode({ kind: "parent", token: data });
  return true;
}

/** Leave parent mode and end the token on the server, so it cannot be reused. */
export async function lockParent() {
  try {
    if (parentToken()) await supabase.rpc("parent_lock");
  } catch {
    // offline: the token still expires by itself
  } finally {
    setMode(null);
  }
}

/** Keeps the parent session alive; false once it has expired or was never unlocked. */
export async function touchParent(): Promise<boolean> {
  const { data, error } = await supabase.rpc("parent_touch");
  if (error) return true; // missing function or network trouble: don't lock the parent out
  return data;
}
