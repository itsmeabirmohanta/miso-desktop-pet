import { providers, providerBaseUrl, type AIConfig } from "../../shared/ai";
import type { AIModel, AIProvider } from "../../shared/types";
import { AICredentialError, AIServiceError, readAIResponse } from "./errors";

export function rankModels(models: AIModel[], provider: AIProvider): AIModel[] {
  const score = (id: string) => {
    let value = /preview|experimental|exp-|latest/.test(id) ? 0 : 30;
    if (provider === "gemini")
      value += /flash/.test(id) ? 100 : /pro/.test(id) ? 40 : 0;
    else if (provider === "anthropic")
      value += /haiku/.test(id) ? 100 : /sonnet/.test(id) ? 80 : 0;
    else value += /mini/.test(id) ? 100 : /nano/.test(id) ? 70 : 0;
    return value;
  };
  return [...models].sort(
    (a, b) =>
      score(b.id) - score(a.id) ||
      b.id.localeCompare(a.id, undefined, { numeric: true }),
  );
}

export async function discoverModels(
  config: AIConfig,
  key: string | undefined,
  transport: typeof fetch = fetch,
): Promise<AIModel[]> {
  if (config.keyRequired && !key)
    throw new AICredentialError(
      `Paste your ${providers[config.provider].label} API key first.`,
    );
  const headers: Record<string, string> = {};
  if (config.provider === "gemini") headers["x-goog-api-key"] = key!;
  else if (config.provider === "anthropic") {
    headers["x-api-key"] = key!;
    headers["anthropic-version"] = "2023-06-01";
  } else if (key) headers.Authorization = `Bearer ${key}`;
  const models = new Map<string, AIModel>();
  const base = providerBaseUrl(config.provider, config.baseUrl);
  let token = "";
  for (let page = 0; page < 20; page++) {
    const url = new URL(`${base}/models`);
    if (config.provider === "gemini") {
      url.searchParams.set("pageSize", "1000");
      if (token) url.searchParams.set("pageToken", token);
    } else if (config.provider === "anthropic") {
      url.searchParams.set("limit", "1000");
      if (token) url.searchParams.set("after_id", token);
    } else if (token) url.searchParams.set("after", token);
    let response: Response;
    try {
      response = await transport(url.toString(), {
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new AIServiceError(
        "Could not load models. Check your network, API base URL, or local AI server.",
        "AI_NETWORK",
      );
    }
    const body = await readAIResponse(response, config.provider);
    const entries = config.provider === "gemini" ? body.models : body.data;
    if (!Array.isArray(entries))
      throw new AIServiceError(
        "This endpoint does not provide a compatible model list. Enter a custom model ID instead.",
        "AI_RESPONSE",
      );
    for (const entry of entries) {
      const id =
        config.provider === "gemini"
          ? entry.name?.replace(/^models\//, "")
          : entry.id;
      if (
        typeof id !== "string" ||
        !id ||
        id.length > 200 ||
        /[\s\u0000-\u001f]/.test(id)
      )
        continue;
      if (
        config.provider === "gemini" &&
        !entry.supportedGenerationMethods?.includes("generateContent")
      )
        continue;
      if (
        /embed|image|tts|audio|realtime|transcrib|moderation|whisper|dall-e|sora|veo|live|deep-research/i.test(
          id,
        )
      )
        continue;
      if (
        config.provider === "openai" &&
        (!/^(gpt-|chatgpt-|o\d)/i.test(id) ||
          /codex|(?:^|-)pro(?:-|$)/i.test(id))
      )
        continue;
      if (entry.lifecycle === "retired") continue;
      const name = entry.displayName ?? entry.display_name ?? id;
      models.set(id, {
        id,
        label: typeof name === "string" ? name.slice(0, 200) : id,
      });
    }
    const next =
      config.provider === "gemini"
        ? body.nextPageToken
        : body.has_more
          ? (body.last_id ?? entries.at(-1)?.id)
          : "";
    if (!next) {
      if (!models.size)
        throw new AIServiceError(
          "No text-chat models were returned for this key. Check model access or enter a custom model ID.",
          "AI_MODEL",
        );
      return rankModels([...models.values()], config.provider);
    }
    if (typeof next !== "string" || next === token)
      throw new AIServiceError(
        "The provider returned an invalid model-list page. Try a custom model ID.",
        "AI_RESPONSE",
      );
    token = next;
  }
  throw new AIServiceError(
    "This provider’s model catalog is too large to load completely. Enter a custom model ID.",
    "AI_RESPONSE",
  );
}
