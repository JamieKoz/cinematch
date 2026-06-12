import { phaseAfterDeckExhausted, resultFromSingleKeep, retryAnswersAfterEmptyKeep } from "./swipeAdvance";
import { createInitialAnswers, createSession } from "./machine";
import type { OnboardingAnswers, SessionState } from "../types";

type SessionAction =
  | { type: "DECK_READY"; deck: string[] }
  | { type: "SWIPE"; action: "keep" | "pass"; titleId: string }
  | { type: "SHOWDOWN_PICK"; winnerId: string; loserId: string }
  | { type: "UPDATE_ANSWERS"; next: Partial<OnboardingAnswers> }
  | { type: "RESET_ROUND" };

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  if (action.type === "DECK_READY") {
    return {
      ...state,
      phase: "swipe",
      deck: action.deck,
      deckCursor: 0,
      shortlist: [],
      passed: [],
      showdownQueue: [],
      winnerId: undefined,
      backupId: undefined
    };
  }

  if (action.type === "SWIPE") {
    const shortlist = action.action === "keep" ? [...state.shortlist, action.titleId] : state.shortlist;
    const passed = action.action === "pass" ? [...state.passed, action.titleId] : state.passed;
    const nextCursor = state.deckCursor + 1;

    if (nextCursor >= state.deck.length) {
      const endPhase = phaseAfterDeckExhausted(shortlist, passed);
      if (endPhase === "showdown") {
        return {
          ...state,
          phase: "showdown",
          shortlist,
          passed,
          showdownQueue: [...shortlist]
        };
      }

      if (endPhase === "result") {
        const picked = resultFromSingleKeep(shortlist, passed)!;
        return {
          ...state,
          phase: "result",
          shortlist,
          passed,
          showdownQueue: [...shortlist],
          winnerId: picked.winnerId,
          backupId: picked.backupId
        };
      }

      return {
        ...state,
        phase: "questions",
        shortlist,
        passed,
        deck: [],
        deckCursor: 0,
        answers: retryAnswersAfterEmptyKeep(state.answers)
      };
    }

    return {
      ...state,
      shortlist,
      passed,
      deckCursor: nextCursor
    };
  }

  if (action.type === "SHOWDOWN_PICK") {
    const [first, second, ...rest] = state.showdownQueue;
    if (!first || !second) return state;

    const nextQueue = [...rest, action.winnerId];
    if (nextQueue.length === 1) {
      return {
        ...state,
        phase: "result",
        showdownQueue: nextQueue,
        winnerId: action.winnerId,
        backupId: action.loserId
      };
    }

    return {
      ...state,
      showdownQueue: nextQueue
    };
  }

  if (action.type === "UPDATE_ANSWERS") {
    return {
      ...state,
      answers: {
        ...state.answers,
        ...action.next
      }
    };
  }

  if (action.type === "RESET_ROUND") {
    const nextAnswers: OnboardingAnswers = createInitialAnswers({
      moods: state.answers.moods,
      quickModeId: undefined
    });
    return {
      ...createSession(nextAnswers),
      answers: nextAnswers
    };
  }

  return state;
}
