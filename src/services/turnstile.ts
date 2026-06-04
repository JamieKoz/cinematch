const TURNSTILE_WAIT_MS = 15_000;

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widgetId: string, options?: Record<string, unknown>) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let widgetId: string | null = null;
let container: HTMLDivElement | null = null;
let configuredSiteKey: string | null = null;
let apiReadyPromise: Promise<TurnstileApi> | null = null;

function waitForTurnstileApi(): Promise<TurnstileApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile requires a browser"));
  }

  const existing = window.turnstile;
  if (existing?.render) return Promise.resolve(existing);

  if (apiReadyPromise) return apiReadyPromise;

  apiReadyPromise = new Promise((resolve, reject) => {
    const started = Date.now();

    const tick = () => {
      const api = window.turnstile;
      if (api?.render) {
        resolve(api);
        return;
      }
      if (Date.now() - started >= TURNSTILE_WAIT_MS) {
        reject(new Error("Turnstile API unavailable"));
        return;
      }
      window.setTimeout(tick, 50);
    };

    tick();
  });

  return apiReadyPromise;
}

function ensureContainer(): HTMLDivElement {
  if (container) return container;
  container = document.createElement("div");
  container.id = "turnstile-host";
  container.className = "sr-only";
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);
  return container;
}

export function configureTurnstile(siteKey: string | null | undefined): void {
  const key = siteKey?.trim();
  if (!key) {
    configuredSiteKey = null;
    return;
  }
  if (configuredSiteKey === key) return;
  configuredSiteKey = key;
  widgetId = null;
  void waitForTurnstileApi().catch(() => {
    /* preload; failures surface on getTurnstileToken */
  });
}

export function isTurnstileConfigured(): boolean {
  return Boolean(configuredSiteKey);
}

async function ensureWidget(): Promise<string> {
  const siteKey = configuredSiteKey;
  if (!siteKey) throw new Error("Turnstile is not configured");

  const api = await waitForTurnstileApi();
  if (widgetId) return widgetId;

  const id = api.render(ensureContainer(), {
    sitekey: siteKey,
    size: "invisible",
    execution: "execute",
    appearance: "interaction-only"
  });
  widgetId = id;
  return id;
}

export async function getTurnstileToken(): Promise<string> {
  const id = await ensureWidget();
  const api = await waitForTurnstileApi();

  return new Promise((resolve, reject) => {
    api.execute(id, {
      callback: (token: string) => {
        api.reset(id);
        resolve(token);
      },
      "error-callback": () => reject(new Error("Turnstile challenge failed")),
      "expired-callback": () => reject(new Error("Turnstile challenge expired"))
    });
  });
}
