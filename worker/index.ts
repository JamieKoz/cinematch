/// <reference types="@cloudflare/workers-types/2023-07-01" />

export interface Env {
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  AI_MODELS?: string;
  TMDB_READ_ACCESS_TOKEN?: string;
}

const OPENAI_PATH = "/api/openai/chat/completions";
const TMDB_PREFIX = "/api/tmdb";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function openAiBaseUrl(env: Env): string {
  const raw = (env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  return raw;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/config" && request.method === "GET") {
      const openaiModels = (env.AI_MODELS ?? "gpt-4.1-mini")
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      return json({
        ai: Boolean(env.OPENAI_API_KEY),
        tmdb: Boolean(env.TMDB_READ_ACCESS_TOKEN),
        openaiModels
      });
    }

    if (url.pathname === OPENAI_PATH && request.method === "POST") {
      const key = env.OPENAI_API_KEY;
      if (!key) return json({ error: "OpenAI is not configured" }, 503);

      const upstreamUrl = `${openAiBaseUrl(env)}/chat/completions`;
      const contentType = request.headers.get("content-type") ?? "application/json";

      const upstream = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": contentType
        },
        body: request.body
      });

      const headers = new Headers();
      const resCt = upstream.headers.get("content-type");
      if (resCt) headers.set("content-type", resCt);
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    if (url.pathname.startsWith(`${TMDB_PREFIX}/`) && request.method === "GET") {
      const token = env.TMDB_READ_ACCESS_TOKEN;
      if (!token) return json({ error: "TMDB is not configured" }, 503);

      const rest = url.pathname.slice(TMDB_PREFIX.length);
      const target = new URL(`https://api.themoviedb.org${rest}${url.search}`);

      return fetch(target, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "application/json"
        }
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return new Response(null, { status: 404 });
    }

    return new Response(null, { status: 404 });
  }
} satisfies ExportedHandler<Env>;
