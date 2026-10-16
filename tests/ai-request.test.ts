import { afterEach, describe, expect, it, vi } from "vitest";
import { requestAI } from "../src/main/nlu/request";
import { AIServiceError, readAIResponse } from "../src/main/nlu/errors";

const errorResponse = (
  status: number,
  message = "PRIVATE_KEY_TOKEN_URL_MUST_NOT_LEAK",
  headers?: HeadersInit,
) => new Response(JSON.stringify({ error: { message } }), { status, headers });

afterEach(() => vi.useRealTimers());

describe("AI request recovery", () => {
  it("stops after two retries and never exposes upstream details", async () => {
    const fetcher = vi.fn(async () =>
      errorResponse(503, undefined, { "retry-after": "0" }),
    );
    await expect(
      requestAI("https://example.test/v1", {}, "openai", fetcher),
    ).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
      message: expect.stringMatching(/temporarily unavailable.*503/),
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it.each([400, 401, 402, 403, 404, 422, 429])(
    "does not retry a %i request",
    async (status) => {
      const fetcher = vi.fn(async () => errorResponse(status));
      await expect(
        requestAI("https://example.test/v1", {}, "anthropic", fetcher),
      ).rejects.toBeInstanceOf(AIServiceError);
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it.each([{ "retry-after": "60" }, { "x-should-retry": "false" }] as Record<
    string,
    string
  >[])(
    "respects long cooldowns and explicit no-retry responses",
    async (headers) => {
      const fetcher = vi.fn(async () => errorResponse(503, undefined, headers));
      await expect(
        requestAI("https://example.test/v1", {}, "gemini", fetcher),
      ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it("honors backoff and preserves the same deadline between attempts", async () => {
    vi.useFakeTimers();
    const signal = new AbortController().signal;
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(init?.signal).toBe(signal);
      expect(init?.redirect).toBe("error");
      return fetcher.mock.calls.length === 1
        ? errorResponse(503)
        : new Response(JSON.stringify({ data: [] }));
    });
    const pending = requestAI(
      "https://example.test/v1",
      { signal },
      "openai",
      fetcher,
    );
    await vi.advanceTimersByTimeAsync(499);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(101);
    await expect(pending).resolves.toEqual({ data: [] });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("cancels a pending retry without making another request", async () => {
    const abort = new AbortController();
    const fetcher = vi.fn(async () => errorResponse(503));
    const pending = requestAI(
      "https://example.test/v1",
      { signal: abort.signal },
      "openai",
      fetcher,
    );
    const assertion = expect(pending).rejects.toMatchObject({
      code: "AI_TIMEOUT",
    });
    abort.abort();
    await assertion;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([
    [400, "thinkingLevel is not supported", "AI_THINKING"],
    [400, "Unknown name responseJsonSchema", "AI_SCHEMA"],
    [400, "responseMimeType is not supported", "AI_JSON_MODE"],
    [400, "systemInstruction is not supported", "AI_ROLE"],
    [400, "organization spend limit exceeded", "AI_BILLING"],
    [400, "maximum context length exceeded", "AI_CONTEXT"],
    [503, "overloaded", "AI_UNAVAILABLE"],
  ] as const)(
    "classifies %i errors without echoing details",
    async (status, diagnostic, code) => {
      const result = readAIResponse(
        errorResponse(
          status,
          `${diagnostic}: PRIVATE_KEY_TOKEN_URL_MUST_NOT_LEAK`,
        ),
        "gemini",
      );
      await expect(result).rejects.toMatchObject({ code });
      await expect(result).rejects.not.toThrow(
        "PRIVATE_KEY_TOKEN_URL_MUST_NOT_LEAK",
      );
    },
  );
  it("reports a timeout while reading the body without leaking upstream details", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(stream) {
              controller.signal.addEventListener("abort", () =>
                stream.error(new Error("PRIVATE_KEY_TOKEN_URL_MUST_NOT_LEAK")),
              );
            },
          }),
        ),
    );
    const pending = requestAI(
      "https://example.test/v1",
      { signal: controller.signal },
      "gemini",
      fetcher,
    );
    const assertion = expect(pending).rejects.toMatchObject({
      code: "AI_TIMEOUT",
      message: expect.stringMatching(/Gemini did not respond/),
    });
    controller.abort();
    await assertion;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
