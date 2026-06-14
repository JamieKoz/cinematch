import { useCallback, useEffect, useState } from "react";
import { AI_REQUESTS_PER_DECK, fetchAiQuota, isAiQuotaExhausted, type AiQuota } from "../services/aiQuota";

export function useAiQuotaStatus(enabled: boolean) {
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setQuota(null);
      setLoaded(true);
      return;
    }
    const next = await fetchAiQuota();
    setQuota(next);
    setLoaded(true);
  }, [enabled]);

  useEffect(() => {
    setLoaded(false);
    void refresh();
  }, [refresh]);

  const exhausted = isAiQuotaExhausted(quota);

  return {
    quota,
    loaded,
    exhausted,
    remainingDecks: quota?.limited ? Math.floor(quota.remaining / AI_REQUESTS_PER_DECK) : null,
    refresh
  };
}
