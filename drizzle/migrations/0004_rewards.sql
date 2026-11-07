CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title text NOT NULL,
  emoji text NOT NULL DEFAULT '🎁',
  points integer NOT NULL DEFAULT 50 CHECK (points > 0),
  child_id uuid REFERENCES public.children(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family rewards" ON public.rewards FOR ALL TO authenticated
  USING (family_id = public.my_family_id()) WITH CHECK (family_id = public.my_family_id());

CREATE TABLE public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  points integer NOT NULL,
  status public.completion_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, UPDATE, DELETE ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family redemptions read" ON public.reward_redemptions FOR SELECT TO authenticated USING (family_id = public.my_family_id());
CREATE POLICY "family redemptions update" ON public.reward_redemptions FOR UPDATE TO authenticated USING (family_id = public.my_family_id()) WITH CHECK (family_id = public.my_family_id());
CREATE POLICY "family redemptions delete" ON public.reward_redemptions FOR DELETE TO authenticated USING (family_id = public.my_family_id());

CREATE TABLE public.child_goals (
  child_id uuid PRIMARY KEY REFERENCES public.children(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  set_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_goals TO authenticated;
GRANT ALL ON public.child_goals TO service_role;
ALTER TABLE public.child_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family goals" ON public.child_goals FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_goals.child_id AND c.family_id = public.my_family_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_goals.child_id AND c.family_id = public.my_family_id()));

CREATE OR REPLACE FUNCTION public.child_available_points(_child_id uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT sum(points) FROM public.completions WHERE child_id = _child_id AND status = 'approved'), 0)::int
       - COALESCE((SELECT sum(points) FROM public.reward_redemptions WHERE child_id = _child_id AND status IN ('pending','approved')), 0)::int
$$;

CREATE OR REPLACE FUNCTION public.child_redeem(_child_id uuid, _pin text, _reward_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r public.rewards%rowtype;
BEGIN
  IF NOT public.verify_child_pin(_child_id, _pin) THEN RAISE EXCEPTION 'Napačen PIN'; END IF;
  SELECT * INTO r FROM public.rewards WHERE id = _reward_id AND family_id = public.my_family_id() AND active
    AND (child_id IS NULL OR child_id = _child_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Nagrada ni na voljo'; END IF;
  IF public.child_available_points(_child_id) < r.points THEN RAISE EXCEPTION 'Premalo točk'; END IF;
  INSERT INTO public.reward_redemptions(family_id, reward_id, child_id, points) VALUES (r.family_id, r.id, _child_id, r.points);
END $$;

REVOKE EXECUTE ON FUNCTION public.child_available_points, public.child_redeem FROM anon, public;
GRANT EXECUTE ON FUNCTION public.child_available_points, public.child_redeem TO authenticated;