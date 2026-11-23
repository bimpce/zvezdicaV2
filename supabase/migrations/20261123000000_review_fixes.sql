-- Review fixes: keep earned/spent points when chores or rewards are removed, stop
-- double-spending and out-of-period submissions, and scope point lookups to the family.

-- 1) Archived chores. Deleting a chore used to cascade to its completions, which silently
--    erased points a child had already earned. Chores with history are now archived instead.
ALTER TABLE public.chores ADD COLUMN archived_at timestamptz;

-- Completions / redemptions no longer disappear with their chore / reward. NO ACTION (not
-- RESTRICT) is checked at the end of the statement, so deleting a whole child or family,
-- which cascades through both tables at once, still works.
ALTER TABLE public.completions
  DROP CONSTRAINT completions_chore_id_fkey,
  ADD CONSTRAINT completions_chore_id_fkey
    FOREIGN KEY (chore_id) REFERENCES public.chores(id) ON DELETE NO ACTION;
ALTER TABLE public.reward_redemptions
  DROP CONSTRAINT reward_redemptions_reward_id_fkey,
  ADD CONSTRAINT reward_redemptions_reward_id_fkey
    FOREIGN KEY (reward_id) REFERENCES public.rewards(id) ON DELETE NO ACTION;

-- 2) Period key computed the same way as src/lib/periods.ts.
CREATE OR REPLACE FUNCTION public.period_key_for(_freq public.chore_frequency, _d date)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _freq
    WHEN 'once' THEN 'once'
    WHEN 'daily' THEN to_char(_d, 'YYYY-MM-DD')
    WHEN 'weekly' THEN to_char(_d, 'IYYY-"W"IW')
    WHEN 'monthly' THEN to_char(_d, 'YYYY-MM')
    WHEN 'yearly' THEN to_char(_d, 'YYYY')
  END
$$;

-- 3) child_submit: only the current period (±1 day for device time zones), only active,
--    non-archived chores. Before, any period key was accepted, so one daily chore could be
--    submitted for many past/future days.
CREATE OR REPLACE FUNCTION public.child_submit(_child_id uuid, _pin text, _chore_id uuid, _period_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE ch public.chores%rowtype;
BEGIN
  IF NOT public.verify_child_pin(_child_id, _pin) THEN RAISE EXCEPTION 'Napačen PIN'; END IF;
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
  INSERT INTO public.completions(family_id, chore_id, child_id, period_key, points)
  VALUES (ch.family_id, ch.id, _child_id, _period_key, ch.points)
  ON CONFLICT (chore_id, child_id, period_key) DO UPDATE
    SET status = 'pending', note = null, submitted_at = now(), reviewed_at = null, points = excluded.points
    WHERE public.completions.status = 'rejected';
END $$;

-- 4) child_available_points: only children of the caller's family.
CREATE OR REPLACE FUNCTION public.child_available_points(_child_id uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT sum(points) FROM public.completions
                   WHERE child_id = _child_id AND family_id = public.my_family_id()
                     AND status = 'approved'), 0)::int
       - COALESCE((SELECT sum(points) FROM public.reward_redemptions
                   WHERE child_id = _child_id AND family_id = public.my_family_id()
                     AND status IN ('pending','approved')), 0)::int
$$;

-- 5) child_redeem: lock the child row so two quick taps (or two devices) cannot both pass
--    the balance check and spend the same points twice.
CREATE OR REPLACE FUNCTION public.child_redeem(_child_id uuid, _pin text, _reward_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r public.rewards%rowtype;
BEGIN
  IF NOT public.verify_child_pin(_child_id, _pin) THEN RAISE EXCEPTION 'Napačen PIN'; END IF;
  PERFORM 1 FROM public.children WHERE id = _child_id FOR UPDATE;
  SELECT * INTO r FROM public.rewards WHERE id = _reward_id AND family_id = public.my_family_id() AND active
    AND (child_id IS NULL OR child_id = _child_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Nagrada ni na voljo'; END IF;
  IF public.child_available_points(_child_id) < r.points THEN RAISE EXCEPTION 'Premalo točk'; END IF;
  INSERT INTO public.reward_redemptions(family_id, reward_id, child_id, points)
  VALUES (r.family_id, r.id, _child_id, r.points);
END $$;

REVOKE EXECUTE ON FUNCTION public.child_submit, public.child_available_points, public.child_redeem FROM anon, public;
GRANT EXECUTE ON FUNCTION public.child_submit, public.child_available_points, public.child_redeem TO authenticated;

-- 6) Indexes for the row-level-security filters and per-child lookups.
CREATE INDEX IF NOT EXISTS completions_family_submitted_idx ON public.completions (family_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS completions_child_idx ON public.completions (child_id);
CREATE INDEX IF NOT EXISTS redemptions_family_requested_idx ON public.reward_redemptions (family_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS redemptions_child_idx ON public.reward_redemptions (child_id);
CREATE INDEX IF NOT EXISTS chores_family_idx ON public.chores (family_id);
CREATE INDEX IF NOT EXISTS children_family_idx ON public.children (family_id);
CREATE INDEX IF NOT EXISTS rewards_family_idx ON public.rewards (family_id);
