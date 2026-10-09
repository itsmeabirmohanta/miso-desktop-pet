const messages = {
  invalid_client:
    "Google rejected MISO's OAuth client configuration. The publisher must check the Desktop client ID and matching client secret, then rebuild the installer.",
  unauthorized_client:
    "Google does not allow this OAuth client to use desktop sign-in. The publisher must configure a Desktop app client.",
  invalid_grant:
    "Google rejected the sign-in code. Try signing in again. Check that the device date and time are correct.",
  invalid_request:
    "Google rejected the sign-in exchange. The publisher must check the Desktop OAuth configuration and callback settings.",
  redirect_uri_mismatch:
    "Google rejected the callback address. MISO needs a Desktop OAuth client with a loopback callback.",
  access_denied:
    "Google sign-in was denied. Check the app's permitted test users or Workspace administrator restrictions.",
  invalid_scope:
    "Google rejected the requested permissions. The publisher must check the app's Calendar scopes.",
  network:
    "Could not reach Google's sign-in service. Check the internet connection, firewall or proxy, then retry.",
  certificate:
    "The secure connection to Google could not be verified. Check the device clock and any proxy or antivirus HTTPS inspection settings.",
  cancelled: "Google sign-in was cancelled. No account was added.",
  timeout: "Google sign-in timed out. Try connecting again.",
  missing_refresh_token:
    "Google did not issue offline access. Remove MISO's permission in your Google account and reconnect.",
  missing_identity:
    "Google did not return a verified account identity. Try signing in again.",
  unknown:
    "Google sign-in could not finish. Retry once; if it fails again, share the stage and support code below with the publisher.",
};
export type SignInStage =
  "browser sign-in" | "token exchange" | "account verification";
export class GoogleSignInError extends Error {
  constructor(
    readonly reason: keyof typeof messages,
    readonly stage: SignInStage,
  ) {
    super(
      `${messages[reason]}\nStage: ${stage}. Support code: GOOGLE_${reason.toUpperCase()}.`,
    );
  }
}
export function signInError(
  error: unknown,
  stage: SignInStage,
): GoogleSignInError {
  if (error instanceof GoogleSignInError) return error;
  const detail = error as {
    code?: unknown;
    cause?: { code?: unknown };
    response?: { status?: number; data?: { error?: unknown } };
  };
  const remote = detail?.response?.data?.error;
  if (
    typeof remote === "string" &&
    Object.hasOwn(messages, remote) &&
    !["unknown", "network", "certificate"].includes(remote)
  )
    return new GoogleSignInError(remote as keyof typeof messages, stage);
  const code = detail?.code ?? detail?.cause?.code;
  if (
    [
      "CERT_HAS_EXPIRED",
      "DEPTH_ZERO_SELF_SIGNED_CERT",
      "SELF_SIGNED_CERT_IN_CHAIN",
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      "ERR_TLS_CERT_ALTNAME_INVALID",
      "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
    ].includes(String(code))
  )
    return new GoogleSignInError("certificate", stage);
  if (
    [
      "ENOTFOUND",
      "EAI_AGAIN",
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "ENETUNREACH",
    ].includes(String(code))
  )
    return new GoogleSignInError("network", stage);
  return new GoogleSignInError("unknown", stage);
}
