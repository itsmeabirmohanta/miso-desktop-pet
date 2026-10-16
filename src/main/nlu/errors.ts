import type { AIProvider } from "../../shared/types";
import { providers } from "../../shared/ai";
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}
export class AICredentialError extends AIServiceError {
  constructor(message: string) {
    super(message, "AI_ACCESS");
  }
}
export async function readAIResponse(
  response: Response,
  provider: AIProvider,
): Promise<any> {
  let body: any;
  try {
    body = await response.json();
  } catch {
    if (response.ok)
      throw new AIServiceError(
        "The AI endpoint did not return JSON. Check its API base URL.",
        "AI_RESPONSE",
      );
  }
  if (response.ok) {
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new AIServiceError(
        "The AI endpoint returned an incompatible response. Check the API base URL.",
        "AI_RESPONSE",
      );
    return body;
  }
  // Interpret only known reason codes. Never expose a remote message, request or key.
  const reasons: string[] = (
    Array.isArray(body?.error?.details) ? body.error.details : []
  ).flatMap((d: any) => (typeof d?.reason === "string" ? [d.reason] : []));
  if (
    provider === "gemini" &&
    reasons.some((r) =>
      /API_KEY_(?:HTTP_REFERRER|IP_ADDRESS|SERVICE)_BLOCKED/.test(r),
    )
  )
    throw new AICredentialError(
      "Gemini rejected this key’s restrictions. In Google AI Studio / Google Cloud, allow the Generative Language API and a desktop client (website-referrer restrictions do not work for MISO).",
    );
  if (reasons.includes("API_KEY_INVALID") || response.status === 401)
    throw new AICredentialError(
      "Your AI service rejected access. Check that this is the selected provider’s API key, not a chat subscription or OAuth client secret.",
    );
  if (response.status === 403)
    throw new AICredentialError(
      provider === "gemini"
        ? "Gemini denied access. Check the key’s project permissions, API restrictions, supported region and Generative Language API access. The key may be valid but restricted."
        : "This provider denied access. Check the key’s model permissions, project access and account eligibility.",
    );
  if (response.status === 429)
    throw new AIServiceError(
      "Your AI service is rate limited or its quota is exhausted. Check your project’s quota/billing or wait and retry. This does not mean the key is invalid.",
      "AI_QUOTA",
    );
  const providerName = providers[provider].label;
  // Match a small set of known diagnostics internally; never echo remote text.
  const message =
    typeof body?.error?.message === "string"
      ? body.error.message.slice(0, 12000).toLowerCase()
      : "";
  const type = typeof body?.error?.type === "string" ? body.error.type : "";
  const code = typeof body?.error?.code === "string" ? body.error.code : "";
  if (
    response.status === 402 ||
    code === "insufficient_quota" ||
    type === "billing_error" ||
    (response.status === 400 &&
      /billing|credit balance|spend limit/.test(message))
  )
    throw new AIServiceError(
      `${providerName} requires API credits or billing access. Check the provider account's billing and spending limits.`,
      "AI_BILLING",
    );
  if ([408, 500, 502, 503, 504, 529].includes(response.status))
    throw new AIServiceError(
      `${providerName} is temporarily unavailable or overloaded (HTTP ${response.status}). Retry shortly or choose another available model.`,
      "AI_UNAVAILABLE",
    );
  if (response.status === 400 || response.status === 422) {
    if (/thinking.?config|thinking.?budget|thinking.?level/.test(message))
      throw new AIServiceError(
        `${providerName} rejected the thinking settings for this model.`,
        "AI_THINKING",
      );
    if (
      /response.?json.?schema|response.?schema|structured.?output|json.?schema/.test(
        message,
      )
    )
      throw new AIServiceError(
        `${providerName} rejected structured JSON output for this model (HTTP ${response.status}). Choose a text model with JSON support.`,
        "AI_SCHEMA",
      );
    if (/response.?mime.?type|json.?mode|json_object/.test(message))
      throw new AIServiceError(
        `${providerName} rejected JSON response mode (HTTP ${response.status}). Choose another text model.`,
        "AI_JSON_MODE",
      );
    if (
      /system.?instruction|(?:system|developer).{0,40}(?:not supported|unsupported)|unsupported.{0,40}(?:system|developer)|messages\[0\]\.role/.test(
        message,
      )
    )
      throw new AIServiceError(
        `${providerName} does not support this instruction message format (HTTP ${response.status}). Choose a compatible text model.`,
        "AI_ROLE",
      );
    if (
      code === "context_length_exceeded" ||
      /context (?:length|window)|too many tokens/.test(message)
    )
      throw new AIServiceError(
        `${providerName} could not fit the command in this model's context. Shorten it or choose a model with a larger context window.`,
        "AI_CONTEXT",
      );
    throw new AIServiceError(
      `${providerName} rejected the request format (HTTP ${response.status}). Check that the selected model supports this API, refresh the model list, and check the API base URL.`,
      "AI_REQUEST",
    );
  }
  if (response.status === 404)
    throw new AIServiceError(
      "This model or API endpoint is unavailable. Refresh the model list, use Automatic, or check the base URL.",
      "AI_MODEL",
    );
  throw new AIServiceError(
    `The AI service could not accept this request (${response.status}). Check the provider, model and API endpoint.`,
    "AI_REQUEST",
  );
}
