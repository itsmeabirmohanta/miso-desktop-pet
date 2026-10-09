import { describe, it, expect } from "vitest";
import { calendarErrorMessage } from "../src/main/calendar/provider";
describe("actionable calendar failures", () => {
  it("identifies disabled Calendar API without leaking remote messages", () => {
    const error = {
      response: {
        status: 403,
        data: {
          error: {
            message: "secret-token-url",
            errors: [{ reason: "accessNotConfigured" }],
          },
        },
      },
    };
    expect(calendarErrorMessage(error)).toContain("Calendar API is disabled");
    expect(calendarErrorMessage(error)).not.toContain("secret");
  });
  it("distinguishes disabled API from consent, quota and revoked access", () => {
    expect(calendarErrorMessage({ response: { status: 403 } })).toContain(
      "grant calendar permissions",
    );
    expect(
      calendarErrorMessage({
        response: {
          status: 403,
          data: { error: { errors: [{ reason: "rateLimitExceeded" }] } },
        },
      }),
    ).toContain("rate limit");
    expect(
      calendarErrorMessage({
        response: { status: 400, data: { error: "invalid_grant" } },
      }),
    ).toContain("revoked");
    expect(calendarErrorMessage({ response: { status: 401 } })).toContain(
      "Sign in again",
    );
  });
  it("recognizes structured service-disabled status and unreachable servers", () => {
    expect(
      calendarErrorMessage({
        response: {
          status: 403,
          data: { error: { status: "SERVICE_DISABLED" } },
        },
      }),
    ).toContain("Enable Calendar API");
    expect(calendarErrorMessage(new Error("private headers"))).toBe(
      "Could not reach Google Calendar. Check your connection and retry sync.",
    );
  });
});
