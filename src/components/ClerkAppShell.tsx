import { ClerkProvider } from "@clerk/clerk-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadBackendConfig } from "../services/backendConfig";
import { clerkAppearance } from "./clerkAppearance";

const ClerkEnabledContext = createContext(false);

export function useClerkEnabled(): boolean {
  return useContext(ClerkEnabledContext);
}

function publishableKeyFromImportMeta(): string | null {
  const env = import.meta.env;
  for (const key of ["VITE_CLERK_PUBLISHABLE_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]) {
    const value = env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function ClerkAppShell({ children }: { children: ReactNode }) {
  const [publishableKey, setPublishableKey] = useState<string | null>(publishableKeyFromImportMeta);

  useEffect(() => {
    if (publishableKey) return;
    void loadBackendConfig().then((config) => {
      if (config.clerkPublishableKey) {
        setPublishableKey(config.clerkPublishableKey);
      }
    });
  }, [publishableKey]);

  if (!publishableKey) {
    return <ClerkEnabledContext.Provider value={false}>{children}</ClerkEnabledContext.Provider>;
  }

  return (
    <ClerkEnabledContext.Provider value={true}>
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/" appearance={clerkAppearance}>
        {children}
      </ClerkProvider>
    </ClerkEnabledContext.Provider>
  );
}
