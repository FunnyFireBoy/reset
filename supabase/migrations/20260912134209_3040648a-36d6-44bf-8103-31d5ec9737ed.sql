CREATE TABLE public.recovery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('quit', 'relapse')),
  event_date date NOT NULL,
  timezone_offset_minutes integer NOT NULL CHECK (timezone_offset_minutes BETWEEN -840 AND 840),
  note text CHECK (char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.recovery_events TO authenticated;
GRANT ALL ON public.recovery_events TO service_role;

ALTER TABLE public.recovery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recovery events"
ON public.recovery_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE UNIQUE INDEX recovery_events_one_type_per_day
ON public.recovery_events (user_id, event_date, event_type);

CREATE INDEX recovery_events_user_timeline
ON public.recovery_events (user_id, event_date DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.start_recovery_attempt(
  _user_id uuid,
  _quit_date date,
  _timezone_offset_minutes integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _latest_type text;
  _latest_date date;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'User required'; END IF;
  IF _timezone_offset_minutes NOT BETWEEN -840 AND 840 THEN RAISE EXCEPTION 'Invalid timezone offset'; END IF;
  IF _quit_date < date '1900-01-01' OR _quit_date > current_date + 1 THEN
    RAISE EXCEPTION 'Quit date is outside the allowed range';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text || 'recovery'));

  SELECT event_type, event_date INTO _latest_type, _latest_date
  FROM public.recovery_events
  WHERE user_id = _user_id
  ORDER BY event_date DESC, created_at DESC
  LIMIT 1;

  IF _latest_type = 'quit' THEN
    RAISE EXCEPTION 'A recovery attempt is already active';
  END IF;
  IF _latest_date IS NOT NULL AND _quit_date < _latest_date THEN
    RAISE EXCEPTION 'A new quit date cannot be before the last relapse';
  END IF;

  INSERT INTO public.recovery_events (user_id, event_type, event_date, timezone_offset_minutes)
  VALUES (_user_id, 'quit', _quit_date, _timezone_offset_minutes)
  ON CONFLICT (user_id, event_date, event_type) DO NOTHING;

  RETURN jsonb_build_object(
    'active', true,
    'quit_date', _quit_date,
    'days_addiction_free', GREATEST(0, (current_date - _quit_date))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_recovery_attempt(uuid, date, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_recovery_attempt(uuid, date, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.log_recovery_relapse(
  _user_id uuid,
  _relapse_date date,
  _timezone_offset_minutes integer,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _latest_type text;
  _quit_date date;
  _xp_removed integer := 0;
  _clean_note text;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'User required'; END IF;
  IF _timezone_offset_minutes NOT BETWEEN -840 AND 840 THEN RAISE EXCEPTION 'Invalid timezone offset'; END IF;
  IF _relapse_date < current_date - 1 OR _relapse_date > current_date + 1 THEN
    RAISE EXCEPTION 'Relapse date is outside the allowed range';
  END IF;

  _clean_note := NULLIF(btrim(COALESCE(_note, '')), '');
  IF char_length(_clean_note) > 500 THEN RAISE EXCEPTION 'Note is too long'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text || 'recovery'));
  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text || _relapse_date::text));

  SELECT event_type, event_date INTO _latest_type, _quit_date
  FROM public.recovery_events
  WHERE user_id = _user_id
  ORDER BY event_date DESC, created_at DESC
  LIMIT 1;

  IF _latest_type IS DISTINCT FROM 'quit' OR _quit_date > _relapse_date THEN
    RAISE EXCEPTION 'There is no active recovery attempt for this date';
  END IF;

  INSERT INTO public.recovery_events (user_id, event_type, event_date, timezone_offset_minutes, note)
  VALUES (_user_id, 'relapse', _relapse_date, _timezone_offset_minutes, _clean_note)
  ON CONFLICT (user_id, event_date, event_type) DO NOTHING;

  SELECT xp_awarded INTO _xp_removed
  FROM public.daily_checkins
  WHERE user_id = _user_id AND checkin_date = _relapse_date
  FOR UPDATE;
  _xp_removed := COALESCE(_xp_removed, 0);

  INSERT INTO public.daily_checkins (
    user_id, checkin_date, timezone_offset_minutes, stayed_addiction_free,
    streak_after, xp_awarded, message
  ) VALUES (
    _user_id, _relapse_date, _timezone_offset_minutes, false,
    0, 0, 'Thank you for being honest. A relapse does not erase your progress. You can begin again when you are ready.'
  )
  ON CONFLICT (user_id, checkin_date) DO UPDATE SET
    timezone_offset_minutes = EXCLUDED.timezone_offset_minutes,
    stayed_addiction_free = false,
    streak_after = 0,
    xp_awarded = 0,
    message = EXCLUDED.message;

  IF _xp_removed > 0 THEN
    UPDATE public.profiles SET
      xp = GREATEST(0, xp - _xp_removed),
      level = GREATEST(1, floor(GREATEST(0, xp - _xp_removed) / 100.0)::integer + 1),
      updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  RETURN jsonb_build_object(
    'active', false,
    'relapse_date', _relapse_date,
    'attempt_days', GREATEST(0, (_relapse_date - _quit_date)),
    'xp_removed', _xp_removed,
    'message', 'A relapse does not erase the days you chose recovery. Be kind to yourself and restart when you are ready.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_recovery_relapse(uuid, date, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_recovery_relapse(uuid, date, integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_daily_checkin(
  _user_id uuid,
  _checkin_date date,
  _timezone_offset_minutes integer,
  _stayed_addiction_free boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _previous_date date;
  _previous_streak integer := 0;
  _streak integer := 0;
  _xp integer := 0;
  _message text;
  _existing public.daily_checkins%ROWTYPE;
  _latest_type text;
  _quit_date date;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'User required'; END IF;
  IF _timezone_offset_minutes NOT BETWEEN -840 AND 840 THEN RAISE EXCEPTION 'Invalid timezone offset'; END IF;
  IF _checkin_date < current_date - 1 OR _checkin_date > current_date + 1 THEN
    RAISE EXCEPTION 'Check-in date is outside the allowed range';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text || 'recovery'));
  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text || _checkin_date::text));

  SELECT event_type, event_date INTO _latest_type, _quit_date
  FROM public.recovery_events
  WHERE user_id = _user_id
  ORDER BY event_date DESC, created_at DESC
  LIMIT 1;

  IF _latest_type IS DISTINCT FROM 'quit' OR _quit_date > _checkin_date THEN
    RAISE EXCEPTION 'Start a recovery attempt before checking in';
  END IF;

  SELECT * INTO _existing FROM public.daily_checkins
  WHERE user_id = _user_id AND checkin_date = _checkin_date;

  IF FOUND THEN
    RETURN jsonb_build_object('already_checked_in', true, 'streak', _existing.streak_after,
      'xp_awarded', 0, 'message', _existing.message,
      'stayed_addiction_free', _existing.stayed_addiction_free);
  END IF;

  SELECT checkin_date, streak_after INTO _previous_date, _previous_streak
  FROM public.daily_checkins
  WHERE user_id = _user_id AND checkin_date < _checkin_date
    AND checkin_date >= _quit_date
  ORDER BY checkin_date DESC LIMIT 1;

  IF _stayed_addiction_free THEN
    _streak := CASE
      WHEN _previous_date = _checkin_date - 1 THEN _previous_streak + 1
      ELSE 1
    END;
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
    _message := 'Thank you for being honest. A relapse does not erase your progress. You can begin again when you are ready.';
    INSERT INTO public.recovery_events (user_id, event_type, event_date, timezone_offset_minutes)
    VALUES (_user_id, 'relapse', _checkin_date, _timezone_offset_minutes)
    ON CONFLICT (user_id, event_date, event_type) DO NOTHING;
  END IF;

  INSERT INTO public.daily_checkins (user_id, checkin_date, timezone_offset_minutes,
    stayed_addiction_free, streak_after, xp_awarded, message)
  VALUES (_user_id, _checkin_date, _timezone_offset_minutes,
    _stayed_addiction_free, _streak, _xp, _message);

  IF _xp > 0 THEN
    UPDATE public.profiles SET xp = xp + _xp,
      level = GREATEST(1, floor((xp + _xp) / 100.0)::integer + 1), updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  RETURN jsonb_build_object('already_checked_in', false, 'streak', _streak,
    'xp_awarded', _xp, 'message', _message,
    'stayed_addiction_free', _stayed_addiction_free);
END;
$$;

REVOKE ALL ON FUNCTION public.record_daily_checkin(uuid, date, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_daily_checkin(uuid, date, integer, boolean) TO service_role;