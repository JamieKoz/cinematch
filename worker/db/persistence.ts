import { parseJsonColumn, stringifyJsonColumn } from "./json";
import { parseTmdbIdFromCatalogId } from "./titleMeta";

type RuntimeBucket = "short" | "standard" | "long";
type TitleType = "movie" | "series";

export interface TasteProfileRow {
  version: 1;
  updatedAt: string;
  preferredType?: TitleType;
  runtimeAffinity: Record<RuntimeBucket, number>;
  moodAffinity: Record<string, number>;
  genreAffinity: Record<string, number>;
  typeAffinity: Record<TitleType, number>;
  languageAffinity: Record<string, number>;
  providerAffinity: Record<string, number>;
  likedIds: string[];
  rejectedIds: string[];
  seenIds: string[];
  sessionCount: number;
  lastChosenTitle?: string;
}

export interface TitlePayload {
  id: string;
  name: string;
  type: TitleType;
  runtimeMinutes: number;
  genres: string[];
  moods: string[];
  language: string;
  providers: string[];
  popularity: number;
  releaseYear: number;
  imdbId?: string;
  primeVideoGti?: string;
  youtubeTrailerId?: string;
  posterPath?: string | null;
  overview: string;
  rating?: number;
  cast?: string[];
}

export interface WatchedEntryInput {
  title: TitlePayload;
  watchedAt: string;
  reaction?: "up" | "down";
  source: "solo" | "group";
}

export interface LibraryItemInput {
  id?: string;
  title: TitlePayload;
  entryKind: "saved" | "watched";
  source: "solo" | "group";
  reaction?: "up" | "down";
  savedAt?: string;
  watchedAt?: string;
}

export interface LibraryListFilters {
  entryKind?: "saved" | "watched";
}

export interface OnboardingAnswersPayload {
  quickModeId?: string;
  moods: string[];
  preferredType: TitleType | "either";
  runtime: RuntimeBucket | "any";
  languages: string[];
  releaseWindow: "any" | "2020s" | "2010s" | "2000s" | "pre-2000";
  customYearRange: { min: number; max: number } | null;
  familiarities: Array<"popular" | "hidden-gems" | "for-kids" | "adults-only" | "acclaimed">;
  providers: string[];
  hardExclusions: string[];
  keywords: string[];
  usePersonalization: boolean;
}

export interface DeckSessionSnapshot {
  phase: "swipe" | "showdown";
  sessionId: string;
  answers: OnboardingAnswersPayload;
  deck: string[];
  deckCursor: number;
  shortlist: string[];
  passed: string[];
  showdownQueue: string[];
  winnerId?: string;
  backupId?: string;
}

export interface DeckStateInput {
  session: DeckSessionSnapshot;
  catalog: TitlePayload[];
  savedAt: string;
}

export interface DeckStateOutput {
  session: DeckSessionSnapshot;
  catalog: TitlePayload[];
  savedAt: string;
}

interface DeckJsonPayload {
  ids: string[];
  catalog: TitlePayload[];
}

function sessionTitleIds(session: DeckSessionSnapshot): string[] {
  return [
    ...session.deck,
    ...session.shortlist,
    ...session.passed,
    ...session.showdownQueue,
    ...(session.winnerId ? [session.winnerId] : []),
    ...(session.backupId ? [session.backupId] : [])
  ];
}

function catalogForDeck(session: DeckSessionSnapshot, catalog: TitlePayload[]): TitlePayload[] {
  const ids = new Set(sessionTitleIds(session));
  const byId = new Map(catalog.map((title) => [title.id, title]));
  return Array.from(ids).map((id) => byId.get(id)).filter((title): title is TitlePayload => Boolean(title));
}

const MAX_WATCH_HISTORY = 200;
const MAX_LIBRARY_ITEMS = 200;
const ANSWERS_CACHE_SUFFIX = ":answers-cache";

function defaultRuntimeAffinity(): Record<RuntimeBucket, number> {
  return { short: 0, standard: 0, long: 0 };
}

function defaultTypeAffinity(): Record<TitleType, number> {
  return { movie: 0, series: 0 };
}

export function createDefaultTasteProfile(): TasteProfileRow {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    runtimeAffinity: defaultRuntimeAffinity(),
    moodAffinity: {},
    genreAffinity: {},
    typeAffinity: defaultTypeAffinity(),
    languageAffinity: {},
    providerAffinity: {},
    likedIds: [],
    rejectedIds: [],
    seenIds: [],
    sessionCount: 0
  };
}

function rowToTasteProfile(row: Record<string, unknown>): TasteProfileRow {
  const defaults = createDefaultTasteProfile();
  return {
    version: 1,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : defaults.updatedAt,
    preferredType:
      row.preferred_type === "movie" || row.preferred_type === "series"
        ? row.preferred_type
        : undefined,
    runtimeAffinity: {
      ...defaults.runtimeAffinity,
      ...parseJsonColumn(row.runtime_affinity as string | null, {})
    },
    moodAffinity: parseJsonColumn(row.mood_affinity as string | null, {}),
    genreAffinity: parseJsonColumn(row.genre_affinity as string | null, {}),
    typeAffinity: {
      ...defaults.typeAffinity,
      ...parseJsonColumn(row.type_affinity as string | null, {})
    },
    languageAffinity: parseJsonColumn(row.language_affinity as string | null, {}),
    providerAffinity: parseJsonColumn(row.provider_affinity as string | null, {}),
    likedIds: parseJsonColumn(row.liked_ids as string | null, []),
    rejectedIds: parseJsonColumn(row.rejected_ids as string | null, []),
    seenIds: parseJsonColumn(row.seen_ids as string | null, []),
    sessionCount: typeof row.session_count === "number" ? row.session_count : Number(row.session_count) || 0,
    lastChosenTitle:
      typeof row.last_chosen_title === "string" && row.last_chosen_title
        ? row.last_chosen_title
        : undefined
  };
}

function tasteProfileToBindings(profile: TasteProfileRow): Record<string, string | number | null> {
  return {
    version: profile.version,
    genre_affinity: stringifyJsonColumn(profile.genreAffinity),
    mood_affinity: stringifyJsonColumn(profile.moodAffinity),
    runtime_affinity: stringifyJsonColumn(profile.runtimeAffinity),
    type_affinity: stringifyJsonColumn(profile.typeAffinity),
    language_affinity: stringifyJsonColumn(profile.languageAffinity),
    provider_affinity: stringifyJsonColumn(profile.providerAffinity),
    liked_ids: stringifyJsonColumn(profile.likedIds),
    rejected_ids: stringifyJsonColumn(profile.rejectedIds),
    seen_ids: stringifyJsonColumn(profile.seenIds),
    preferred_type: profile.preferredType ?? null,
    session_count: profile.sessionCount,
    last_chosen_title: profile.lastChosenTitle ?? null,
    updated_at: profile.updatedAt
  };
}

function answersCacheId(clerkUserId: string): string {
  return `${clerkUserId}${ANSWERS_CACHE_SUFFIX}`;
}

function sanitizeCachedAnswers(answers: Partial<OnboardingAnswersPayload>): Partial<OnboardingAnswersPayload> {
  const next: Partial<OnboardingAnswersPayload> = {};
  if (typeof answers.quickModeId === "string" && answers.quickModeId.trim()) {
    next.quickModeId = answers.quickModeId;
  }
  if (Array.isArray(answers.moods)) {
    next.moods = answers.moods.filter((mood): mood is string => typeof mood === "string" && mood.trim().length > 0);
  }
  return next;
}

export async function getOrCreateTasteProfile(db: D1Database, clerkUserId: string): Promise<TasteProfileRow> {
  const existing = await db
    .prepare("SELECT * FROM taste_profiles WHERE clerk_user_id = ?")
    .bind(clerkUserId)
    .first<Record<string, unknown>>();

  if (existing) {
    return rowToTasteProfile(existing);
  }

  const profile = createDefaultTasteProfile();
  const bindings = tasteProfileToBindings(profile);
  await db
    .prepare(
      `INSERT INTO taste_profiles (
        clerk_user_id, version, genre_affinity, mood_affinity, runtime_affinity, type_affinity,
        language_affinity, provider_affinity, liked_ids, rejected_ids, seen_ids,
        preferred_type, session_count, last_chosen_title, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      clerkUserId,
      bindings.version,
      bindings.genre_affinity,
      bindings.mood_affinity,
      bindings.runtime_affinity,
      bindings.type_affinity,
      bindings.language_affinity,
      bindings.provider_affinity,
      bindings.liked_ids,
      bindings.rejected_ids,
      bindings.seen_ids,
      bindings.preferred_type,
      bindings.session_count,
      bindings.last_chosen_title,
      bindings.updated_at
    )
    .run();

  return profile;
}

export async function saveTasteProfile(
  db: D1Database,
  clerkUserId: string,
  profile: TasteProfileRow
): Promise<TasteProfileRow> {
  await getOrCreateTasteProfile(db, clerkUserId);
  const next = { ...profile, version: 1 as const, updatedAt: new Date().toISOString() };
  const bindings = tasteProfileToBindings(next);
  await db
    .prepare(
      `UPDATE taste_profiles SET
        version = ?, genre_affinity = ?, mood_affinity = ?, runtime_affinity = ?, type_affinity = ?,
        language_affinity = ?, provider_affinity = ?, liked_ids = ?, rejected_ids = ?, seen_ids = ?,
        preferred_type = ?, session_count = ?, last_chosen_title = ?, updated_at = ?
      WHERE clerk_user_id = ?`
    )
    .bind(
      bindings.version,
      bindings.genre_affinity,
      bindings.mood_affinity,
      bindings.runtime_affinity,
      bindings.type_affinity,
      bindings.language_affinity,
      bindings.provider_affinity,
      bindings.liked_ids,
      bindings.rejected_ids,
      bindings.seen_ids,
      bindings.preferred_type,
      bindings.session_count,
      bindings.last_chosen_title,
      bindings.updated_at,
      clerkUserId
    )
    .run();
  return next;
}

export async function saveLastAnswers(
  db: D1Database,
  clerkUserId: string,
  answers: Partial<OnboardingAnswersPayload>
): Promise<void> {
  const sanitized = sanitizeCachedAnswers(answers);
  const id = answersCacheId(clerkUserId);
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO decks (
        id, clerk_user_id, session_id, phase, answers_json, deck_json, deck_cursor,
        shortlist_json, passed_json, showdown_queue_json, saved_at, updated_at
      ) VALUES (?, ?, ?, 'cached', ?, '[]', 0, '[]', '[]', '[]', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        answers_json = excluded.answers_json,
        saved_at = excluded.saved_at,
        updated_at = excluded.updated_at`
    )
    .bind(id, clerkUserId, id, stringifyJsonColumn(sanitized), now, now)
    .run();
}

export async function loadLastAnswers(
  db: D1Database,
  clerkUserId: string
): Promise<Partial<OnboardingAnswersPayload>> {
  const row = await db
    .prepare("SELECT answers_json FROM decks WHERE id = ? AND clerk_user_id = ?")
    .bind(answersCacheId(clerkUserId), clerkUserId)
    .first<{ answers_json: string | null }>();
  return parseJsonColumn(row?.answers_json, {});
}

export async function addWatchedTitle(
  db: D1Database,
  clerkUserId: string,
  watchedEntry: WatchedEntryInput
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  const tmdbId = parseTmdbIdFromCatalogId(watchedEntry.title.id);
  await db
    .prepare(
      `INSERT INTO watch_history (
        id, clerk_user_id, tmdb_id, title_name, title_type, watched_at, reaction, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      clerkUserId,
      tmdbId,
      watchedEntry.title.name,
      watchedEntry.title.type,
      watchedEntry.watchedAt,
      watchedEntry.reaction ?? null,
      watchedEntry.source
    )
    .run();

  await saveLibraryItem(db, clerkUserId, {
    id: `watched:${watchedEntry.title.id}`,
    title: watchedEntry.title,
    entryKind: "watched",
    source: watchedEntry.source,
    reaction: watchedEntry.reaction,
    watchedAt: watchedEntry.watchedAt
  });

  await pruneWatchHistory(db, clerkUserId);
  return { id };
}

async function pruneWatchHistory(db: D1Database, clerkUserId: string): Promise<void> {
  await db
    .prepare(
      `DELETE FROM watch_history
       WHERE clerk_user_id = ?
         AND id NOT IN (
           SELECT id FROM watch_history
           WHERE clerk_user_id = ?
           ORDER BY watched_at DESC
           LIMIT ?
         )`
    )
    .bind(clerkUserId, clerkUserId, MAX_WATCH_HISTORY)
    .run();
}

export interface WatchHistoryItem {
  id: string;
  title: TitlePayload;
  watchedAt: string;
  reaction?: "up" | "down";
  source: "solo" | "group";
}

export async function listWatchHistory(db: D1Database, clerkUserId: string): Promise<WatchHistoryItem[]> {
  const libraryWatched = await listLibraryItems(db, clerkUserId, { entryKind: "watched" });
  const fromLibrary = libraryWatched
    .filter((item) => item.title)
    .map((item) => ({
      id: item.id,
      title: item.title!,
      watchedAt: item.watchedAt ?? item.savedAt ?? new Date().toISOString(),
      reaction: item.reaction,
      source: item.source
    }));

  if (fromLibrary.length > 0) {
    return fromLibrary.sort((a, b) => b.watchedAt.localeCompare(a.watchedAt)).slice(0, MAX_WATCH_HISTORY);
  }

  const rows = await db
    .prepare(
      `SELECT * FROM watch_history
       WHERE clerk_user_id = ?
       ORDER BY watched_at DESC
       LIMIT ?`
    )
    .bind(clerkUserId, MAX_WATCH_HISTORY)
    .all<Record<string, unknown>>();

  return (rows.results ?? []).map((row) => ({
    id: String(row.id),
    title: {
      id: row.tmdb_id ? `tmdb-${row.title_type === "series" ? "tv" : "movie"}-${row.tmdb_id}` : String(row.id),
      name: String(row.title_name),
      type: row.title_type === "series" ? "series" : "movie",
      runtimeMinutes: 0,
      genres: [],
      moods: [],
      language: "en",
      providers: [],
      popularity: 0,
      releaseYear: 0,
      overview: ""
    },
    watchedAt: String(row.watched_at),
    reaction: row.reaction === "up" || row.reaction === "down" ? row.reaction : undefined,
    source: row.source === "group" ? "group" : "solo"
  }));
}

export async function updateWatchedReaction(
  db: D1Database,
  clerkUserId: string,
  titleId: string,
  reaction?: "up" | "down"
): Promise<WatchHistoryItem | null> {
  const libraryId = `watched:${titleId}`;
  const items = await listLibraryItems(db, clerkUserId, { entryKind: "watched" });
  const existing = items.find((item) => item.title?.id === titleId || item.id === libraryId);
  if (!existing?.title) return null;

  await saveLibraryItem(db, clerkUserId, {
    id: existing.id,
    title: existing.title,
    entryKind: "watched",
    source: existing.source,
    reaction,
    watchedAt: existing.watchedAt ?? new Date().toISOString()
  });

  return {
    id: existing.id,
    title: existing.title,
    watchedAt: existing.watchedAt ?? new Date().toISOString(),
    reaction,
    source: existing.source
  };
}

export async function saveDeck(db: D1Database, clerkUserId: string, deckState: DeckStateInput): Promise<void> {
  const { session, catalog, savedAt } = deckState;
  const deckId = session.sessionId;
  const deckPayload: DeckJsonPayload = {
    ids: session.deck,
    catalog: catalogForDeck(session, catalog)
  };
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO decks (
        id, clerk_user_id, session_id, phase, answers_json, deck_json, deck_cursor,
        shortlist_json, passed_json, showdown_queue_json, winner_id, backup_id, saved_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        phase = excluded.phase,
        answers_json = excluded.answers_json,
        deck_json = excluded.deck_json,
        deck_cursor = excluded.deck_cursor,
        shortlist_json = excluded.shortlist_json,
        passed_json = excluded.passed_json,
        showdown_queue_json = excluded.showdown_queue_json,
        winner_id = excluded.winner_id,
        backup_id = excluded.backup_id,
        saved_at = excluded.saved_at,
        updated_at = excluded.updated_at`
    )
    .bind(
      deckId,
      clerkUserId,
      session.sessionId,
      session.phase,
      stringifyJsonColumn(session.answers),
      stringifyJsonColumn(deckPayload),
      session.deckCursor,
      stringifyJsonColumn(session.shortlist),
      stringifyJsonColumn(session.passed),
      stringifyJsonColumn(session.showdownQueue),
      session.winnerId ?? null,
      session.backupId ?? null,
      savedAt,
      now
    )
    .run();
}

function parseDeckJson(raw: string | null): DeckJsonPayload {
  const parsed = parseJsonColumn<DeckJsonPayload | string[] | null>(raw, null);
  if (Array.isArray(parsed)) {
    return { ids: parsed, catalog: [] };
  }
  if (parsed && Array.isArray(parsed.ids)) {
    return {
      ids: parsed.ids,
      catalog: Array.isArray(parsed.catalog) ? parsed.catalog : []
    };
  }
  return { ids: [], catalog: [] };
}

export async function getLatestDeck(db: D1Database, clerkUserId: string): Promise<DeckStateOutput | null> {
  const row = await db
    .prepare(
      `SELECT * FROM decks
       WHERE clerk_user_id = ?
         AND phase IN ('swipe', 'showdown')
       ORDER BY saved_at DESC
       LIMIT 1`
    )
    .bind(clerkUserId)
    .first<Record<string, unknown>>();

  if (!row) return null;

  const deckPayload = parseDeckJson(row.deck_json as string | null);
  const session = {
    phase: row.phase === "showdown" ? "showdown" : "swipe",
    sessionId: String(row.session_id ?? row.id),
    answers: parseJsonColumn<OnboardingAnswersPayload>(row.answers_json as string | null, {
      moods: [],
      preferredType: "either",
      runtime: "any",
      languages: [],
      releaseWindow: "any",
      customYearRange: null,
      familiarities: [],
      providers: [],
      hardExclusions: [],
      keywords: [],
      usePersonalization: true
    }),
    deck: deckPayload.ids,
    deckCursor: Number(row.deck_cursor) || 0,
    shortlist: parseJsonColumn<string[]>(row.shortlist_json as string | null, []),
    passed: parseJsonColumn<string[]>(row.passed_json as string | null, []),
    showdownQueue: parseJsonColumn<string[]>(row.showdown_queue_json as string | null, []),
    winnerId: typeof row.winner_id === "string" ? row.winner_id : undefined,
    backupId: typeof row.backup_id === "string" ? row.backup_id : undefined
  } satisfies DeckSessionSnapshot;

  const catalogIds = new Set(sessionTitleIds(session));
  const catalogFromDeck = deckPayload.catalog.filter((title) => catalogIds.has(title.id));
  if (catalogFromDeck.length > 0) {
    return {
      session,
      catalog: catalogFromDeck,
      savedAt: String(row.saved_at ?? new Date().toISOString())
    };
  }

  const library = await listLibraryItems(db, clerkUserId);
  const catalog = library
    .map((item) => item.title)
    .filter((title): title is TitlePayload => Boolean(title && catalogIds.has(title.id)));

  return {
    session,
    catalog,
    savedAt: String(row.saved_at ?? new Date().toISOString())
  };
}

export async function clearLatestDeck(db: D1Database, clerkUserId: string, sessionId?: string): Promise<void> {
  if (sessionId) {
    await db
      .prepare("DELETE FROM decks WHERE clerk_user_id = ? AND id = ? AND phase IN ('swipe', 'showdown')")
      .bind(clerkUserId, sessionId)
      .run();
    return;
  }
  await db
    .prepare("DELETE FROM decks WHERE clerk_user_id = ? AND phase IN ('swipe', 'showdown')")
    .bind(clerkUserId)
    .run();
}

export interface LibraryItemRow {
  id: string;
  title?: TitlePayload;
  entryKind: "saved" | "watched";
  source: "solo" | "group";
  reaction?: "up" | "down";
  savedAt?: string;
  watchedAt?: string;
}

export async function saveLibraryItem(
  db: D1Database,
  clerkUserId: string,
  item: LibraryItemInput
): Promise<{ id: string }> {
  const id = item.id ?? (item.entryKind === "saved" ? `saved:${item.title.id}` : `watched:${item.title.id}`);
  const tmdbId = parseTmdbIdFromCatalogId(item.title.id);
  const now = new Date().toISOString();
  const savedAt = item.savedAt ?? (item.entryKind === "saved" ? now : null);
  const watchedAt = item.watchedAt ?? (item.entryKind === "watched" ? now : null);

  await db
    .prepare(
      `INSERT INTO user_library (
        id, clerk_user_id, tmdb_id, title_name, title_type, entry_kind, source,
        reaction, saved_at, watched_at, title_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        tmdb_id = excluded.tmdb_id,
        title_name = excluded.title_name,
        title_type = excluded.title_type,
        entry_kind = excluded.entry_kind,
        source = excluded.source,
        reaction = excluded.reaction,
        saved_at = COALESCE(excluded.saved_at, user_library.saved_at),
        watched_at = COALESCE(excluded.watched_at, user_library.watched_at),
        title_json = excluded.title_json,
        updated_at = excluded.updated_at`
    )
    .bind(
      id,
      clerkUserId,
      tmdbId,
      item.title.name,
      item.title.type,
      item.entryKind,
      item.source,
      item.reaction ?? null,
      savedAt,
      watchedAt,
      stringifyJsonColumn(item.title),
      now
    )
    .run();

  if (item.entryKind === "saved") {
    await pruneLibrary(db, clerkUserId, "saved");
  }

  return { id };
}

async function pruneLibrary(db: D1Database, clerkUserId: string, entryKind: "saved" | "watched"): Promise<void> {
  const orderColumn = entryKind === "saved" ? "saved_at" : "watched_at";
  await db
    .prepare(
      `DELETE FROM user_library
       WHERE clerk_user_id = ?
         AND entry_kind = ?
         AND id NOT IN (
           SELECT id FROM user_library
           WHERE clerk_user_id = ? AND entry_kind = ?
           ORDER BY ${orderColumn} DESC
           LIMIT ?
         )`
    )
    .bind(clerkUserId, entryKind, clerkUserId, entryKind, MAX_LIBRARY_ITEMS)
    .run();
}

export async function listLibraryItems(
  db: D1Database,
  clerkUserId: string,
  filters?: LibraryListFilters
): Promise<LibraryItemRow[]> {
  const entryKind = filters?.entryKind;
  const query = entryKind
    ? `SELECT * FROM user_library WHERE clerk_user_id = ? AND entry_kind = ? ORDER BY COALESCE(saved_at, watched_at, updated_at) DESC LIMIT ?`
    : `SELECT * FROM user_library WHERE clerk_user_id = ? ORDER BY updated_at DESC LIMIT ?`;

  const statement = entryKind
    ? db.prepare(query).bind(clerkUserId, entryKind, MAX_LIBRARY_ITEMS)
    : db.prepare(query).bind(clerkUserId, MAX_LIBRARY_ITEMS);

  const rows = await statement.all<Record<string, unknown>>();
  return (rows.results ?? []).map((row) => ({
    id: String(row.id),
    title: parseJsonColumn<TitlePayload | null>(row.title_json as string | null, null) ?? undefined,
    entryKind: row.entry_kind === "watched" ? "watched" : "saved",
    source: row.source === "group" ? "group" : "solo",
    reaction: row.reaction === "up" || row.reaction === "down" ? row.reaction : undefined,
    savedAt: typeof row.saved_at === "string" ? row.saved_at : undefined,
    watchedAt: typeof row.watched_at === "string" ? row.watched_at : undefined
  }));
}

export async function removeLibraryItem(db: D1Database, clerkUserId: string, itemId: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM user_library WHERE clerk_user_id = ? AND id = ?")
    .bind(clerkUserId, itemId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function removeSavedPickByTitleId(
  db: D1Database,
  clerkUserId: string,
  titleId: string
): Promise<boolean> {
  return removeLibraryItem(db, clerkUserId, `saved:${titleId}`);
}

export async function isTitleSaved(db: D1Database, clerkUserId: string, titleId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM user_library WHERE clerk_user_id = ? AND id = ? AND entry_kind = 'saved'")
    .bind(clerkUserId, `saved:${titleId}`)
    .first();
  return Boolean(row);
}
