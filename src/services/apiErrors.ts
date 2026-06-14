import { DAILY_LIMIT_USER_MESSAGE } from "./quotaMessages";

export class ApiGateError extends Error {
  readonly status: number;
  readonly code: "turnstile" | "rate_limit" | "unknown";

  constructor(message: string, status: number, code: ApiGateError["code"]) {
    super(message);
    this.name = "ApiGateError";
    this.status = status;
    this.code = code;
  }
}

export function isOpenAiCompletionsUrl(url: string): boolean {
  return url.includes("/api/openai/chat/completions");
}

export async function throwIfApiGateError(response: Response): Promise<void> {
  if (response.status !== 403 && response.status !== 429) return;

  let message = response.status === 429 ? "Daily AI limit reached" : "Verification failed";
  try {
    const body = (await response.clone().json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    /* ignore */
  }

  const code =
    response.status === 429 ? "rate_limit" : response.status === 403 ? "turnstile" : "unknown";
  throw new ApiGateError(message, response.status, code);
}

export function apiGateErrorReason(error: unknown): "rate_limit" | "turnstile" | "other" | null {
  if (!(error instanceof ApiGateError)) return null;
  if (error.code === "rate_limit" || error.code === "turnstile") return error.code;
  return "other";
}

export function apiGateUserMessage(error: unknown): string | null {
  if (!(error instanceof ApiGateError)) return null;
  if (error.code === "rate_limit") {
    return DAILY_LIMIT_USER_MESSAGE;
  }
  if (error.code === "turnstile") {
    return "Security check failed. Refresh the page and try again.";
  }
  return error.message;
}
