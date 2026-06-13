import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ClerkAppShell } from "./components/ClerkAppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SessionStoreProvider } from "./state/sessionStore";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkAppShell>
      <SessionStoreProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </SessionStoreProvider>
    </ClerkAppShell>
  </React.StrictMode>
);
