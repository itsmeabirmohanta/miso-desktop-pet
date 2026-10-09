import type { calendar_v3 } from "@googleapis/calendar";
import type { CalendarProvider, EventList } from "./provider";
import { mapLimited } from "../sync/concurrency";
import { calendarErrorMessage } from "./provider";
import type {
  AccountStatus,
  CalendarInfo,
  CalendarEvent,
  Category,
} from "../../shared/types";
export function scopedCalendar(accountId: string, calendarId: string) {
  return `acct:${encodeURIComponent(accountId)}:${encodeURIComponent(calendarId)}`;
}
export function unpackCalendar(id: string) {
  const match = /^acct:([^:]+):(.+)$/.exec(id);
  if (!match)
    throw new Error("Choose a calendar belonging to a connected account.");
  return {
    accountId: decodeURIComponent(match[1]),
    calendarId: decodeURIComponent(match[2]),
  };
}
export class AccountCalendarProvider implements CalendarProvider {
  private entries = new Map<
    string,
    {
      provider: CalendarProvider;
      status: string;
      connected: boolean;
      email: string;
    }
  >();
  constructor(private defaultAccount: () => string) {}
  add(id: string, email: string, provider: CalendarProvider) {
    this.entries.set(id, {
      provider,
      email,
      status: "Connecting…",
      connected: false,
    });
  }
  remove(id: string) {
    this.entries.delete(id);
  }
  statuses(
    accounts: {
      id: string;
      email: string;
      petCalendars: Partial<Record<Category, string>>;
    }[],
  ): AccountStatus[] {
    return accounts.map((a) => ({
      ...a,
      status: this.entries.get(a.id)?.status ?? "Not connected",
      connected: this.entries.get(a.id)?.connected ?? false,
    }));
  }
  private wrap(event: CalendarEvent, accountId: string): CalendarEvent {
    return {
      ...event,
      calendarId: scopedCalendar(accountId, event.calendarId),
    };
  }
  private async call<T>(
    id: string,
    fn: (
      provider: CalendarProvider,
      raw: string,
      accountId: string,
    ) => Promise<T>,
  ): Promise<T> {
    const route = unpackCalendar(id);
    const entry = this.entries.get(route.accountId);
    if (!entry)
      throw new Error(
        "This account was removed. Reconnect it before changing its events.",
      );
    try {
      const result = await fn(
        entry.provider,
        route.calendarId,
        route.accountId,
      );
      entry.connected = true;
      entry.status = "Connected";
      return result;
    } catch (error) {
      entry.connected = false;
      entry.status = calendarErrorMessage(error);
      throw error;
    }
  }
  async listCalendars(): Promise<CalendarInfo[]> {
    const results = await mapLimited(
      Array.from(this.entries.entries()),
      2,
      async ([id, entry]) => {
        try {
          const calendars = await entry.provider.listCalendars();
          if (this.entries.get(id) !== entry) return [];
          entry.connected = true;
          entry.status = "Connected";
          return calendars.map((c) => ({
            ...c,
            id: scopedCalendar(id, c.id),
            accountId: id,
            accountEmail: entry.email,
          }));
        } catch (error) {
          if (this.entries.get(id) === entry) {
            entry.connected = false;
            entry.status = calendarErrorMessage(error);
          }
          return [];
        }
      },
    );
    return results.flat();
  }
  ensureCalendar(category: Category, zone: string): Promise<string> {
    const id = this.defaultAccount();
    const entry = this.entries.get(id);
    if (!entry) throw new Error("Choose a connected account first.");
    return entry.provider
      .ensureCalendar(category, zone)
      .then((raw) => scopedCalendar(id, raw));
  }
  listEvents(
    id: string,
    options: Parameters<CalendarProvider["listEvents"]>[1],
  ): Promise<EventList> {
    return this.call(id, async (p, raw, a) => {
      const result = await p.listEvents(raw, options);
      return { ...result, items: result.items.map((e) => this.wrap(e, a)) };
    });
  }
  getEvent(id: string, eventId: string) {
    return this.call(id, async (p, raw, a) =>
      this.wrap(await p.getEvent(raw, eventId), a),
    );
  }
  createEvent(id: string, event: calendar_v3.Schema$Event) {
    return this.call(id, async (p, raw, a) =>
      this.wrap(await p.createEvent(raw, event), a),
    );
  }
  updateEvent(
    id: string,
    eventId: string,
    event: calendar_v3.Schema$Event,
    etag?: string,
  ) {
    return this.call(id, async (p, raw, a) =>
      this.wrap(await p.updateEvent(raw, eventId, event, etag), a),
    );
  }
  deleteEvent(id: string, eventId: string, etag?: string) {
    return this.call(id, (p, raw) => p.deleteEvent(raw, eventId, etag));
  }
}
