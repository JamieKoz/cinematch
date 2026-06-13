import { SignedIn, useClerk, useUser } from "@clerk/clerk-react";

export function SignedInAccountSection() {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();

  if (!user) return null;

  const displayName = user.fullName?.trim() || user.username || "Account";
  const email = user.primaryEmailAddress?.emailAddress;

  return (
    <SignedIn>
      <div className="mb-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full border border-white/15 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-zinc-800 text-sm font-semibold text-zinc-200">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">{displayName}</p>
            {email ? <p className="truncate text-xs text-zinc-400">{email}</p> : null}
          </div>
        </div>
        <div className="mt-2 grid gap-1">
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-100 transition hover:bg-zinc-800/80"
            onClick={() => openUserProfile()}
          >
            Manage account
          </button>
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-800/80"
            onClick={() => void signOut({ redirectUrl: "/" })}
          >
            Sign out
          </button>
        </div>
      </div>
    </SignedIn>
  );
}
