import type { calendar_v3 } from "@googleapis/calendar";
import type { CalendarInfo, CalendarEvent, Category } from "../../shared/types";
export interface EventList {
  items: CalendarEvent[];
  nextSyncToken?: string;
}
export interface CalendarProvider {
  listCalendars(): Promise<CalendarInfo[]>;
  ensureCalendar(category: Category, timeZone: string): Promise<string>;
  listEvents(
    calendarId: string,
    options: {
      syncToken?: string;
      timeMin?: string;
      timeMax?: string;
      query?: string;
      singleEvents?: boolean;
    },
  ): Promise<EventList>;
  getEvent(calendarId: string, id: string): Promise<CalendarEvent>;
  createEvent(
    calendarId: string,
    event: calendar_v3.Schema$Event,
  ): Promise<CalendarEvent>;
  updateEvent(
    calendarId: string,
    id: string,
    event: calendar_v3.Schema$Event,
    etag?: string,
  ): Promise<CalendarEvent>;
  deleteEvent(calendarId: string, id: string, etag?: string): Promise<void>;
}
export function statusCode(error: unknown): number | undefined {
  const e = error as { code?: unknown; response?: { status?: number } };
  return typeof e?.code === "number" ? e.code : e?.response?.status;
}
export function calendarErrorMessage(error: unknown): string {
  const e = error as {
    response?: {
      data?: {
        error?: { errors?: { reason?: string }[]; status?: string } | string;
      };
    };
    errors?: { reason?: string }[];
    code?: string;
  };
  const remote = e?.response?.data?.error;
  const reasons =
    typeof remote === "object"
      ? (remote?.errors ?? e.errors ?? [])
      : (e?.errors ?? []);
  if (
    reasons.some((r) => r.reason === "accessNotConfigured") ||
    (typeof remote === "object" && remote?.status === "SERVICE_DISABLED")
  )
    return "Google Calendar API is disabled for this app’s Cloud project. Enable Calendar API, wait a few minutes, then retry sync.";
  if (
    statusCode(error) === 401 ||
    remote === "invalid_grant" ||
    String(error).includes("invalid_grant")
  )
    return "Google access expired or was revoked. Sign in again to restore access.";
  if (
    reasons.some((r) =>
      ["rateLimitExceeded", "userRateLimitExceeded", "quotaExceeded"].includes(
        r.reason ?? "",
      ),
    ) ||
    statusCode(error) === 429
  )
    return "Google quota or rate limit reached. Wait and retry sync.";
  if (statusCode(error) === 403)
    return "Google denied calendar access. Sign in again and grant calendar permissions; check Workspace administrator restrictions.";
  if (statusCode(error) === 404)
    return "A selected Google calendar no longer exists or is inaccessible. Check your calendar selection.";
  return "Could not reach Google Calendar. Check your connection and retry sync.";
}
export async function retryRead<T>(
  fn: () => Promise<T>,
  sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const code = statusCode(error);
      const detail = error as {
        response?: { data?: { error?: { errors?: { reason?: string }[] } } };
        errors?: { reason?: string }[];
      };
      const reasons =
        detail.response?.data?.error?.errors ?? detail.errors ?? [];
      const limited =
        code === 403 &&
        reasons.some((e) =>
          [
            "rateLimitExceeded",
            "userRateLimitExceeded",
            "quotaExceeded",
          ].includes(e.reason ?? ""),
        );
      if (
        attempt >= 3 ||
        (!limited && ![429, 500, 502, 503, 504].includes(code ?? 0))
      )
        throw error;
      await sleep(Math.min(8000, 500 * 2 ** attempt) + Math.random() * 250);
    }
  }
}
