import { useAuth } from "@clerk/clerk-react";
import { useEffect, useRef } from "react";
import { createInitialAnswers } from "../state/machine";
import { configurePersistenceAuth } from "../services/persistenceBridge";
import { fetchUserBootstrap, savedItemsToPicks } from "../services/userApi";
import { saveSessionDraftLocalOnly } from "../services/storage";
import type { OnboardingAnswers, TasteProfile } from "../types";
import type { SavedPickEntry, WatchedTitleEntry } from "../services/storage";

export function AuthPersistenceSync({
  setProfile,
  setSessionAnswers,
  setSavedPicks,
  setWatchedTitles
}: {
  setProfile: (profile: TasteProfile) => void;
  setSessionAnswers: (answers: OnboardingAnswers) => void;
  setSavedPicks: (items: SavedPickEntry[]) => void;
  setWatchedTitles: (items: WatchedTitleEntry[]) => void;
}) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const hydratedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      configurePersistenceAuth({
        signedIn: false,
        getToken: async () => null
      });
      hydratedForUserRef.current = null;
      return;
    }

    if (hydratedForUserRef.current === userId) {
      configurePersistenceAuth({
        signedIn: true,
        getToken: async () => getToken()
      });
      return;
    }

    let cancelled = false;

    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      try {
        const data = await fetchUserBootstrap(async () => token);
        if (cancelled) return;

        hydratedForUserRef.current = userId;
        setProfile(data.profile);
        setSessionAnswers(createInitialAnswers(data.lastAnswers));
        setSavedPicks(savedItemsToPicks(data.savedItems));
        setWatchedTitles(data.watchedItems);
        if (data.deck) {
          // Local only during hydration — remote sync is enabled after bootstrap.
          saveSessionDraftLocalOnly(data.deck);
        }
        configurePersistenceAuth({
          signedIn: true,
          getToken: async () => getToken()
        });
      } catch (error) {
        console.warn("Could not hydrate user data from server", error);
        configurePersistenceAuth({
          signedIn: false,
          getToken: async () => null
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId, getToken, setProfile, setSessionAnswers, setSavedPicks, setWatchedTitles]);

  return null;
}
