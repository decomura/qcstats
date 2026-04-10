/**
 * Run this script to create the community wall tables.
 * Usage: npx tsx scripts/migrate-wall.ts
 */

const SUPABASE_URL = "https://lyhtzgiipwznigexqxxw.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aHR6Z2lpcHd6bmlnZXhxeHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc2NTQ1OCwiZXhwIjoyMDkxMzQxNDU4fQ.jQ2j_-yIEiCHWsshxTS8xYukve2iiAdYQ5OM8QQiSGU";

const SQL = `
-- Match comments table
CREATE TABLE IF NOT EXISTS match_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE match_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read comments') THEN
    CREATE POLICY "Anyone can read comments" ON match_comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can insert comments') THEN
    CREATE POLICY "Auth users can insert comments" ON match_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own comments') THEN
    CREATE POLICY "Users can delete own comments" ON match_comments FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comments_match ON match_comments(match_id, created_at);

-- Match reactions table
CREATE TABLE IF NOT EXISTS match_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN (
    'rocket', 'nailgun', 'quad_damage', 'quake', 'lightning', 'railgun', 'frag', 'gg'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_id, reaction_type)
);

ALTER TABLE match_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read reactions') THEN
    CREATE POLICY "Anyone can read reactions" ON match_reactions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can insert reactions') THEN
    CREATE POLICY "Auth users can insert reactions" ON match_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own reactions') THEN
    CREATE POLICY "Users can delete own reactions" ON match_reactions FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reactions_match ON match_reactions(match_id);

-- Add description column to matches
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'description') THEN
    ALTER TABLE matches ADD COLUMN description TEXT DEFAULT '';
  END IF;
END $$;
`;

async function runMigration() {
  console.log("🔧 Running Community Wall migration...");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({}),
  });

  // Use the SQL endpoint directly via PostgREST
  // Actually, we need to use the Supabase Management API or pg directly
  // Let's use the PostgREST /rpc approach or direct pg

  // Use Supabase's built-in SQL execution through the dashboard API
  const sqlResponse = await fetch(`${SUPABASE_URL}/pg`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: SQL }),
  });

  if (!sqlResponse.ok) {
    // Fallback: create an RPC function first, then call it
    console.log("Direct SQL not available, trying pg_net approach...");
    
    // Try using the pg adapter
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Execute SQL statements one by one
    const statements = SQL.split(/;\s*\n/).filter(s => s.trim().length > 0);
    
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      
      console.log(`  Executing: ${trimmed.substring(0, 60)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql_text: trimmed + ';' });
      
      if (error) {
        console.log(`  ⚠️  RPC not available: ${error.message}`);
        break;
      }
    }
  }

  console.log("Migration script finished. If errors occurred, please run the SQL manually in Supabase SQL Editor.");
}

runMigration().catch(console.error);
