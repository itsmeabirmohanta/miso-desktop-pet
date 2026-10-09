import { calendar, type calendar_v3 } from "@googleapis/calendar";
import type { OAuth2Client } from "google-auth-library";
import type { CalendarProvider, EventList } from "./provider";
import { retryRead } from "./provider";
import type { CalendarEvent, CalendarInfo, Category } from "../../shared/types";
const names: Record<Category, string> = {
  task: "Pet: Tasks",
  date: "Pet: Birthdays and Dates",
  reminder: "Pet: Reminders",
};
export class GoogleCalendarProvider implements CalendarProvider {
  private api: calendar_v3.Calendar;
  constructor(auth: OAuth2Client) {
    this.api = calendar({ version: "v3", auth, timeout: 20000 });
  }
  async listCalendars(): Promise<CalendarInfo[]> {
    const result: CalendarInfo[] = [];
    let pageToken: string | undefined;
    do {
      const { data } = await retryRead(() =>
        this.api.calendarList.list({ pageToken, maxResults: 250 }),
      );
      for (const c of data.items ?? [])
        if (
          c.id &&
          c.accessRole !== "freeBusyReader" &&
          c.accessRole !== "none"
        )
          result.push({
            id: c.id,
            title: c.summaryOverride ?? c.summary ?? "Untitled",
            role: c.accessRole ?? "reader",
            primary: c.primary ?? false,
            timeZone: c.timeZone ?? "UTC",
            defaultOffsets: (c.defaultReminders ?? [])
              .filter((r) => r.method === "popup")
              .map((r) => r.minutes ?? 0),
          });
      pageToken = data.nextPageToken ?? undefined;
    } while (pageToken);
    return result;
  }
  async ensureCalendar(category: Category, timeZone: string): Promise<string> {
    const existing = (await this.listCalendars()).find(
      (c) => c.title === names[category] && c.role === "owner",
    );
    if (existing) return existing.id;
    const { data } = await this.api.calendars.insert(
      {
        requestBody: {
          summary: names[category],
          timeZone,
          description: "MISO desktop companion",
        },
      },
      { retry: false },
    );
    if (!data.id) throw new Error("Google did not return a calendar ID.");
    return data.id;
  }
  async listEvents(
    calendarId: string,
    options: {
      syncToken?: string;
      timeMin?: string;
      timeMax?: string;
      query?: string;
      singleEvents?: boolean;
    },
  ): Promise<EventList> {
    const items: CalendarEvent[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;
    do {
      const { data } = await retryRead(() =>
        this.api.events.list({
          calendarId,
          pageToken,
          maxResults: 2500,
          singleEvents: options.singleEvents ?? false,
          showDeleted: true,
          ...(options.syncToken
            ? { syncToken: options.syncToken }
            : {
                timeMin: options.timeMin,
                timeMax: options.timeMax,
                q: options.query,
                ...(options.singleEvents ? { orderBy: "startTime" } : {}),
              }),
        }),
      );
      items.push(...(data.items ?? []).map((e) => ({ ...e, calendarId })));
      pageToken = data.nextPageToken ?? undefined;
      nextSyncToken = data.nextSyncToken ?? undefined;
    } while (pageToken);
    return { items, nextSyncToken };
  }
  async getEvent(calendarId: string, id: string) {
    const { data } = await retryRead(() =>
      this.api.events.get({ calendarId, eventId: id }),
    );
    return { ...data, calendarId };
  }
  async createEvent(calendarId: string, event: calendar_v3.Schema$Event) {
    const { data } = await this.api.events.insert(
      { calendarId, requestBody: event },
      { retry: false },
    );
    return { ...data, calendarId };
  }
  async updateEvent(
    calendarId: string,
    id: string,
    event: calendar_v3.Schema$Event,
    etag?: string,
  ) {
    const { data } = await this.api.events.patch(
      { calendarId, eventId: id, requestBody: event },
      { retry: false, headers: etag ? { "If-Match": etag } : undefined },
    );
    return { ...data, calendarId };
  }
  async deleteEvent(calendarId: string, id: string, etag?: string) {
    await this.api.events.delete(
      { calendarId, eventId: id },
      { retry: false, headers: etag ? { "If-Match": etag } : undefined },
    );
  }
}
