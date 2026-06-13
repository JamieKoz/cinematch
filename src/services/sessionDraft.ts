import type { SessionState, Title } from "../types";
import type { SessionDraft } from "./storage";
import { clearSessionDraft, loadSessionDraft, saveSessionDraft } from "./storage";

function sessionTitleIds(session: SessionState): string[] {
  return [
    ...session.deck,
    ...session.shortlist,
    ...session.passed,
    ...session.showdownQueue,
    ...(session.winnerId ? [session.winnerId] : []),
    ...(session.backupId ? [session.backupId] : [])
  ];
}

/** Catalog entries referenced by the in-flight solo session (deck + shortlist + showdown). */
export function catalogForSessionDraft(session: SessionState, catalog: Title[]): Title[] {
  const ids = new Set(sessionTitleIds(session));
  const byId = new Map(catalog.map((title) => [title.id, title]));
  return [...ids].map((id) => byId.get(id)).filter((title): title is Title => Boolean(title));
}

export function buildSessionDraft(session: SessionState, catalog: Title[]): SessionDraft | null {
  if (session.phase !== "swipe" && session.phase !== "showdown") return null;
  return {
    session: {
      ...session,
      phase: session.phase
    },
    catalog: catalogForSessionDraft(session, catalog),
    savedAt: new Date().toISOString()
  };
}

export function persistSessionDraftIfNeeded(session: SessionState, catalog: Title[]): void {
  if (session.phase === "result") {
    clearSessionDraft();
    return;
  }

  const draft = buildSessionDraft(session, catalog);
  if (draft) {
    saveSessionDraft(draft);
    return;
  }

  // Keep a draft from a previous visit (new sessionId) so "Resume where you left off" works
  // after reload. Clear only when this session intentionally returned to questions.
  if (session.phase === "questions") {
    const existing = loadSessionDraft();
    if (existing && existing.session.sessionId === session.sessionId) {
      clearSessionDraft();
    }
  }
}

export function hasResumableSessionDraft(): boolean {
  return loadSessionDraft() !== null;
}
