import { requireClerkUserId } from "../auth";
import {
  addWatchedTitle,
  clearLatestDeck,
  getLatestDeck,
  getOrCreateTasteProfile,
  listLibraryItems,
  listWatchHistory,
  loadLastAnswers,
  removeLibraryItem,
  removeSavedPickByTitleId,
  saveDeck,
  saveLastAnswers,
  saveLibraryItem,
  saveTasteProfile,
  updateWatchedReaction,
  type DeckStateInput,
  type LibraryItemInput,
  type TasteProfileRow,
  type WatchedEntryInput
} from "../db/persistence";

export interface UserDataEnv {
  DB?: D1Database;
  CLERK_SECRET_KEY?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

async function requireDb(env: UserDataEnv): Promise<D1Database | Response> {
  if (!env.DB) {
    return json({ error: "Database is not configured" }, 503);
  }
  return env.DB;
}

async function requireUser(request: Request, env: UserDataEnv): Promise<string | Response> {
  return requireClerkUserId(request, env);
}

export async function handleUserDataRequest(request: Request, env: UserDataEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/user/")) {
    return null;
  }

  const dbOrError = await requireDb(env);
  if (dbOrError instanceof Response) return dbOrError;
  const db = dbOrError;

  const userOrError = await requireUser(request, env);
  if (userOrError instanceof Response) return userOrError;
  const clerkUserId = userOrError;

  if (url.pathname === "/api/user/profile" && request.method === "GET") {
    const profile = await getOrCreateTasteProfile(db, clerkUserId);
    const lastAnswers = await loadLastAnswers(db, clerkUserId);
    return json({ profile, lastAnswers });
  }

  if (url.pathname === "/api/user/profile" && request.method === "PUT") {
    const payload = (await request.json().catch(() => null)) as {
      profile?: TasteProfileRow;
      lastAnswers?: Record<string, unknown>;
    } | null;
    if (!payload?.profile) {
      return json({ error: "profile is required" }, 400);
    }
    const profile = await saveTasteProfile(db, clerkUserId, payload.profile);
    if (payload.lastAnswers) {
      await saveLastAnswers(db, clerkUserId, payload.lastAnswers);
    }
    return json({ profile });
  }

  if (url.pathname === "/api/user/answers" && request.method === "PUT") {
    const payload = (await request.json().catch(() => null)) as { answers?: Record<string, unknown> } | null;
    if (!payload?.answers) {
      return json({ error: "answers is required" }, 400);
    }
    await saveLastAnswers(db, clerkUserId, payload.answers);
    return json({ ok: true });
  }

  if (url.pathname === "/api/user/watch-history" && request.method === "GET") {
    const items = await listWatchHistory(db, clerkUserId);
    return json({ items });
  }

  if (url.pathname === "/api/user/watch-history" && request.method === "POST") {
    const payload = (await request.json().catch(() => null)) as WatchedEntryInput | null;
    if (!payload?.title || !payload.watchedAt || !payload.source) {
      return json({ error: "Invalid watched entry" }, 400);
    }
    const created = await addWatchedTitle(db, clerkUserId, payload);
    return json(created, 201);
  }

  const watchReactionMatch = url.pathname.match(/^\/api\/user\/watch-history\/([^/]+)$/);
  if (watchReactionMatch && request.method === "PATCH") {
    const titleId = decodeURIComponent(watchReactionMatch[1] ?? "");
    const payload = (await request.json().catch(() => null)) as { reaction?: "up" | "down" | null } | null;
    const updated = await updateWatchedReaction(db, clerkUserId, titleId, payload?.reaction ?? undefined);
    if (!updated) return json({ error: "Not found" }, 404);
    return json({ item: updated });
  }

  if (url.pathname === "/api/user/library" && request.method === "GET") {
    const entryKind = url.searchParams.get("kind");
    const filters =
      entryKind === "saved" || entryKind === "watched"
        ? ({ entryKind } as const)
        : undefined;
    const items = await listLibraryItems(db, clerkUserId, filters);
    return json({ items });
  }

  if (url.pathname === "/api/user/library" && request.method === "POST") {
    const payload = (await request.json().catch(() => null)) as LibraryItemInput | null;
    if (!payload?.title || !payload.entryKind || !payload.source) {
      return json({ error: "Invalid library item" }, 400);
    }
    const created = await saveLibraryItem(db, clerkUserId, payload);
    return json(created, 201);
  }

  const libraryItemMatch = url.pathname.match(/^\/api\/user\/library\/([^/]+)$/);
  if (libraryItemMatch && request.method === "DELETE") {
    const itemId = decodeURIComponent(libraryItemMatch[1] ?? "");
    const removed = await removeLibraryItem(db, clerkUserId, itemId);
    if (!removed) return json({ error: "Not found" }, 404);
    return json({ ok: true });
  }

  const savedPickMatch = url.pathname.match(/^\/api\/user\/saved-picks\/([^/]+)$/);
  if (savedPickMatch && request.method === "DELETE") {
    const titleId = decodeURIComponent(savedPickMatch[1] ?? "");
    const removed = await removeSavedPickByTitleId(db, clerkUserId, titleId);
    if (!removed) return json({ error: "Not found" }, 404);
    return json({ ok: true });
  }

  if (url.pathname === "/api/user/deck/latest" && request.method === "GET") {
    const deck = await getLatestDeck(db, clerkUserId);
    return json({ deck });
  }

  if (url.pathname === "/api/user/deck" && request.method === "PUT") {
    const payload = (await request.json().catch(() => null)) as DeckStateInput | null;
    if (!payload?.session || !Array.isArray(payload.catalog) || !payload.savedAt) {
      return json({ error: "Invalid deck state" }, 400);
    }
    await saveDeck(db, clerkUserId, payload);
    return json({ ok: true });
  }

  if (url.pathname === "/api/user/deck" && request.method === "DELETE") {
    const sessionId = url.searchParams.get("sessionId") ?? undefined;
    await clearLatestDeck(db, clerkUserId, sessionId ?? undefined);
    return json({ ok: true });
  }

  if (url.pathname === "/api/user/bootstrap" && request.method === "GET") {
    const [profile, lastAnswers, savedItems, watchedItems, deck] = await Promise.all([
      getOrCreateTasteProfile(db, clerkUserId),
      loadLastAnswers(db, clerkUserId),
      listLibraryItems(db, clerkUserId, { entryKind: "saved" }),
      listWatchHistory(db, clerkUserId),
      getLatestDeck(db, clerkUserId)
    ]);
    return json({ profile, lastAnswers, savedItems, watchedItems, deck });
  }

  return json({ error: "Not found" }, 404);
}
