-- Migration: Add Rock Paper Scissors
INSERT INTO public.games (id, slug, name, description, enabled, display_order)
VALUES (
  gen_random_uuid(),
  'rock-paper-scissors',
  'Rock Paper Scissors',
  'Choose your move and beat the computer!',
  true,
  10
) ON CONFLICT (slug) DO NOTHING;
