import { describe, it, expect, vi } from "vitest";
import { InputService, AICredentialError } from "../src/main/nlu/input";
import {
  normalizeBaseUrl,
  aiSecretName,
  providers,
  type AIConfig,
} from "../src/shared/ai";
const intent = {
  action: "create",
  category: "reminder",
  title: "Water",
  start: "2026-10-10T09:00:00Z",
  all_day: false,
  recurrence: null,
  reminders_minutes_before: [0],
  target_query: "",
  changes: {},
  confidence: 0.99,
  clarification_needed: null,
};
function fixture(
  config: AIConfig,
  key: string | null = "secret-key",
  status = 200,
) {
  const body =
    config.provider === "gemini"
      ? {
          candidates: [
            {
              content: { parts: [{ text: JSON.stringify(intent) }] },
              finishReason: "STOP",
            },
          ],
        }
      : config.provider === "anthropic"
        ? { content: [{ type: "text", text: JSON.stringify(intent) }] }
        : {
            choices: [
              {
                message: { content: JSON.stringify(intent) },
                finish_reason: "stop",
              },
            ],
          };
  const fetcher = vi.fn(
    async (_url: unknown, _options?: RequestInit) =>
      new Response(JSON.stringify(body), { status }),
  );
  return {
    service: new InputService(
      () => key ?? undefined,
      () => config.model,
      fetcher as typeof fetch,
      () => config,
    ),
    fetcher,
  };
}
describe("AI providers", () => {
  it.each(["anthropic", "gemini", "openai", "compatible", "ollama"] as const)(
    "parses and validates %s responses",
    async (provider) => {
      const config = {
        provider,
        model: "my-model",
        baseUrl: providers[provider].baseUrl || "https://example.test/v1",
        keyRequired: provider !== "ollama",
      };
      const { service, fetcher } = fixture(config);
      expect(await service.parse("Water tomorrow")).toEqual(intent);
      const init = fetcher.mock.calls[0][1]!;
      expect(init.redirect).toBe("error");
      expect(init.headers).not.toHaveProperty("apiKey");
    },
  );
  it("uses the configured compatible endpoint and bearer key", async () => {
    const { service, fetcher } = fixture({
      provider: "compatible",
      model: "vendor/model",
      baseUrl: "https://vendor.example/api/v1/",
      keyRequired: true,
    });
    await service.parse("Water");
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://vendor.example/api/v1/chat/completions",
    );
    expect(fetcher.mock.calls[0][1]?.headers).toHaveProperty(
      "Authorization",
      "Bearer secret-key",
    );
    const body = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
    expect(body.model).toBe("vendor/model");
    expect(body).not.toHaveProperty("temperature");
  });
  it("calls an unauthenticated local server without a key", async () => {
    const { service, fetcher } = fixture(
      {
        provider: "ollama",
        model: "local:model",
        baseUrl: "http://localhost:11434/v1",
        keyRequired: false,
      },
      null,
    );
    await service.parse("Water");
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty(
      "Authorization",
    );
  });
  it("uses Gemini key headers rather than URL credentials", async () => {
    const { service, fetcher } = fixture({
      provider: "gemini",
      model: "models/example-model",
      baseUrl: providers.gemini.baseUrl,
      keyRequired: true,
    });
    await service.parse("Water");
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/example-model:generateContent",
    );
    expect(fetcher.mock.calls[0][1]?.headers).toHaveProperty(
      "x-goog-api-key",
      "secret-key",
    );
  });
  it("rejects remote plaintext transport and credential-bearing URLs", () => {
    for (const url of [
      "http://remote.example/v1",
      "https://user:pass@example.test/v1",
      "https://example.test/v1?key=secret",
      "file:///path",
      "not a url",
    ])
      expect(() => normalizeBaseUrl(url)).toThrow();
    expect(normalizeBaseUrl("http://[::1]:8080/v1/")).toBe(
      "http://[::1]:8080/v1",
    );
  });
  it("isolates stored keys by provider and endpoint", () => {
    const c: AIConfig = {
      provider: "compatible",
      model: "model",
      baseUrl: "https://one.test/v1",
      keyRequired: true,
    };
    expect(aiSecretName(c)).not.toBe(
      aiSecretName({ ...c, baseUrl: "https://two.test/v1" }),
    );
    expect(aiSecretName(c)).not.toBe(
      aiSecretName({ ...c, provider: "openai" }),
    );
  });
  it("surfaces rejected credentials without remote response text or secrets", async () => {
    const { service } = fixture(
      {
        provider: "openai",
        model: "test",
        baseUrl: providers.openai.baseUrl,
        keyRequired: true,
      },
      "secret",
      401,
    );
    await expect(service.parse("Water")).rejects.toBeInstanceOf(
      AICredentialError,
    );
  });
  it("does not call the service when a required key is missing", async () => {
    const { service, fetcher } = fixture(
      {
        provider: "openai",
        model: "test",
        baseUrl: providers.openai.baseUrl,
        keyRequired: true,
      },
      null,
    );
    await expect(service.parse("Water")).rejects.toThrow("API key");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
