-- PaperLab Games Arena - Supabase Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. COLLEGES
-- ==========================================
CREATE TABLE colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. PLAYERS
-- ==========================================
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname TEXT NOT NULL,
    college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. GAMES
-- ==========================================
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. GAME CONTENT
-- ==========================================
CREATE TABLE game_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT,
    difficulty TEXT DEFAULT 'MEDIUM',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    storage_path TEXT,
    thumbnail_path TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. GAME SESSIONS
-- ==========================================
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'playing' -- 'playing', 'completed', 'abandoned'
);

-- ==========================================
-- 6. SCORES
-- ==========================================
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
    score INTEGER NOT NULL,
    time_ms INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 7. EVENT SETTINGS
-- ==========================================
CREATE TABLE event_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    event_name TEXT DEFAULT 'PAPERLAB GAMES ARENA',
    attract_mode BOOLEAN DEFAULT true,
    featured_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    cta_text TEXT DEFAULT 'CURIOUS ABOUT PAPERLAB?',
    qr_code_url TEXT DEFAULT 'https://paperlab.app',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('game-assets', 'game-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('game-documents', 'game-documents', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('game-content', 'game-content', true) ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- REALTIME
-- ==========================================
-- Allow realtime subscriptions on scores, event_settings, games, and game_content
alter publication supabase_realtime add table scores;
alter publication supabase_realtime add table event_settings;
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table colleges;
alter publication supabase_realtime add table game_content;

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;

-- Public can read everything except inactive content
CREATE POLICY "Public can read colleges" ON colleges FOR SELECT USING (true);
CREATE POLICY "Public can read players" ON players FOR SELECT USING (true);
CREATE POLICY "Public can read games" ON games FOR SELECT USING (true);
CREATE POLICY "Public can read active game content" ON game_content FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read sessions" ON game_sessions FOR SELECT USING (true);
CREATE POLICY "Public can read scores" ON scores FOR SELECT USING (true);
CREATE POLICY "Public can read event_settings" ON event_settings FOR SELECT USING (true);

-- Admin policies (requires auth)
CREATE POLICY "Admins can manage colleges" ON colleges FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage players" ON players FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage games" ON games FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage game content" ON game_content FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage sessions" ON game_sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage scores" ON scores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage event_settings" ON event_settings FOR ALL USING (auth.role() = 'authenticated');

-- Public can insert (players, sessions, scores)
CREATE POLICY "Public can insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can insert colleges" ON colleges FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can insert sessions" ON game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update own sessions" ON game_sessions FOR UPDATE USING (true);
CREATE POLICY "Public can insert scores" ON scores FOR INSERT WITH CHECK (true);

-- Storage RLS
CREATE POLICY "Public can read game-assets" ON storage.objects FOR SELECT USING (bucket_id = 'game-assets');
CREATE POLICY "Public can read game-documents" ON storage.objects FOR SELECT USING (bucket_id = 'game-documents');
CREATE POLICY "Public can read game-content" ON storage.objects FOR SELECT USING (bucket_id = 'game-content');
CREATE POLICY "Admins can manage all storage" ON storage.objects FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- SEED DATA
-- ==========================================
INSERT INTO games (slug, name, description, display_order) VALUES
('reaction', 'Reaction Challenge', 'Test your reflexes. How fast are you?', 1),
('memory', 'Remember the Paper', 'Memorize the document before it vanishes.', 2),
('ai-or-human', 'AI or Human?', 'Can you spot the difference?', 3),
('spot-difference', 'Spot the Difference', 'Find the 5 changes.', 4),
('doodle', 'Doodle Telephone', 'Draw, guess, and pass it on.', 5),
('what-changed', 'What Changed?', 'Identify the altered elements.', 6),
('crossword', 'Crossword', 'Casual general knowledge crossword.', 7),
('tic-tac-toe', 'Tic-Tac-Toe', 'Classic 3x3 challenge.', 8)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO event_settings (id, event_name) VALUES ('default', 'PAPERLAB GAMES ARENA') ON CONFLICT DO NOTHING;
