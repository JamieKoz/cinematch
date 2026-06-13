import { useEffect, useState } from "react";
import { buildTitleSharePayload, isShareCancelled } from "../services/shareTitle";
import type { Title } from "../types";

export function useShareCurrentTitle(currentTitle?: Title) {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!shareFeedback) return;
    const timer = window.setTimeout(() => setShareFeedback(null), 1800);
    return () => window.clearTimeout(timer);
  }, [shareFeedback]);

  async function handleShareCurrentTitle() {
    if (!currentTitle) return;
    const payload = buildTitleSharePayload(currentTitle);

    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        if (!navigator.canShare || navigator.canShare(payload)) {
          await navigator.share(payload);
          setShareFeedback("Shared");
          return;
        }
      }
    } catch (error) {
      if (isShareCancelled(error)) return;
      // fall through to clipboard
    }

    try {
      const clipboardText = payload.url ? `${payload.text}\n${payload.url}` : payload.text!;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clipboardText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = clipboardText;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setShareFeedback("Copied");
    } catch {
      setShareFeedback("Unable to share");
    }
  }

  return {
    shareFeedback,
    handleShareCurrentTitle
  };
}
