CREATE TABLE public.child_seen_chores (
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  chore_id uuid NOT NULL REFERENCES public.chores(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, chore_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_seen_chores TO authenticated;
GRANT ALL ON public.child_seen_chores TO service_role;
ALTER TABLE public.child_seen_chores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family seen chores" ON public.child_seen_chores FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.family_id = public.my_family_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.family_id = public.my_family_id()));