import { SignInButton, SignUpButton, SignedOut } from "@clerk/clerk-react";

export function AuthHeaderButtons() {
  return (
    <SignedOut>
      <div className="flex items-center gap-2 sm:gap-3">
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs font-medium text-zinc-300 underline-offset-2 transition hover:text-white hover:underline sm:text-sm"
          >
            Log in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:brightness-110 active:scale-95 active:brightness-95 sm:px-4 sm:py-2 sm:text-sm"
          >
            Sign up
          </button>
        </SignUpButton>
      </div>
    </SignedOut>
  );
}
