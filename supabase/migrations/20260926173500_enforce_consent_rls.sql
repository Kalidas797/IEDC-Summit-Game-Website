DROP POLICY IF EXISTS "Public can insert players" ON players;
CREATE POLICY "Public can insert players" ON players FOR INSERT WITH CHECK (consent_given = true);
