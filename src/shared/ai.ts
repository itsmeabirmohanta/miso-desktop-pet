import type { AIProvider, Settings } from "./types";
export interface AIConfig {
  provider: AIProvider;
  model: string;
  baseUrl: string;
  keyRequired: boolean;
}
export const providers: Record<
  AIProvider,
  { label: string; baseUrl: string; model: string; keyRequired: boolean }
> = {
  anthropic: {
    label: "Anthropic / Claude",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-6",
    keyRequired: true,
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "",
    keyRequired: true,
  },
  gemini: {
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "",
    keyRequired: true,
  },
  compatible: {
    label: "Other / OpenAI-compatible",
    baseUrl: "",
    model: "",
    keyRequired: true,
  },
  ollama: {
    label: "Ollama / local model",
    baseUrl: "http://localhost:11434/v1",
    model: "",
    keyRequired: false,
  },
};
export function aiConfig(settings: Settings): AIConfig {
  return {
    provider: settings.aiProvider,
    model: settings.model.trim(),
    baseUrl:
      settings.aiBaseUrl.trim() || providers[settings.aiProvider].baseUrl,
    keyRequired:
      settings.aiProvider === "ollama" || settings.aiProvider === "compatible"
        ? settings.aiKeyRequired
        : true,
  };
}
export function normalizeBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "Enter a valid API base URL, including https:// or http://localhost.",
    );
  }
  if (url.username || url.password || url.search || url.hash)
    throw new Error("Put credentials in the API key field, not the API URL.");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local))
    throw new Error(
      "Remote API endpoints require HTTPS. Localhost can use HTTP.",
    );
  return url.toString().replace(/\/+$/, "");
}
export function aiSecretName(config: AIConfig): string {
  return `ai:${config.provider}:${normalizeBaseUrl(config.baseUrl)}`;
}
