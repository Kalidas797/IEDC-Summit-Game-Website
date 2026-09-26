-- Add email and college_name to players table
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS college_name TEXT;

-- Create a unique constraint on email so that if a player registers again
-- with the same email, we can identify them and prevent duplicates
ALTER TABLE public.players 
ADD CONSTRAINT players_email_key UNIQUE (email);
