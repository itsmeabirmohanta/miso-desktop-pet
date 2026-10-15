import { cleanAPIKey, providerBaseUrl, type AIConfig } from "../../shared/ai";
import type { AISetupInput } from "../../shared/types";
import { InputService } from "./input";
import { discoverModels } from "./models";
import { AIServiceError } from "./errors";

export function setupConfig(input: AISetupInput): AIConfig {
  return {
    provider: input.provider,
    baseUrl: providerBaseUrl(input.provider, input.baseUrl),
    keyRequired: ["compatible", "ollama"].includes(input.provider)
      ? input.keyRequired
      : true,
    model:
      input.provider === "gemini"
        ? (input.model?.trim().replace(/^models\//, "") ?? "")
        : (input.model?.trim() ?? ""),
  };
}

// Work with a draft. Failed tests must not replace a working key/model.
export async function verifyAISetup(
  input: AISetupInput,
  savedKey?: string,
  transport: typeof fetch = fetch,
): Promise<{ config: AIConfig; key: string | undefined }> {
  const config = setupConfig(input);
  const key = input.apiKey ? cleanAPIKey(input.apiKey) : savedKey;
  const automatic = !config.model || config.model === "auto";
  const candidates = automatic
    ? (await discoverModels(config, key, transport))
        .slice(0, 3)
        .map((m) => m.id)
    : [config.model];
  let failure: unknown;
  for (const model of candidates) {
    const selected = { ...config, model };
    try {
      const parser = new InputService(
        () => key,
        () => model,
        transport,
        () => selected,
      );
      const intent = await parser.parse(
        "Remind me to drink water tomorrow at 9am",
      );
      if (
        intent.action !== "create" ||
        !intent.start ||
        !intent.title.trim() ||
        intent.clarification_needed ||
        intent.confidence < 0.8
      )
        throw new Error(
          "This model did not interpret the connection test correctly. Choose another model.",
        );
      return { config: selected, key };
    } catch (error) {
      failure = error;
      if (
        !automatic ||
        (error instanceof AIServiceError &&
          ["AI_ACCESS", "AI_NETWORK"].includes(error.code))
      )
        throw error;
    }
  }
  throw (
    failure ??
    new Error(
      "No working model was found. Choose a different model or provider.",
    )
  );
}
