import { describe, expect, it } from "vitest";
import {
  signInError,
  GoogleSignInError,
} from "../src/main/calendar/auth-errors";
describe("safe Google sign-in errors", () => {
  it("explains rejected client configuration without exposing request secrets", () => {
    const error = signInError(
      {
        response: {
          status: 400,
          data: {
            error: "invalid_client",
            error_description: "private-client-secret",
          },
        },
        config: { headers: { Authorization: "private-token" } },
      },
      "token exchange",
    );
    expect(error.message).toContain("GOOGLE_INVALID_CLIENT");
    expect(error.message).toContain("token exchange");
    expect(error.message).not.toContain("private");
  });
  it("distinguishes TLS and network failures", () => {
    expect(
      signInError(
        { cause: { code: "SELF_SIGNED_CERT_IN_CHAIN" } },
        "account verification",
      ).reason,
    ).toBe("certificate");
    expect(signInError({ code: "ENOTFOUND" }, "token exchange").reason).toBe(
      "network",
    );
  });
  it("does not display arbitrary provider error text or URLs", () => {
    expect(
      signInError(
        { response: { data: { error: "https://private.example/token" } } },
        "token exchange",
      ).reason,
    ).toBe("unknown");
  });
  it("preserves a known local failure and its original stage", () => {
    const error = new GoogleSignInError("timeout", "browser sign-in");
    expect(signInError(error, "token exchange")).toBe(error);
  });
});
