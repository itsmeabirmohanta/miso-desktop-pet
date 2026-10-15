import type { AIProvider } from "../../shared/types";
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
