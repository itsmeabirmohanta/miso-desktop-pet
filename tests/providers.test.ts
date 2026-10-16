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
  const responseFor = (provider: AIConfig["provider"]) =>
    provider === "gemini"
      ? {
          candidates: [
            { content: { parts: [{ text: JSON.stringify(intent) }] } },
          ],
        }
      : provider === "anthropic"
        ? { content: [{ type: "text", text: JSON.stringify(intent) }] }
        : { choices: [{ message: { content: JSON.stringify(intent) } }] };
  it.each(["anthropic", "gemini", "openai", "compatible", "ollama"] as const)(
    "recovers from a temporary 503 on %s without replaying a calendar action",
    async (provider) => {
      const fetcher = vi.fn(async () =>
        fetcher.mock.calls.length === 1
          ? new Response(
              JSON.stringify({
                error: { message: "private upstream details" },
              }),
              {
                status: 503,
                headers: { "retry-after": "0" },
              },
            )
          : new Response(JSON.stringify(responseFor(provider))),
      );
      const service = new InputService(
        () => "synthetic-key",
        () => "test",
        fetcher,
        () => ({
          provider,
          model: "test",
          baseUrl: providers[provider].baseUrl || "https://example.test/v1",
          keyRequired: provider !== "ollama",
        }),
      );
      expect(await service.parse("Water tomorrow")).toEqual(intent);
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );
  it("normalizes a pasted completion URL during scheduling", async () => {
    const { service, fetcher } = fixture({
      provider: "compatible",
      model: "test",
      baseUrl: "https://example.test/v1/chat/completions/",
      keyRequired: true,
    });
    await service.parse("Water");
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://example.test/v1/chat/completions",
    );
  });
  it.each(["o3-mini", "gpt-5-mini", "gpt-6.1-sol"])(
    "uses developer instructions for OpenAI reasoning model %s",
    async (model) => {
      const { service, fetcher } = fixture({
        provider: "openai",
        model,
        baseUrl: providers.openai.baseUrl,
        keyRequired: true,
      });
      await service.parse("Water");
      expect(
        JSON.parse(fetcher.mock.calls[0][1]!.body as string).messages[0].role,
      ).toBe("developer");
    },
  );
  it("can use an older OpenAI model without system/developer role support", async () => {
    const { service, fetcher } = fixture({
      provider: "openai",
      model: "o1-mini",
      baseUrl: providers.openai.baseUrl,
      keyRequired: true,
    });
    await service.parse("Water");
    const body = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toContain("Current local time");
    expect(body.messages[0].content).toContain("Water");
  });
  it("negotiates Gemini schema, JSON mode and instruction support while retaining local validation", async () => {
    const payloads: any[] = [];
    const errors = [
      "Unknown name responseJsonSchema at generationConfig",
      "responseMimeType application/json is not supported",
      "systemInstruction is not supported for this model",
    ];
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      payloads.push(JSON.parse(init!.body as string));
      const message = errors.shift();
      return new Response(
        JSON.stringify(
          message ? { error: { message } } : responseFor("gemini"),
        ),
        { status: message ? 400 : 200 },
      );
    });
    const service = new InputService(
      () => "synthetic-key",
      () => "test",
      fetcher,
      () => ({
        provider: "gemini",
        model: "test",
        baseUrl: providers.gemini.baseUrl,
        keyRequired: true,
      }),
    );
    expect(await service.parse("Water")).toEqual(intent);
    expect(payloads[0].generationConfig).toHaveProperty("responseJsonSchema");
    expect(payloads[1].generationConfig).not.toHaveProperty(
      "responseJsonSchema",
    );
    expect(payloads[2]).not.toHaveProperty("generationConfig");
    expect(payloads[3]).not.toHaveProperty("systemInstruction");
    expect(payloads[3].contents[0].parts[0].text).toContain(
      "Current local time",
    );
  });
  it("still rejects unsafe model output after a Gemini compatibility fallback", async () => {
    let calls = 0;
    const service = new InputService(
      () => "synthetic-key",
      () => "test",
      async () => {
        calls++;
        return new Response(
          JSON.stringify(
            calls === 1
              ? { error: { message: "responseJsonSchema is not supported" } }
              : {
                  candidates: [
                    {
                      content: {
                        parts: [
                          {
                            text: JSON.stringify({
                              ...intent,
                              api_key: "private",
                            }),
                          },
                        ],
                      },
                    },
                  ],
                },
          ),
          { status: calls === 1 ? 400 : 200 },
        );
      },
      () => ({
        provider: "gemini",
        model: "test",
        baseUrl: providers.gemini.baseUrl,
        keyRequired: true,
      }),
    );
    await expect(service.parse("Water")).rejects.toThrow(
      "could not safely understand",
    );
    expect(calls).toBe(2);
  });
  it("retries an explicitly unsupported role once on a compatible server", async () => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(init!.body as string);
      return new Response(
        JSON.stringify(
          body.messages[0].role === "system"
            ? {
                error: {
                  message:
                    "Unsupported value messages[0].role: system is not supported",
                },
              }
            : responseFor("compatible"),
        ),
        { status: body.messages[0].role === "system" ? 400 : 200 },
      );
    });
    const service = new InputService(
      () => "synthetic-key",
      () => "test",
      fetcher,
      () => ({
        provider: "compatible",
        model: "test",
        baseUrl: "https://example.test/v1",
        keyRequired: true,
      }),
    );
    expect(await service.parse("Water")).toEqual(intent);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
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
