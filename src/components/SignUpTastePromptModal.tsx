import { SignUpButton, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

export function SignUpTastePromptModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      onClose();
    }
  }, [isLoaded, isSignedIn, onClose]);

  if (!open || !isLoaded || isSignedIn) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-violet-300/25 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="signup-taste-prompt-title"
        aria-modal="true"
      >
        <h3 id="signup-taste-prompt-title" className="text-lg font-semibold text-white">
          Keep your taste profile
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">
          Sign up to save what Sententia learned from your swipes. Your recommendations will keep
          getting sharper as your profile grows with every round.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <SignUpButton mode="modal">
            <button
              type="button"
              className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/35 transition hover:brightness-110 active:scale-95 active:brightness-95"
              onClick={onClose}
            >
              Sign up free
            </button>
          </SignUpButton>
          <button
            type="button"
            className="rounded-full border border-white/25 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-100 transition hover:bg-zinc-800/75 active:scale-95"
            onClick={onClose}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
