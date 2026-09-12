CREATE TABLE public.daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date date NOT NULL,
  timezone_offset_minutes integer NOT NULL CHECK (timezone_offset_minutes BETWEEN -840 AND 840),
  stayed_addiction_free boolean NOT NULL,
  streak_after integer NOT NULL DEFAULT 0 CHECK (streak_after >= 0),
  xp_awarded integer NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);

GRANT SELECT, INSERT ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily checkins"
ON public.daily_checkins FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily checkins"
ON public.daily_checkins FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.record_daily_checkin(
  _checkin_date date,
  _timezone_offset_minutes integer,
  _stayed_addiction_free boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _previous_date date;
  _previous_streak integer := 0;
  _streak integer := 0;
  _xp integer := 0;
  _message text;
  _existing public.daily_checkins%ROWTYPE;
  _new_xp integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _timezone_offset_minutes NOT BETWEEN -840 AND 840 THEN
    RAISE EXCEPTION 'Invalid timezone offset';
  END IF;
  IF _checkin_date < current_date - 1 OR _checkin_date > current_date + 1 THEN
    RAISE EXCEPTION 'Check-in date is outside the allowed range';
  END IF;

  SELECT * INTO _existing
  FROM public.daily_checkins
  WHERE user_id = _user_id AND checkin_date = _checkin_date;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'already_checked_in', true,
      'streak', _existing.streak_after,
      'xp_awarded', 0,
      'message', _existing.message,
      'stayed_addiction_free', _existing.stayed_addiction_free
    );
  END IF;

  SELECT checkin_date, streak_after
  INTO _previous_date, _previous_streak
  FROM public.daily_checkins
  WHERE user_id = _user_id
    AND checkin_date < _checkin_date
  ORDER BY checkin_date DESC
  LIMIT 1;

  IF _stayed_addiction_free THEN
    IF _previous_date = _checkin_date - 1 THEN
      _streak := _previous_streak + 1;
    ELSE
      _streak := 1;
    END IF;
    _xp := 20;
    _message := CASE
      WHEN _streak = 1 THEN 'You chose yourself today. That is a powerful start.'
      WHEN _streak = 3 THEN 'Three days strong. Your new rhythm is taking shape.'
      WHEN _streak = 7 THEN 'One full week! Your consistency is something to be proud of.'
      WHEN _streak = 14 THEN 'Two weeks strong. You are building real momentum.'
      WHEN _streak = 30 THEN 'Thirty days! This is a huge milestone—keep choosing your future.'
      WHEN _streak = 90 THEN 'Ninety days. Your courage and consistency are extraordinary.'
      ELSE 'Another day checked in. Keep going—you are doing something meaningful.'
    END;
  ELSE
    _message := 'Thank you for being honest. One difficult day does not erase your progress. Begin again tomorrow.';
  END IF;

  INSERT INTO public.daily_checkins (
    user_id, checkin_date, timezone_offset_minutes, stayed_addiction_free,
    streak_after, xp_awarded, message
  ) VALUES (
    _user_id, _checkin_date, _timezone_offset_minutes, _stayed_addiction_free,
    _streak, _xp, _message
  );

  IF _xp > 0 THEN
    UPDATE public.profiles
    SET xp = xp + _xp,
        level = GREATEST(1, floor((xp + _xp) / 100.0)::integer + 1),
        updated_at = now()
    WHERE user_id = _user_id
    RETURNING xp INTO _new_xp;
  END IF;

  RETURN jsonb_build_object(
    'already_checked_in', false,
    'streak', _streak,
    'xp_awarded', _xp,
    'message', _message,
    'stayed_addiction_free', _stayed_addiction_free
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_daily_checkin(date, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_daily_checkin(date, integer, boolean) TO authenticated, service_role;