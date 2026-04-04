import type { OnboardingAnswers, TasteProfile, Title } from "../types";

export interface AiRerankRequest {
  answers: OnboardingAnswers;
  profile: TasteProfile;
  candidates: Title[];
}

export interface AiGenerateRequest {
  answers: OnboardingAnswers;
  profile: TasteProfile;
  count: number;
}

export interface AiSuggestedTitle {
  name: string;
  type: "movie" | "series";
  reason?: string;
}

export async function rerankCandidatesWithAi(req: AiRerankRequest): Promise<Title[]> {
  const config = getAiConfig();
  if (!config) return req.candidates;

  for (const model of config.models) {
    const orderedIds = await tryRerankWithModel({ ...req, apiKey: config.apiKey, baseUrl: config.baseUrl, model });
    if (orderedIds.length > 0) {
      return mapIdsToCandidates(orderedIds, req.candidates);
    }
  }

  return req.candidates;
}

export async function generateSuggestionsWithAi(req: AiGenerateRequest): Promise<AiSuggestedTitle[]> {
  const config = getAiConfig();
  if (!config) return [];

  for (const model of config.models) {
    const suggestions = await tryGenerateWithModel({ ...req, apiKey: config.apiKey, baseUrl: config.baseUrl, model });
    if (suggestions.length >= req.count) return suggestions.slice(0, req.count);
    if (suggestions.length > 0) return suggestions;
  }

  return [];
}

interface ModelAttempt extends AiRerankRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface GenerateModelAttempt extends AiGenerateRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
}

async function tryRerankWithModel(input: ModelAttempt): Promise<string[]> {
  const prompt = buildRerankPrompt(input);

  try {
    const response = await fetch(`${input.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: input.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a recommendation ranker. Return strict JSON only in the shape {\"orderedIds\":[...]}."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = safeParseJson(content) as { orderedIds?: string[] } | null;
    return parsed?.orderedIds ?? [];
  } catch {
    return [];
  }
}

async function tryGenerateWithModel(input: GenerateModelAttempt): Promise<AiSuggestedTitle[]> {
  const prompt = buildGeneratePrompt(input);

  try {
    const response = await fetch(`${input.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: input.model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You recommend watchable titles. Return strict JSON only in the shape {\"suggestions\":[{\"name\":\"\",\"type\":\"movie|series\",\"reason\":\"\"}]}"
          },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = safeParseJson(content) as { suggestions?: AiSuggestedTitle[] } | null;
    const suggestions = parsed?.suggestions ?? [];
    return normalizeSuggestions(suggestions, input.count);
  } catch {
    return [];
  }
}

function buildRerankPrompt(req: AiRerankRequest): string {
  const compactCandidates = req.candidates.map((title) => ({
    id: title.id,
    name: title.name,
    type: title.type,
    runtimeMinutes: title.runtimeMinutes,
    genres: title.genres,
    moods: title.moods,
    language: title.language,
    providers: title.providers
  }));

  return JSON.stringify({
    task: "Re-rank candidates based on user intent and preference signals.",
    rules: [
      "Keep items that match explicit answers highest.",
      "Use profile affinities as secondary signals.",
      "Prefer diverse top picks but still relevance-first.",
      "Return all candidate ids exactly once."
    ],
    answers: req.answers,
    profile: {
      genreAffinity: req.profile.genreAffinity,
      moodAffinity: req.profile.moodAffinity,
      runtimeAffinity: req.profile.runtimeAffinity,
      typeAffinity: req.profile.typeAffinity,
      languageAffinity: req.profile.languageAffinity,
      providerAffinity: req.profile.providerAffinity
    },
    candidates: compactCandidates,
    requiredOutput: { orderedIds: compactCandidates.map((title) => title.id) }
  });
}

function buildGeneratePrompt(req: AiGenerateRequest): string {
  return JSON.stringify({
    task: "Suggest titles the user is likely to choose now.",
    constraints: [
      `Return exactly ${req.count} suggestions if possible.`,
      "Use real well-known titles that can be found in TMDB.",
      "Do not include duplicates.",
      "Respect preferred type if user set one."
    ],
    answers: req.answers,
    profileSignals: {
      genreAffinity: req.profile.genreAffinity,
      moodAffinity: req.profile.moodAffinity,
      runtimeAffinity: req.profile.runtimeAffinity,
      typeAffinity: req.profile.typeAffinity,
      languageAffinity: req.profile.languageAffinity
    },
    outputShape: {
      suggestions: [
        { name: "string", type: "movie|series", reason: "short reason" }
      ]
    }
  });
}

function safeParseJson(content: string): unknown | null {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeSuggestions(suggestions: AiSuggestedTitle[], count: number): AiSuggestedTitle[] {
  const valid: AiSuggestedTitle[] = [];
  const seen = new Set<string>();

  for (const item of suggestions) {
    const name = item.name?.trim();
    const type = item.type === "series" ? "series" : item.type === "movie" ? "movie" : undefined;
    if (!name || !type) continue;
    const key = `${name.toLowerCase()}::${type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push({ name, type, reason: item.reason?.trim() });
    if (valid.length >= count) break;
  }

  return valid;
}

function mapIdsToCandidates(orderedIds: string[], candidates: Title[]): Title[] {
  const map = new Map(candidates.map((title) => [title.id, title]));
  const dedupedIds = Array.from(new Set(orderedIds)).filter((id) => map.has(id));
  const missing = candidates.filter((title) => !dedupedIds.includes(title.id)).map((title) => title.id);
  const finalIds = [...dedupedIds, ...missing];
  return finalIds.map((id) => map.get(id)).filter((title): title is Title => Boolean(title));
}

interface AiConfig {
  apiKey: string;
  baseUrl: string;
  models: string[];
}

function getAiConfig(): AiConfig | null {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  const baseUrl = (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined) ?? "https://api.openai.com/v1";
  const rawModels = (import.meta.env.VITE_AI_MODELS as string | undefined) ?? "gpt-4.1-mini";
  const models = rawModels
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  if (!apiKey || models.length === 0) return null;
  return { apiKey, baseUrl, models };
}
