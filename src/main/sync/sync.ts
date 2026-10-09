import { DateTime } from "luxon";
import type { CalendarProvider } from "../calendar/provider";
import { statusCode } from "../calendar/provider";
import type { CalendarEvent, CalendarInfo } from "../../shared/types";
export class SyncService {
  private tokens = new Map<string, string>();
  private lastWindow = 0;
  private lastSignature = "";
  private dirty = false;
  private events: CalendarEvent[];
  private busy: Promise<CalendarEvent[]> | undefined;
  private stopped = false;
  constructor(
    private provider: CalendarProvider,
    cached: CalendarEvent[],
    private save: (events: CalendarEvent[]) => void,
  ) {
    this.events = cached;
  }
  stop() {
    this.stopped = true;
  }
  run(calendars: CalendarInfo[], force = false): Promise<CalendarEvent[]> {
    if (this.busy) return this.busy.then(() => this.run(calendars, force));
    this.busy = this.perform(calendars, force).finally(() => {
      this.busy = undefined;
    });
    return this.busy;
  }
  private async perform(
    calendars: CalendarInfo[],
    force: boolean,
  ): Promise<CalendarEvent[]> {
    const now = DateTime.local();
    const signature = calendars
      .map((c) => c.id)
      .sort()
      .join("|");
    let refresh =
      this.dirty ||
      force ||
      signature !== this.lastSignature ||
      Date.now() - this.lastWindow > 3600000;
    for (const c of calendars) {
      const token = this.tokens.get(c.id);
      try {
        // Unbounded non-expanded change feed: tokens cannot be combined with timeMin, timeMax, q or orderBy.
        const result = await this.provider.listEvents(c.id, {
          syncToken: token,
          singleEvents: false,
        });
        if (result.nextSyncToken) this.tokens.set(c.id, result.nextSyncToken);
        if (!token || result.items.length) {
          refresh = true;
          this.dirty = true;
        }
      } catch (error) {
        if (statusCode(error) !== 410) throw error;
        this.tokens.delete(c.id);
        const result = await this.provider.listEvents(c.id, {
          singleEvents: false,
        });
        if (result.nextSyncToken) this.tokens.set(c.id, result.nextSyncToken);
        refresh = true;
        this.dirty = true;
      }
    }
    if (refresh) {
      const all: CalendarEvent[] = [];
      for (const c of calendars) {
        // Include four weeks ahead so the longest supported Google lead can fire now.
        const result = await this.provider.listEvents(c.id, {
          timeMin: now.minus({ days: 1 }).toISO()!,
          timeMax: now.plus({ days: 35 }).toISO()!,
          singleEvents: true,
        });
        all.push(
          ...result.items
            .filter((e) => e.status !== "cancelled")
            .map((e) => ({
              ...e,
              calendarZone: c.timeZone,
              defaultOffsets: c.defaultOffsets,
            })),
        );
      }
      if (this.stopped) return this.events;
      this.events = all;
      this.save(all);
      this.lastWindow = Date.now();
      this.lastSignature = signature;
      this.dirty = false;
    }
    return this.events;
  }
}
