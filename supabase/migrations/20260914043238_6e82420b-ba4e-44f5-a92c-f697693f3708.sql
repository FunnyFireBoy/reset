ALTER TABLE public.goals
ADD COLUMN quest_date date;

CREATE INDEX goals_user_quest_date
ON public.goals (user_id, quest_date DESC, created_at DESC);

CREATE TABLE public.daily_quest_batches (
  user_id uuid NOT NULL,
  quest_date date NOT NULL,
  status text NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_quest_batches TO authenticated;
GRANT ALL ON public.daily_quest_batches TO service_role;

ALTER TABLE public.daily_quest_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily quest batches"
ON public.daily_quest_batches FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily quest batches"
ON public.daily_quest_batches FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily quest batches"
ON public.daily_quest_batches FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily quest batches"
ON public.daily_quest_batches FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.complete_goal(_goal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _goal public.goals%ROWTYPE;
  _old_level integer;
  _new_xp integer;
  _new_gems integer;
  _new_level integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _goal
  FROM public.goals
  WHERE id = _goal_id AND user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quest not found';
  END IF;

  SELECT level INTO _old_level
  FROM public.profiles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _goal.completed THEN
    SELECT xp, gems, level INTO _new_xp, _new_gems, _new_level
    FROM public.profiles
    WHERE user_id = _user_id;

    RETURN jsonb_build_object(
      'already_completed', true,
      'xp', _new_xp,
      'gems', _new_gems,
      'level', _new_level,
      'leveled_up', false
    );
  END IF;

  UPDATE public.goals
  SET completed = true, completed_at = now()
  WHERE id = _goal.id;

  UPDATE public.profiles
  SET xp = xp + _goal.xp_reward,
      gems = gems + _goal.gem_reward,
      level = GREATEST(1, floor((xp + _goal.xp_reward) / 100.0)::integer + 1),
      updated_at = now()
  WHERE user_id = _user_id
  RETURNING xp, gems, level INTO _new_xp, _new_gems, _new_level;

  RETURN jsonb_build_object(
    'already_completed', false,
    'xp', _new_xp,
    'gems', _new_gems,
    'level', _new_level,
    'leveled_up', _new_level > COALESCE(_old_level, 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_goal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_goal(uuid) TO authenticated, service_role;