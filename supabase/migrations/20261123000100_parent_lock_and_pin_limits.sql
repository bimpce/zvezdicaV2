-- Parent mode enforced by the database, and a limit on wrong PIN / password guesses.
--
-- The device is signed in as the parent's account, so before this every write was allowed
-- to anyone holding the tab (a child with developer tools could approve their own chores).
-- Now entering parent mode checks the account password here and returns a short-lived
-- token; the app sends it as the `x-parent-token` header and every parent-only write
-- requires it (public.is_parent()).

-- 1) Failed attempts (child PINs by child id, parent password by family id).
CREATE TABLE public.auth_failures (
  id bigserial PRIMARY KEY,
  subject_id uuid NOT NULL,
  failed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_failures_subject_idx ON public.auth_failures (subject_id, failed_at);
ALTER TABLE public.auth_failures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_failures FROM anon, authenticated;
GRANT ALL ON public.auth_failures TO service_role;

-- 5 wrong tries within 15 minutes lock that profile for the rest of the window.
CREATE FUNCTION public.is_locked_out(_subject uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) >= 5 FROM public.auth_failures
  WHERE subject_id = _subject AND failed_at > now() - interval '15 minutes'
$$;

-- Checks a child PIN, counting failures. Returns false on a wrong PIN (the failure is
-- kept because nothing is raised) and raises only while locked out.
CREATE FUNCTION public.check_child_pin(_child_id uuid, _pin text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE h text;
BEGIN
  SELECT pin_hash INTO h FROM public.children
    WHERE id = _child_id AND family_id = public.my_family_id();
  IF NOT FOUND THEN RETURN false; END IF;
  IF public.is_locked_out(_child_id) THEN
    RAISE EXCEPTION 'Preveč napačnih poskusov. Počakaj 15 minut.';
  END IF;
  IF h = crypt(_pin, h) THEN
    DELETE FROM public.auth_failures WHERE subject_id = _child_id;
    RETURN true;
  END IF;
  INSERT INTO public.auth_failures (subject_id) VALUES (_child_id);
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.verify_child_pin(_child_id uuid, _pin text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  RETURN public.check_child_pin(_child_id, _pin);
END $$;

-- child_submit / child_redeem now return false on a wrong PIN instead of raising, so the
-- failed attempt is recorded (a raise would roll it back and allow unlimited guessing).
DROP FUNCTION public.child_submit(uuid, text, uuid, text);
CREATE FUNCTION public.child_submit(_child_id uuid, _pin text, _chore_id uuid, _period_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE ch public.chores%rowtype;
BEGIN
  IF NOT public.check_child_pin(_child_id, _pin) THEN RETURN false; END IF;
  SELECT * INTO ch FROM public.chores
    WHERE id = _chore_id AND family_id = public.my_family_id() AND archived_at IS NULL;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.chore_assignments WHERE chore_id = _chore_id AND child_id = _child_id
  ) THEN RAISE EXCEPTION 'Opravilo ni dodeljeno'; END IF;
  IF ch.start_date > current_date + 1 OR (ch.end_date IS NOT NULL AND ch.end_date < current_date - 1)
    OR _period_key NOT IN (
      public.period_key_for(ch.frequency, current_date - 1),
      public.period_key_for(ch.frequency, current_date),
      public.period_key_for(ch.frequency, current_date + 1))
    THEN RAISE EXCEPTION 'Opravilo trenutno ni na voljo'; END IF;
  INSERT INTO public.completions (family_id, chore_id, child_id, period_key, points)
  VALUES (ch.family_id, ch.id, _child_id, _period_key, ch.points)
  ON CONFLICT (chore_id, child_id, period_key) DO UPDATE
    SET status = 'pending', note = null, submitted_at = now(), reviewed_at = null, points = excluded.points
    WHERE public.completions.status = 'rejected';
  RETURN true;
END $$;

DROP FUNCTION public.child_redeem(uuid, text, uuid);
CREATE FUNCTION public.child_redeem(_child_id uuid, _pin text, _reward_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r public.rewards%rowtype;
BEGIN
  IF NOT public.check_child_pin(_child_id, _pin) THEN RETURN false; END IF;
  PERFORM 1 FROM public.children WHERE id = _child_id FOR UPDATE;
  SELECT * INTO r FROM public.rewards WHERE id = _reward_id AND family_id = public.my_family_id() AND active
    AND (child_id IS NULL OR child_id = _child_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Nagrada ni na voljo'; END IF;
  IF public.child_available_points(_child_id) < r.points THEN RAISE EXCEPTION 'Premalo točk'; END IF;
  INSERT INTO public.reward_redemptions (family_id, reward_id, child_id, points)
  VALUES (r.family_id, r.id, _child_id, r.points);
  RETURN true;
END $$;

-- 2) Parent sessions. Only a hash of the token is stored.
CREATE TABLE public.parent_sessions (
  token_hash text PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.parent_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parent_sessions FROM anon, authenticated;
GRANT ALL ON public.parent_sessions TO service_role;

CREATE FUNCTION public.request_parent_token_hash() RETURNS text
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  SELECT encode(digest(coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'x-parent-token', ''), 'sha256'), 'hex')
$$;

CREATE FUNCTION public.is_parent() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_sessions
    WHERE token_hash = public.request_parent_token_hash()
      AND family_id = public.my_family_id() AND expires_at > now())
$$;

-- Checks the signed-in account's password and opens parent mode for 12 hours
-- (extended while the parent screens are open). Returns null on a wrong password.
CREATE FUNCTION public.parent_unlock(_password text) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE fid uuid := public.my_family_id(); h text; tok text;
BEGIN
  IF fid IS NULL THEN RAISE EXCEPTION 'Ni družine'; END IF;
  IF public.is_locked_out(fid) THEN
    RAISE EXCEPTION 'Preveč napačnih poskusov. Počakaj 15 minut.';
  END IF;
  SELECT encrypted_password INTO h FROM auth.users WHERE id = auth.uid();
  IF h IS NULL OR h = '' OR h <> crypt(_password, h) THEN
    INSERT INTO public.auth_failures (subject_id) VALUES (fid);
    RETURN NULL;
  END IF;
  DELETE FROM public.auth_failures WHERE subject_id = fid;
  DELETE FROM public.parent_sessions WHERE expires_at < now();
  tok := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.parent_sessions (token_hash, family_id, expires_at)
  VALUES (encode(digest(tok, 'sha256'), 'hex'), fid, now() + interval '12 hours');
  RETURN tok;
END $$;

CREATE FUNCTION public.parent_touch() RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  UPDATE public.parent_sessions SET expires_at = now() + interval '12 hours'
  WHERE token_hash = public.request_parent_token_hash()
    AND family_id = public.my_family_id() AND expires_at > now();
  RETURN FOUND;
END $$;

CREATE FUNCTION public.parent_lock() RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
  DELETE FROM public.parent_sessions WHERE token_hash = public.request_parent_token_hash()
$$;

-- 3) Parent-only RPCs.
CREATE OR REPLACE FUNCTION public.add_child(_name text, _pin text, _avatar text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE fid uuid := public.my_family_id(); nid uuid;
BEGIN
  IF fid IS NULL THEN RAISE EXCEPTION 'Ni družine'; END IF;
  IF NOT public.is_parent() THEN RAISE EXCEPTION 'Potreben je starševski dostop'; END IF;
  IF _pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'PIN mora imeti točno 6 številk'; END IF;
  IF length(trim(_name)) = 0 THEN RAISE EXCEPTION 'Ime je obvezno'; END IF;
  INSERT INTO public.children (family_id, name, avatar, pin_hash)
  VALUES (fid, trim(_name), coalesce(_avatar, '🦊'), crypt(_pin, gen_salt('bf')))
  RETURNING id INTO nid;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.reset_child_pin(_child_id uuid, _pin text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public.is_parent() THEN RAISE EXCEPTION 'Potreben je starševski dostop'; END IF;
  IF _pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'PIN mora imeti točno 6 številk'; END IF;
  UPDATE public.children SET pin_hash = crypt(_pin, gen_salt('bf'))
  WHERE id = _child_id AND family_id = public.my_family_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'Otrok ne obstaja'; END IF;
  DELETE FROM public.auth_failures WHERE subject_id = _child_id;
END $$;

-- 4) Function permissions. Internal helpers are not callable from the app.
REVOKE EXECUTE ON FUNCTION public.is_locked_out, public.check_child_pin,
  public.request_parent_token_hash FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.child_submit, public.child_redeem, public.is_parent,
  public.parent_unlock, public.parent_touch, public.parent_lock FROM anon, public;
GRANT EXECUTE ON FUNCTION public.child_submit, public.child_redeem, public.is_parent,
  public.parent_unlock, public.parent_touch, public.parent_lock TO authenticated;

-- 5) Row rules: everyone on the family device may read; only parent mode may change.
--    (child_seen_chores and child_goals stay writable: children set those themselves.)
DROP POLICY "owner all families" ON public.families;
CREATE POLICY "owner reads family" ON public.families FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "parent updates family" ON public.families FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.is_parent())
  WITH CHECK (owner_id = auth.uid() AND public.is_parent());

DROP POLICY "family children" ON public.children;
CREATE POLICY "family reads children" ON public.children FOR SELECT TO authenticated
  USING (family_id = public.my_family_id());
CREATE POLICY "parent inserts children" ON public.children FOR INSERT TO authenticated
  WITH CHECK (family_id = public.my_family_id() AND public.is_parent());
CREATE POLICY "parent updates children" ON public.children FOR UPDATE TO authenticated
  USING (family_id = public.my_family_id() AND public.is_parent())
  WITH CHECK (family_id = public.my_family_id() AND public.is_parent());
CREATE POLICY "parent deletes children" ON public.children FOR DELETE TO authenticated
  USING (family_id = public.my_family_id() AND public.is_parent());
-- PIN hashes change only through reset_child_pin.
REVOKE UPDATE ON public.children FROM authenticated;
GRANT UPDATE (name, avatar) ON public.children TO authenticated;

DROP POLICY "family chores" ON public.chores;
CREATE POLICY "family reads chores" ON public.chores FOR SELECT TO authenticated
  USING (family_id = public.my_family_id());
CREATE POLICY "parent inserts chores" ON public.chores FOR INSERT TO authenticated
  WITH CHECK (family_id = public.my_family_id() AND public.is_parent());
CREATE POLICY "parent updates chores" ON public.chores FOR UPDATE TO authenticated
  USING (family_id = public.my_family_id() AND public.is_parent())
  WITH CHECK (family_id = public.my_family_id() AND public.is_parent());
CREATE POLICY "parent deletes chores" ON public.chores FOR DELETE TO authenticated
  USING (family_id = public.my_family_id() AND public.is_parent());

DROP POLICY "family assignments" ON public.chore_assignments;
CREATE POLICY "family reads assignments" ON public.chore_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chores c WHERE c.id = chore_id AND c.family_id = public.my_family_id()));
CREATE POLICY "parent inserts assignments" ON public.chore_assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_parent()
    AND EXISTS (SELECT 1 FROM public.chores c WHERE c.id = chore_id AND c.family_id = public.my_family_id())
    AND EXISTS (SELECT 1 FROM public.children k WHERE k.id = child_id AND k.family_id = public.my_family_id()));
CREATE POLICY "parent updates assignments" ON public.chore_assignments FOR UPDATE TO authenticated
  USING (public.is_parent()
    AND EXISTS (SELECT 1 FROM public.chores c WHERE c.id = chore_id AND c.family_id = public.my_family_id()))
  WITH CHECK (public.is_parent()
    AND EXISTS (SELECT 1 FROM public.chores c WHERE c.id = chore_id AND c.family_id = public.my_family_id())
    AND EXISTS (SELECT 1 FROM public.children k WHERE k.id = child_id AND k.family_id = public.my_family_id()));
CREATE POLICY "parent deletes assignments" ON public.chore_assignments FOR DELETE TO authenticated
  USING (public.is_parent()
    AND EXISTS (SELECT 1 FROM public.chores c WHERE c.id = chore_id AND c.family_id = public.my_family_id()));

DROP POLICY "family completions update" ON public.completions;
DROP POLICY "family completions delete" ON public.completions;
CREATE POLICY "parent updates completions" ON public.completions FOR UPDATE TO authenticated
  USING (family_id = public.my_family_id() AND public.is_parent())
  WITH CHECK (family_id = public.my_family_id() AND public.is_parent());
CREATE POLICY "parent deletes completions" ON public.completions FOR DELETE TO authenticated
  USING (family_id = public.my_family_id() AND public.is_parent());

DROP POLICY "family rewards" ON public.rewards;
CREATE POLICY "family reads rewards" ON public.rewards FOR SELECT TO authenticated
  USING (family_id = public.my_family_id());
CREATE POLICY "parent inserts rewards" ON public.rewards FOR INSERT TO authenticated
  WITH CHECK (family_id = public.my_family_id() AND public.is_parent());
CREATE POLICY "parent updates rewards" ON public.rewards FOR UPDATE TO authenticated
  USING (family_id = public.my_family_id() AND public.is_parent())
  WITH CHECK (family_id = public.my_family_id() AND public.is_parent());
CREATE POLICY "parent deletes rewards" ON public.rewards FOR DELETE TO authenticated
  USING (family_id = public.my_family_id() AND public.is_parent());

DROP POLICY "family redemptions update" ON public.reward_redemptions;
DROP POLICY "family redemptions delete" ON public.reward_redemptions;
CREATE POLICY "parent updates redemptions" ON public.reward_redemptions FOR UPDATE TO authenticated
  USING (family_id = public.my_family_id() AND public.is_parent())
  WITH CHECK (family_id = public.my_family_id() AND public.is_parent());
CREATE POLICY "parent deletes redemptions" ON public.reward_redemptions FOR DELETE TO authenticated
  USING (family_id = public.my_family_id() AND public.is_parent());
