import { createDefaultProfile } from "../engine/profile";
import { DEFAULT_WATCH_REGION, normalizeWatchRegion } from "../config/regions";
import type { OnboardingAnswers, TasteProfile, Title, ViewerPrefs } from "../types";

export function createDefaultViewerPrefs(): ViewerPrefs {
  return {
    version: 1,
    watchRegion: DEFAULT_WATCH_REGION,
    source: "auto"
  };
}

const PROFILE_KEY = "sententia.tasteProfile.v1";
const ANSWERS_KEY = "sententia.lastAnswers.v1";
const VIEWER_PREFS_KEY = "sententia.viewerPrefs.v1";
const SAVED_PICKS_KEY = "sententia.savedPicks.v1";
const WATCHED_TITLES_KEY = "sententia.watchedTitles.v1";
const GROUP_HISTORY_KEY = "sententia.groupHistory.v1";
const SOLO_HISTORY_KEY = "sententia.soloHistory.v1";
const SESSION_DRAFT_KEY = "sententia.sessionDraft.v1";
const MAX_LIBRARY_ITEMS = 200;
const MAX_GROUP_HISTORY = 60;
const MAX_SOLO_HISTORY = 30;

export interface SavedPickEntry {
  title: Title;
  savedAt: string;
  source: "solo" | "group";
}

export interface WatchedTitleEntry {
  title: Title;
  watchedAt: string;
  reaction?: "up" | "down";
  source: "solo" | "group";
}

export interface SoloHistoryEntry {
  id: string;
  winner: Title;
  reasons: string[];
  recordedAt: string;
  followUpDone?: boolean;
}

export interface GroupHistoryEntry {
  roomCode: string;
  recordedAt: string;
  myPick?: Title;
  partnerPick?: Title;
  sharedCompromise?: Title;
  overlapTitles: Title[];
}

export interface SessionDraft {
  session: OnboardingSessionSnapshot;
  catalog: Title[];
  savedAt: string;
}

type OnboardingSessionSnapshot = {
  phase: "swipe" | "showdown";
  sessionId: string;
  answers: OnboardingAnswers;
  deck: string[];
  deckCursor: number;
  shortlist: string[];
  passed: string[];
  showdownQueue: string[];
  winnerId?: string;
  backupId?: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeGetItem(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore write failures (private mode/quota) and keep app usable.
  }
}

function safeRemoveItem(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage removal failures.
  }
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadProfile(): TasteProfile {
  const raw = safeGetItem(PROFILE_KEY);
  if (!raw) return createDefaultProfile();

  try {
    const parsed = JSON.parse(raw) as Partial<TasteProfile>;
    if (parsed.version !== 1) {
      return migrateProfile(parsed);
    }
    const defaults = createDefaultProfile();
    return {
      ...defaults,
      ...parsed,
      runtimeAffinity: {
        ...defaults.runtimeAffinity,
        ...(parsed.runtimeAffinity ?? {})
      },
      typeAffinity: {
        ...defaults.typeAffinity,
        ...(parsed.typeAffinity ?? {})
      }
    };
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: TasteProfile): void {
  safeSetItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadLastAnswers(): Partial<OnboardingAnswers> {
  return sanitizeCachedAnswers(
    safeJsonParse<Partial<OnboardingAnswers>>(safeGetItem(ANSWERS_KEY), {})
  );
}

export function saveLastAnswers(answers: OnboardingAnswers): void {
  safeSetItem(ANSWERS_KEY, JSON.stringify(sanitizeCachedAnswers(answers)));
}

export function loadViewerPrefsFromStorage(): ViewerPrefs {
  const raw = safeGetItem(VIEWER_PREFS_KEY);
  if (!raw) return createDefaultViewerPrefs();

  try {
    const parsed = JSON.parse(raw) as Partial<ViewerPrefs>;
    if (parsed.version !== 1) {
      return migrateViewerPrefs(parsed);
    }
    return {
      version: 1,
      watchRegion: normalizeWatchRegion(parsed.watchRegion),
      source: parsed.source === "manual" ? "manual" : "auto",
      detectedAt: typeof parsed.detectedAt === "string" ? parsed.detectedAt : undefined
    };
  } catch {
    return createDefaultViewerPrefs();
  }
}

export function saveViewerPrefsToStorage(prefs: ViewerPrefs): void {
  safeSetItem(VIEWER_PREFS_KEY, JSON.stringify(prefs));
}

export function loadSavedPicks(): SavedPickEntry[] {
  const list = safeJsonParse<SavedPickEntry[]>(safeGetItem(SAVED_PICKS_KEY), []);
  return Array.isArray(list) ? list : [];
}

export function isTitleSaved(titleId: string): boolean {
  return loadSavedPicks().some((entry) => entry.title.id === titleId);
}

export function toggleSavedPick(title: Title, source: "solo" | "group"): boolean {
  const saved = loadSavedPicks();
  const existing = saved.findIndex((entry) => entry.title.id === title.id);
  if (existing >= 0) {
    saved.splice(existing, 1);
    safeSetItem(SAVED_PICKS_KEY, JSON.stringify(saved));
    return false;
  }

  const next: SavedPickEntry = {
    title,
    source,
    savedAt: new Date().toISOString()
  };
  const deduped = [next, ...saved.filter((entry) => entry.title.id !== title.id)].slice(0, MAX_LIBRARY_ITEMS);
  safeSetItem(SAVED_PICKS_KEY, JSON.stringify(deduped));
  return true;
}

export function loadWatchedTitles(): WatchedTitleEntry[] {
  const list = safeJsonParse<unknown[]>(safeGetItem(WATCHED_TITLES_KEY), []);
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => normalizeWatchedEntry(entry))
    .filter((entry): entry is WatchedTitleEntry => Boolean(entry));
}

export function isTitleWatched(titleId: string): boolean {
  return loadWatchedTitles().some((entry) => entry.title.id === titleId);
}

export function loadWatchedTitleIds(): string[] {
  return loadWatchedTitles().map((entry) => entry.title.id);
}

export function markTitleWatched(
  title: Title,
  options: { source: "solo" | "group"; reaction?: "up" | "down" }
): WatchedTitleEntry {
  const watched = loadWatchedTitles();
  const next: WatchedTitleEntry = {
    title,
    source: options.source,
    watchedAt: new Date().toISOString(),
    reaction: options.reaction
  };
  const deduped = [next, ...watched.filter((entry) => entry.title.id !== title.id)].slice(0, MAX_LIBRARY_ITEMS);
  safeSetItem(WATCHED_TITLES_KEY, JSON.stringify(deduped));
  return next;
}

export function updateWatchedReaction(titleId: string, reaction?: "up" | "down"): WatchedTitleEntry | null {
  const watched = loadWatchedTitles();
  const index = watched.findIndex((entry) => entry.title.id === titleId);
  if (index < 0) return null;
  const current = watched[index]!;
  const updated: WatchedTitleEntry = {
    ...current,
    reaction
  };
  watched.splice(index, 1);
  safeSetItem(WATCHED_TITLES_KEY, JSON.stringify([updated, ...watched]));
  return updated;
}

export function loadGroupHistory(): GroupHistoryEntry[] {
  const list = safeJsonParse<GroupHistoryEntry[]>(safeGetItem(GROUP_HISTORY_KEY), []);
  return Array.isArray(list) ? list : [];
}

export function upsertGroupHistory(entry: GroupHistoryEntry): void {
  if (!entry.roomCode.trim()) return;
  const existing = loadGroupHistory();
  const next = [
    entry,
    ...existing.filter((item) => item.roomCode.toUpperCase() !== entry.roomCode.toUpperCase())
  ].slice(0, MAX_GROUP_HISTORY);
  safeSetItem(GROUP_HISTORY_KEY, JSON.stringify(next));
}

export function loadSoloHistory(): SoloHistoryEntry[] {
  const list = safeJsonParse<SoloHistoryEntry[]>(safeGetItem(SOLO_HISTORY_KEY), []);
  return Array.isArray(list) ? list : [];
}

export function saveSoloResult(entry: SoloHistoryEntry): void {
  if (!entry.winner) return;
  const existing = loadSoloHistory();
  const next = [entry, ...existing].slice(0, MAX_SOLO_HISTORY);
  safeSetItem(SOLO_HISTORY_KEY, JSON.stringify(next));
}

export function markSoloHistoryFollowUpDone(entryId: string): void {
  if (!entryId.trim()) return;
  const existing = loadSoloHistory();
  const index = existing.findIndex((entry) => entry.id === entryId);
  if (index < 0) return;
  const updated: SoloHistoryEntry = {
    ...existing[index]!,
    followUpDone: true
  };
  existing.splice(index, 1, updated);
  safeSetItem(SOLO_HISTORY_KEY, JSON.stringify(existing));
}

export function clearSoloHistory(): void {
  safeRemoveItem(SOLO_HISTORY_KEY);
}

export function resetPersonalization(): void {
  safeRemoveItem(PROFILE_KEY);
  safeRemoveItem(ANSWERS_KEY);
  safeRemoveItem(VIEWER_PREFS_KEY);
  safeRemoveItem(SAVED_PICKS_KEY);
  safeRemoveItem(WATCHED_TITLES_KEY);
  safeRemoveItem(GROUP_HISTORY_KEY);
  safeRemoveItem(SOLO_HISTORY_KEY);
  safeRemoveItem(SESSION_DRAFT_KEY);
}

export function loadSessionDraft(): SessionDraft | null {
  const draft = safeJsonParse<SessionDraft | null>(safeGetItem(SESSION_DRAFT_KEY), null);
  if (!draft || !Array.isArray(draft.catalog)) return null;
  if (!draft.session || (draft.session.phase !== "swipe" && draft.session.phase !== "showdown")) return null;
  return draft;
}

export function saveSessionDraft(draft: SessionDraft): void {
  safeSetItem(SESSION_DRAFT_KEY, JSON.stringify(draft));
}

export function clearSessionDraft(): void {
  safeRemoveItem(SESSION_DRAFT_KEY);
}

function migrateProfile(parsed: Partial<TasteProfile>): TasteProfile {
  // v0 or unknown versions: best-effort merge into current defaults.
  const defaults = createDefaultProfile();
  return {
    ...defaults,
    ...parsed,
    version: 1,
    runtimeAffinity: {
      ...defaults.runtimeAffinity,
      ...(parsed.runtimeAffinity ?? {})
    },
    typeAffinity: {
      ...defaults.typeAffinity,
      ...(parsed.typeAffinity ?? {})
    }
  };
}

function migrateViewerPrefs(parsed: Partial<ViewerPrefs>): ViewerPrefs {
  return {
    version: 1,
    watchRegion: normalizeWatchRegion(parsed.watchRegion ?? DEFAULT_WATCH_REGION),
    source: parsed.source === "manual" ? "manual" : "auto",
    detectedAt: typeof parsed.detectedAt === "string" ? parsed.detectedAt : undefined
  };
}

function normalizeWatchedEntry(value: unknown): WatchedTitleEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    title?: Title;
    watchedAt?: string;
    source?: "solo" | "group";
    reaction?: string;
    rating?: number;
  };
  if (!candidate.title || typeof candidate.watchedAt !== "string") return null;
  return {
    title: candidate.title,
    watchedAt: candidate.watchedAt,
    source: candidate.source === "group" ? "group" : "solo",
    reaction: normalizeReaction(candidate.reaction, candidate.rating)
  };
}

function normalizeReaction(
  reaction?: string,
  legacyRating?: number
): "up" | "down" | undefined {
  if (reaction === "up" || reaction === "down") return reaction;
  if (typeof legacyRating !== "number") return undefined;
  if (legacyRating >= 4) return "up";
  if (legacyRating <= 2) return "down";
  return undefined;
}

/**
 * We intentionally do not persist "Basics" step selections.
 * Cache only vibe-level choices so returning users don't get sticky provider/filter defaults.
 */
function sanitizeCachedAnswers(answers: Partial<OnboardingAnswers>): Partial<OnboardingAnswers> {
  const next: Partial<OnboardingAnswers> = {};

  if (typeof answers.quickModeId === "string" && answers.quickModeId.trim()) {
    next.quickModeId = answers.quickModeId;
  }
  if (Array.isArray(answers.moods)) {
    next.moods = answers.moods.filter((mood): mood is string => typeof mood === "string" && mood.trim().length > 0);
  }

  return next;
}
