import type { AIProvider } from "../../shared/types";
import { AIServiceError, readAIResponse } from "./errors";

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

// This only requests an AI interpretation/catalog. Calendar writes are never retried here.
export async function requestAI(
  url: string,
  init: RequestInit,
  provider: AIProvider,
  transport: typeof fetch,
): Promise<any> {
  const signal = init.signal ?? AbortSignal.timeout(45000);
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await transport(url, { ...init, signal, redirect: "error" });
    } catch {
      throw new AIServiceError(
        signal.aborted
          ? "Your AI service did not respond in time. Retry or choose a faster model."
          : "Could not reach your AI service. Check the API base URL, network or local server, then retry.",
        "AI_NETWORK",
      );
    }
    try {
      return await readAIResponse(response, provider);
    } catch (error) {
      if (
        !(error instanceof AIServiceError) ||
        error.code !== "AI_UNAVAILABLE" ||
        attempt >= 2
      )
        throw error;
      if (response.headers.get("x-should-retry") === "false") throw error;
      const retryAfter = response.headers.get("retry-after");
      const retryAfterMs =
        retryAfter && /^\d+(?:\.\d+)?$/.test(retryAfter)
          ? Number(retryAfter) * 1000
          : retryAfter
            ? Date.parse(retryAfter) - Date.now()
            : NaN;
      // Do not retry sooner than requested, or keep setup waiting for a long cooldown.
      if (Number.isFinite(retryAfterMs) && retryAfterMs > 5000) throw error;
      const wait = Number.isFinite(retryAfterMs)
        ? Math.max(0, retryAfterMs)
        : 500 * 2 ** attempt + Math.floor(Math.random() * 100);
      try {
        await pause(wait, signal);
      } catch {
        throw new AIServiceError(
          "Your AI request timed out while waiting to retry. Please try again.",
          "AI_NETWORK",
        );
      }
    }
  }
}
