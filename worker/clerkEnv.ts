/** Worker env may use any of these names for the Clerk publishable key. */
export function clerkPublishableKeyFromEnv(env: {
  CLERK_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  VITE_CLERK_PUBLISHABLE_KEY?: string;
}): string | null {
  for (const value of [
    env.CLERK_PUBLISHABLE_KEY,
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    env.VITE_CLERK_PUBLISHABLE_KEY
  ]) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
