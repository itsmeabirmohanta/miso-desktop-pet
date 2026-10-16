import { describe, expect, it, vi } from "vitest";
import { discoverModels, rankModels } from "../src/main/nlu/models";
import { verifyAISetup } from "../src/main/nlu/configure";
import { readAIResponse, AICredentialError } from "../src/main/nlu/errors";
import {
  cleanAPIKey,
  detectKeyProvider,
  providerBaseUrl,
  providers,
  type AIConfig,
} from "../src/shared/ai";
const config: AIConfig = {
  provider: "gemini",
  model: "",
  baseUrl: providers.gemini.baseUrl,
  keyRequired: true,
};
const intent = {
  action: "create",
  category: "reminder",
  title: "Drink water",
  start: "2030-01-01T09:00:00Z",
  all_day: false,
  recurrence: null,
  reminders_minutes_before: [0],
  target_query: "",
  changes: {},
  confidence: 0.99,
  clarification_needed: null,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
describe("AI model discovery and setup", () => {
  it("loads every Gemini page, uses header auth and excludes non-text models", async () => {
    const transport = vi.fn(async (url: string, request?: RequestInit) => {
      expect(request?.headers).toHaveProperty("x-goog-api-key", "test-key");
      expect(url).not.toContain("test-key");
      return url.includes("pageToken=next")
        ? json({
            models: [
              {
                name: "models/gemini-3-flash",
                displayName: "Flash",
                supportedGenerationMethods: ["generateContent"],
              },
            ],
          })
        : json({
            models: [
              {
                name: "models/gemini-3-pro",
                supportedGenerationMethods: ["generateContent"],
              },
              {
                name: "models/text-embedding",
                supportedGenerationMethods: ["embedContent"],
              },
              {
                name: "models/gemini-3-image",
                supportedGenerationMethods: ["generateContent"],
              },
            ],
            nextPageToken: "next",
          });
    });
    const models = await discoverModels(
      config,
      "test-key",
      transport as typeof fetch,
    );
    expect(models.map((m) => m.id)).toEqual(["gemini-3-flash", "gemini-3-pro"]);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls[0][0]).toContain("pageSize=1000");
  });
  it("paginates Anthropic catalogs without guessing a model ID", async () => {
    const transport = vi.fn(async (url: string, request?: RequestInit) => {
      expect(request?.headers).toHaveProperty(
        "anthropic-version",
        "2023-06-01",
      );
      return url.includes("after_id=first")
        ? json({
            data: [{ id: "claude-haiku-new", display_name: "Haiku" }],
            has_more: false,
          })
        : json({ data: [{ id: "first" }], has_more: true, last_id: "first" });
    });
    const models = await discoverModels(
      {
        ...config,
        provider: "anthropic",
        baseUrl: providers.anthropic.baseUrl,
      },
      "test-key",
      transport as typeof fetch,
    );
    expect(models[0].id).toBe("claude-haiku-new");
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("filters unsupported OpenAI modalities and prefers a stable efficient model", async () => {
    const models = await discoverModels(
      { ...config, provider: "openai", baseUrl: providers.openai.baseUrl },
      "test-key",
      async () =>
        json({
          data: [
            { id: "gpt-next-mini" },
            { id: "text-embedding-3-small" },
            { id: "gpt-image-1" },
            { id: "whisper-1" },
            { id: "gpt-next-codex" },
          ],
        }),
    );
    expect(models.map((m) => m.id)).toEqual(["gpt-next-mini"]);
    expect(
      rankModels(
        [
          { id: "gemini-4-flash-preview", label: "Preview" },
          { id: "gemini-3-flash", label: "Stable" },
        ],
        "gemini",
      )[0].id,
    ).toBe("gemini-3-flash");
  });
  it("automatically verifies the discovered Gemini model and returns only a successful draft", async () => {
    const transport = vi.fn(async (url: string, request?: RequestInit) => {
      if (!request?.method)
        return json({
          models: [
            {
              name: "models/gemini-new-flash",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
        });
      expect(url).toBe(
        `${providers.gemini.baseUrl}/models/gemini-new-flash:generateContent`,
      );
      const payload = JSON.parse(request.body as string);
      expect(payload.generationConfig.responseJsonSchema.required).toContain(
        "action",
      );
      expect(request.headers).toHaveProperty("x-goog-api-key", "test-key");
      return json({
        candidates: [
          {
            content: { parts: [{ text: JSON.stringify(intent) }] },
            finishReason: "STOP",
          },
        ],
      });
    });
    const result = await verifyAISetup(
      {
        provider: "gemini",
        baseUrl: providers.gemini.baseUrl,
        keyRequired: true,
        apiKey: "Bearer test-key",
        model: "auto",
      },
      undefined,
      transport as typeof fetch,
    );
    expect(result.config.model).toBe("gemini-new-flash");
    expect(result.key).toBe("test-key");
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("tries another discovered model when the first model has no quota", async () => {
    let calls = 0;
    const result = await verifyAISetup(
      {
        provider: "compatible",
        baseUrl: "https://example.test/v1",
        keyRequired: false,
        model: "auto",
      },
      undefined,
      async (_url, request) => {
        if (!request?.method)
          return json({ data: [{ id: "new-mini" }, { id: "old-mini" }] });
        calls++;
        return calls === 1
          ? json({ error: { message: "private" } }, 429)
          : json({
              choices: [{ message: { content: JSON.stringify(intent) } }],
            });
      },
    );
    expect(calls).toBe(2);
    expect(result.config.model).toBe("new-mini");
  });
  it("tries another automatic model after a timeout, but stops on a network failure", async () => {
    const controllers = new Map<AbortSignal, AbortController>();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => {
      const controller = new AbortController();
      controllers.set(controller.signal, controller);
      return controller.signal;
    });
    try {
      for (const timedOut of [true, false]) {
        let calls = 0;
        const pending = verifyAISetup(
          {
            provider: "gemini",
            baseUrl: providers.gemini.baseUrl,
            keyRequired: true,
            model: "auto",
            apiKey: "synthetic-key",
          },
          undefined,
          async (_url, request) => {
            if (!request?.method)
              return json({
                models: [
                  {
                    name: "models/gemini-new-flash",
                    supportedGenerationMethods: ["generateContent"],
                  },
                  {
                    name: "models/gemini-old-flash",
                    supportedGenerationMethods: ["generateContent"],
                  },
                ],
              });
            if (++calls === 1) {
              if (timedOut) controllers.get(request.signal!)!.abort();
              throw new Error("private upstream details");
            }
            return json({
              candidates: [
                { content: { parts: [{ text: JSON.stringify(intent) }] } },
              ],
            });
          },
        );
        if (timedOut) {
          expect((await pending).config.model).toBe("gemini-new-flash");
          expect(calls).toBe(2);
        } else {
          await expect(pending).rejects.toMatchObject({ code: "AI_NETWORK" });
          expect(calls).toBe(1);
        }
      }
    } finally {
      timeout.mockRestore();
    }
  });
  it("tests a custom model even when a compatible server has no model-list API", async () => {
    const transport = vi.fn(async (url: string, request?: RequestInit) => {
      expect(url).toBe("http://localhost:11434/v1/chat/completions");
      expect(request?.headers).not.toHaveProperty("Authorization");
      return json({
        choices: [{ message: { content: JSON.stringify(intent) } }],
      });
    });
    await verifyAISetup(
      {
        provider: "ollama",
        baseUrl: "http://localhost:11434/v1",
        keyRequired: false,
        model: "local-model",
      },
      undefined,
      transport as typeof fetch,
    );
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("does not treat a parseable but incorrect connection-test answer as verification", async () => {
    await expect(
      verifyAISetup(
        {
          provider: "ollama",
          baseUrl: "http://localhost:11434/v1",
          keyRequired: false,
          model: "test",
        },
        undefined,
        async () =>
          json({
            choices: [
              {
                message: {
                  content: JSON.stringify({ ...intent, action: "query" }),
                },
              },
            ],
          }),
      ),
    ).rejects.toThrow("did not interpret");
  });
  it("never follows a provider redirect with credentials", async () => {
    const transport = vi.fn(async (_url: unknown, request?: RequestInit) => {
      expect(request?.redirect).toBe("error");
      throw new Error("private credential-bearing URL");
    });
    await expect(
      discoverModels(config, "test-key", transport as typeof fetch),
    ).rejects.toThrow("Could not load models");
  });
  it("normalizes copied keys and endpoint paths without rejecting unfamiliar key formats", () => {
    expect(cleanAPIKey('  "custom-provider-key"  ')).toBe(
      "custom-provider-key",
    );
    expect(cleanAPIKey("Bearer test-key")).toBe("test-key");
    expect(cleanAPIKey('"Bearer test-key"')).toBe("test-key");
    expect(detectKeyProvider("AIza-test")).toBe("gemini");
    expect(detectKeyProvider("unknown-provider-format")).toBeUndefined();
    expect(
      providerBaseUrl(
        "gemini",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
      ),
    ).toBe(providers.gemini.baseUrl);
    expect(providerBaseUrl("openai", "https://api.openai.com")).toBe(
      providers.openai.baseUrl,
    );
    expect(
      providerBaseUrl("compatible", "https://service.test/v1/chat/completions"),
    ).toBe("https://service.test/v1");
  });
});
describe("Gemini error reporting", () => {
  it.each([
    [400, "API_KEY_INVALID", /rejected access/],
    [403, "API_KEY_HTTP_REFERRER_BLOCKED", /restrictions/],
    [403, "PERMISSION_DENIED", /permissions/],
    [429, "RESOURCE_EXHAUSTED", /quota/],
  ])(
    "classifies %i %s without exposing remote error content",
    async (status, reason, message) => {
      const result = readAIResponse(
        json(
          {
            error: {
              message: "SECRET_KEY_MUST_NOT_LEAK",
              details: [{ reason }],
            },
          },
          status,
        ),
        "gemini",
      );
      await expect(result).rejects.toThrow(message);
      await expect(result).rejects.not.toThrow("SECRET_KEY_MUST_NOT_LEAK");
      if (status === 429)
        await expect(result).rejects.not.toBeInstanceOf(AICredentialError);
    },
  );
});
