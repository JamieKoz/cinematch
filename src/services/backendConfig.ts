export type BackendConfig = {
  ai: boolean;
  tmdb: boolean;
  openaiModels: string[];
};

let cached: Promise<BackendConfig> | null = null;

export function loadBackendConfig(): Promise<BackendConfig> {
  if (!cached) {
    cached = fetch("/api/config")
      .then(async (response) => {
        if (!response.ok) {
          return { ai: false, tmdb: false, openaiModels: [] };
        }
        return response.json() as Promise<BackendConfig>;
      })
      .catch(() => ({ ai: false, tmdb: false, openaiModels: [] }));
  }
  return cached;
}

export function resetBackendConfigCache(): void {
  cached = null;
}
