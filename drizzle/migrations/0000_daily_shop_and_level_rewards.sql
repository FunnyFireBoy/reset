ALTER TABLE public.shop_items
ADD COLUMN rarity text NOT NULL DEFAULT 'common'
CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'));

UPDATE public.shop_items SET rarity = CASE name
  WHEN 'Cloud Sprite' THEN 'common'
  WHEN 'First Step' THEN 'common'
  WHEN 'Ember Fox' THEN 'uncommon'
  WHEN 'Week Warrior' THEN 'uncommon'
  WHEN 'Aqua Whale' THEN 'rare'
  WHEN 'Trigger Tamer' THEN 'rare'
  WHEN 'Steel Golem' THEN 'epic'
  WHEN 'Iron Will' THEN 'epic'
  WHEN 'Phoenix' THEN 'legendary'
  WHEN 'Crown of Clarity' THEN 'legendary'
  ELSE 'common'
END;

CREATE TABLE public.level_reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  level integer NOT NULL CHECK (level >= 2),
  gems_awarded integer NOT NULL CHECK (gems_awarded >= 0),
  reward_kind text CHECK (reward_kind IN ('character', 'badge')),
  reward_name text,
  reward_emoji text,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, level)
);
GRANT SELECT ON public.level_reward_claims TO authenticated;
GRANT ALL ON public.level_reward_claims TO service_role;
ALTER TABLE public.level_reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own level rewards"
ON public.level_reward_claims FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.buy_shop_item(_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _item public.shop_items%ROWTYPE;
  _profile public.profiles%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text || 'shop'));

  SELECT * INTO _item FROM public.shop_items WHERE id = _item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.purchases WHERE user_id = _user_id AND item_id = _item_id) THEN
    RETURN jsonb_build_object('already_owned', true, 'gems', _profile.gems);
  END IF;
  IF _profile.level < _item.min_level THEN RAISE EXCEPTION 'Reach level % first', _item.min_level; END IF;
  IF _profile.gems < _item.price_gems THEN RAISE EXCEPTION 'Not enough gems yet'; END IF;

  INSERT INTO public.purchases (user_id, item_id) VALUES (_user_id, _item_id);
  UPDATE public.profiles
  SET gems = gems - _item.price_gems, updated_at = now()
  WHERE user_id = _user_id
  RETURNING * INTO _profile;

  RETURN jsonb_build_object('already_owned', false, 'gems', _profile.gems, 'item_name', _item.name);
END;
$$;
REVOKE ALL ON FUNCTION public.buy_shop_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_shop_item(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_level_rewards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _level integer;
  _current_level integer;
  _gems integer;
  _total_gems integer := 0;
  _kind text;
  _name text;
  _emoji text;
  _claimed integer := 0;
  _characters text[] := ARRAY['Nova Scout', 'Pulse Ranger', 'Sky Sentinel', 'Comet Keeper', 'Aurora Guardian', 'Zenith Voyager'];
  _character_emojis text[] := ARRAY['🧑‍🚀', '🦸', '🪽', '☄️', '🛡️', '🌠'];
  _badges text[] := ARRAY['Clarity Crest', 'Momentum Medal', 'Resolve Emblem', 'Streak Star', 'Victory Sigil', 'Reset Legend'];
  _badge_emojis text[] := ARRAY['🔷', '🏅', '💠', '⭐', '🏆', '💎'];
  _index integer;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text || 'level-rewards'));

  SELECT level INTO _current_level FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  FOR _level IN 2.._current_level LOOP
    IF NOT EXISTS (SELECT 1 FROM public.level_reward_claims WHERE user_id = _user_id AND level = _level) THEN
      _gems := 40 + _level * 12 + CASE WHEN _level % 10 = 0 THEN _level * 8 ELSE 0 END;
      _kind := NULL; _name := NULL; _emoji := NULL;
      IF _level % 10 = 0 THEN
        _index := ((_level / 10 - 1) % array_length(_badges, 1)) + 1;
        _kind := 'badge'; _name := _badges[_index] || ' ' || _level; _emoji := _badge_emojis[_index];
      ELSIF _level % 5 = 0 THEN
        _index := ((_level / 5 - 1) % array_length(_characters, 1)) + 1;
        _kind := 'character'; _name := _characters[_index] || ' ' || _level; _emoji := _character_emojis[_index];
      END IF;

      INSERT INTO public.level_reward_claims (user_id, level, gems_awarded, reward_kind, reward_name, reward_emoji)
      VALUES (_user_id, _level, _gems, _kind, _name, _emoji);
      _total_gems := _total_gems + _gems;
      _claimed := _claimed + 1;
    END IF;
  END LOOP;

  IF _total_gems > 0 THEN
    UPDATE public.profiles SET gems = gems + _total_gems, updated_at = now() WHERE user_id = _user_id;
  END IF;

  RETURN jsonb_build_object('claimed_levels', _claimed, 'gems_awarded', _total_gems);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_level_rewards() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_level_rewards() TO authenticated, service_role;

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
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO _goal FROM public.goals WHERE id = _goal_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quest not found'; END IF;
  SELECT level INTO _old_level FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF _goal.completed THEN
    SELECT xp, gems, level INTO _new_xp, _new_gems, _new_level FROM public.profiles WHERE user_id = _user_id;
    RETURN jsonb_build_object('already_completed', true, 'xp', _new_xp, 'gems', _new_gems, 'level', _new_level, 'leveled_up', false);
  END IF;
  UPDATE public.goals SET completed = true, completed_at = now() WHERE id = _goal.id;
  UPDATE public.profiles
  SET xp = xp + _goal.xp_reward,
      gems = gems + _goal.gem_reward,
      level = GREATEST(1, floor((xp + _goal.xp_reward) / 100.0)::integer + 1),
      updated_at = now()
  WHERE user_id = _user_id
  RETURNING xp, gems, level INTO _new_xp, _new_gems, _new_level;
  RETURN jsonb_build_object('already_completed', false, 'xp', _new_xp, 'gems', _new_gems, 'level', _new_level, 'leveled_up', _new_level > COALESCE(_old_level, 1));
END;
$$;
REVOKE ALL ON FUNCTION public.complete_goal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_goal(uuid) TO authenticated, service_role;

REVOKE INSERT, UPDATE, DELETE ON public.purchases FROM authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, addiction_type, triggers, years_addicted, frequency, onboarded, active_character, updated_at) ON public.profiles TO authenticated;