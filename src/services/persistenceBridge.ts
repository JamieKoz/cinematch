import type { OnboardingAnswers, TasteProfile } from "../types";
import {
  addUserWatchedTitle,
  clearUserDeck,
  removeUserSavedPick,
  saveUserAnswers,
  saveUserDeck,
  saveUserLibraryItem,
  saveUserProfile,
  updateUserWatchedReaction
} from "./userApi";
import type { SavedPickEntry, SessionDraft, WatchedTitleEntry } from "./storage";
import type { Title } from "../types";

type TokenGetter = () => Promise<string | null>;

let signedIn = false;
let getToken: TokenGetter | null = null;

/** Wired from Clerk via useAuthPersistence when the session is ready. */
export function configurePersistenceAuth(auth: { signedIn: boolean; getToken: TokenGetter }): void {
  signedIn = auth.signedIn;
  getToken = auth.getToken;
}

export function isPersistenceAuthenticated(): boolean {
  return signedIn && Boolean(getToken);
}

function tokenOrNull(): TokenGetter | null {
  return signedIn && getToken ? getToken : null;
}

function fireAndForget(task: () => Promise<void>): void {
  void task().catch((error) => {
    console.warn("Remote persistence failed", error);
  });
}

export function syncProfileRemote(profile: TasteProfile, lastAnswers?: Partial<OnboardingAnswers>): void {
  const token = tokenOrNull();
  if (!token) return;
  fireAndForget(() => saveUserProfile(token, profile, lastAnswers));
}

export function syncAnswersRemote(answers: Partial<OnboardingAnswers>): void {
  const token = tokenOrNull();
  if (!token) return;
  fireAndForget(() => saveUserAnswers(token, answers));
}

export function syncSessionDraftRemote(draft: SessionDraft): void {
  const token = tokenOrNull();
  if (!token) return;
  fireAndForget(() => saveUserDeck(token, draft));
}

export function clearSessionDraftRemote(sessionId?: string): void {
  const token = tokenOrNull();
  if (!token) return;
  fireAndForget(() => clearUserDeck(token, sessionId));
}

export function syncWatchedTitleRemote(entry: WatchedTitleEntry): void {
  const token = tokenOrNull();
  if (!token) return;
  fireAndForget(() => addUserWatchedTitle(token, entry));
}

export function syncWatchedReactionRemote(titleId: string, reaction?: "up" | "down"): void {
  const token = tokenOrNull();
  if (!token) return;
  fireAndForget(() => updateUserWatchedReaction(token, titleId, reaction));
}

export function syncSavedPickRemote(title: Title, source: "solo" | "group", savedAt: string): void {
  const token = tokenOrNull();
  if (!token) return;
  fireAndForget(() =>
    saveUserLibraryItem(token, {
      title,
      entryKind: "saved",
      source,
      savedAt
    })
  );
}

export function removeSavedPickRemote(titleId: string): void {
  const token = tokenOrNull();
  if (!token) return;
  fireAndForget(() => removeUserSavedPick(token, titleId));
}

export type HydratedUserData = {
  profile: TasteProfile;
  lastAnswers: Partial<OnboardingAnswers>;
  savedPicks: SavedPickEntry[];
  watchedTitles: WatchedTitleEntry[];
  sessionDraft: SessionDraft | null;
};
