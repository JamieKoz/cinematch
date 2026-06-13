import type { OnboardingAnswers, TasteProfile, Title } from "../types";
import type { SavedPickEntry, SessionDraft, WatchedTitleEntry } from "./storage";

type TokenGetter = () => Promise<string | null>;

async function userFetch(
  getToken: TokenGetter,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return fetch(path, { ...init, headers });
}

export type UserBootstrapPayload = {
  profile: TasteProfile;
  lastAnswers: Partial<OnboardingAnswers>;
  savedItems: Array<{
    id: string;
    title?: Title;
    entryKind: "saved" | "watched";
    source: "solo" | "group";
    savedAt?: string;
    watchedAt?: string;
    reaction?: "up" | "down";
  }>;
  watchedItems: WatchedTitleEntry[];
  deck: SessionDraft | null;
};

export async function fetchUserBootstrap(getToken: TokenGetter): Promise<UserBootstrapPayload> {
  const response = await userFetch(getToken, "/api/user/bootstrap");
  if (!response.ok) {
    throw new Error("Could not load user data");
  }
  const data = (await response.json()) as {
    profile: TasteProfile;
    lastAnswers?: Partial<OnboardingAnswers>;
    savedItems?: UserBootstrapPayload["savedItems"];
    watchedItems?: Array<{
      id: string;
      title: Title;
      watchedAt: string;
      reaction?: "up" | "down";
      source: "solo" | "group";
    }>;
    deck: SessionDraft | null;
  };

  return {
    profile: data.profile,
    lastAnswers: data.lastAnswers ?? {},
    savedItems: data.savedItems ?? [],
    watchedItems: (data.watchedItems ?? []).map((item) => ({
      title: item.title,
      watchedAt: item.watchedAt,
      reaction: item.reaction,
      source: item.source
    })),
    deck: data.deck
  };
}

export async function saveUserProfile(
  getToken: TokenGetter,
  profile: TasteProfile,
  lastAnswers?: Partial<OnboardingAnswers>
): Promise<void> {
  const response = await userFetch(getToken, "/api/user/profile", {
    method: "PUT",
    body: JSON.stringify({ profile, lastAnswers })
  });
  if (!response.ok) {
    throw new Error("Could not save profile");
  }
}

export async function saveUserAnswers(getToken: TokenGetter, answers: Partial<OnboardingAnswers>): Promise<void> {
  const response = await userFetch(getToken, "/api/user/answers", {
    method: "PUT",
    body: JSON.stringify({ answers })
  });
  if (!response.ok) {
    throw new Error("Could not save answers");
  }
}

export async function saveUserDeck(getToken: TokenGetter, draft: SessionDraft): Promise<void> {
  const response = await userFetch(getToken, "/api/user/deck", {
    method: "PUT",
    body: JSON.stringify({
      session: draft.session,
      catalog: draft.catalog,
      savedAt: draft.savedAt
    })
  });
  if (!response.ok) {
    throw new Error("Could not save deck");
  }
}

export async function clearUserDeck(getToken: TokenGetter, sessionId?: string): Promise<void> {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  const response = await userFetch(getToken, `/api/user/deck${query}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Could not clear deck");
  }
}

export async function addUserWatchedTitle(
  getToken: TokenGetter,
  entry: WatchedTitleEntry
): Promise<void> {
  const response = await userFetch(getToken, "/api/user/watch-history", {
    method: "POST",
    body: JSON.stringify(entry)
  });
  if (!response.ok) {
    throw new Error("Could not save watched title");
  }
}

export async function updateUserWatchedReaction(
  getToken: TokenGetter,
  titleId: string,
  reaction?: "up" | "down"
): Promise<void> {
  const response = await userFetch(getToken, `/api/user/watch-history/${encodeURIComponent(titleId)}`, {
    method: "PATCH",
    body: JSON.stringify({ reaction: reaction ?? null })
  });
  if (!response.ok) {
    throw new Error("Could not update watched reaction");
  }
}

export async function saveUserLibraryItem(
  getToken: TokenGetter,
  item: {
    title: Title;
    entryKind: "saved" | "watched";
    source: "solo" | "group";
    savedAt?: string;
    watchedAt?: string;
    reaction?: "up" | "down";
  }
): Promise<void> {
  const response = await userFetch(getToken, "/api/user/library", {
    method: "POST",
    body: JSON.stringify(item)
  });
  if (!response.ok) {
    throw new Error("Could not save library item");
  }
}

export async function removeUserSavedPick(getToken: TokenGetter, titleId: string): Promise<void> {
  const response = await userFetch(getToken, `/api/user/saved-picks/${encodeURIComponent(titleId)}`, {
    method: "DELETE"
  });
  if (!response.ok && response.status !== 404) {
    throw new Error("Could not remove saved pick");
  }
}

export function savedItemsToPicks(
  items: UserBootstrapPayload["savedItems"]
): SavedPickEntry[] {
  return items
    .filter((item) => item.entryKind === "saved" && item.title)
    .map((item) => ({
      title: item.title!,
      savedAt: item.savedAt ?? new Date().toISOString(),
      source: item.source
    }));
}
