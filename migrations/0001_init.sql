-- Sententia user persistence (Clerk user ID scoped)

CREATE TABLE IF NOT EXISTS taste_profiles (
  clerk_user_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  genre_affinity TEXT,
  mood_affinity TEXT,
  runtime_affinity TEXT,
  type_affinity TEXT,
  language_affinity TEXT,
  provider_affinity TEXT,
  liked_ids TEXT,
  rejected_ids TEXT,
  seen_ids TEXT,
  preferred_type TEXT,
  session_count INTEGER NOT NULL DEFAULT 0,
  last_chosen_title TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watch_history (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  tmdb_id INTEGER,
  title_name TEXT NOT NULL,
  title_type TEXT NOT NULL,
  watched_at TEXT NOT NULL,
  reaction TEXT,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_watch_history_user_watched_at
  ON watch_history (clerk_user_id, watched_at DESC);

CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  session_id TEXT,
  phase TEXT,
  answers_json TEXT,
  deck_json TEXT NOT NULL,
  deck_cursor INTEGER NOT NULL DEFAULT 0,
  shortlist_json TEXT,
  passed_json TEXT,
  showdown_queue_json TEXT,
  winner_id TEXT,
  backup_id TEXT,
  saved_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decks_user_saved_at
  ON decks (clerk_user_id, saved_at DESC);

CREATE TABLE IF NOT EXISTS user_library (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  tmdb_id INTEGER,
  title_name TEXT NOT NULL,
  title_type TEXT NOT NULL,
  entry_kind TEXT NOT NULL,
  source TEXT NOT NULL,
  reaction TEXT,
  saved_at TEXT,
  watched_at TEXT,
  title_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_library_user_kind_saved
  ON user_library (clerk_user_id, entry_kind, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_library_user_updated
  ON user_library (clerk_user_id, updated_at DESC);
