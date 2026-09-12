CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT 'Recruit',
  gems integer NOT NULL DEFAULT 100,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  addiction_type text,
  triggers text,
  years_addicted text,
  frequency text,
  onboarded boolean NOT NULL DEFAULT false,
  active_character text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'activity',
  xp_reward integer NOT NULL DEFAULT 10,
  gem_reward integer NOT NULL DEFAULT 25,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL,
  emoji text NOT NULL,
  price_gems integer NOT NULL,
  min_level integer NOT NULL DEFAULT 1,
  blurb text
);
GRANT SELECT ON public.shop_items TO authenticated, anon;
GRANT ALL ON public.shop_items TO service_role;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalogue is public" ON public.shop_items FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own purchases" ON public.purchases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Recruit'))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.shop_items (name, kind, emoji, price_gems, min_level, blurb) VALUES
('Cloud Sprite', 'character', '☁️', 150, 1, 'A calm companion for early days.'),
('Ember Fox', 'character', '🦊', 400, 2, 'Burns through cravings with you.'),
('Steel Golem', 'character', '🗿', 900, 4, 'Unshakeable. Like your streak.'),
('Phoenix', 'character', '🔥', 1800, 6, 'Rise again, every single time.'),
('Aqua Whale', 'character', '🐋', 700, 3, 'Deep breaths, deep calm.'),
('First Step', 'badge', '👣', 75, 1, 'You started. That is the hardest part.'),
('Week Warrior', 'badge', '🛡️', 250, 2, 'Seven days of showing up.'),
('Trigger Tamer', 'badge', '🎯', 500, 3, 'You named it, you beat it.'),
('Iron Will', 'badge', '⚙️', 1200, 5, 'Discipline over impulse.'),
('Crown of Clarity', 'badge', '👑', 2500, 7, 'The highest honour on the path.');