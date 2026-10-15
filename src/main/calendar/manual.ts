import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createPayload, explicitReminders } from "./mapping";
import type { CalendarProvider } from "./provider";
import type { SettingsStore } from "../settings/store";
import type { CalendarEvent, CalendarInfo } from "../../shared/types";
export const manualSchema = z
  .object({
    accountId: z.string().min(1).max(300),
    category: z.enum(["task", "date", "reminder"]),
    title: z.string().trim().min(1).max(300),
    start: z.string().max(100),
    allDay: z.boolean(),
    yearly: z.boolean(),
    reminders: z.array(z.number().int().min(0).max(40320)).max(5),
  })
  .strict();
export class ManualCalendarService {
  private edits = new Map<
    string,
    {
      event: CalendarEvent;
      patch: {
        summary: string;
        start: CalendarEvent["start"];
        end: CalendarEvent["end"];
        reminders?: CalendarEvent["reminders"];
      };
      expires: number;
    }
  >();
  private deletions = new Map<
    string,
    { event: CalendarEvent; expires: number; series: boolean }
  >();
  constructor(
    private provider: () => CalendarProvider,
    private store: SettingsStore,
    private calendars: () => CalendarInfo[],
    private refresh: () => Promise<void>,
  ) {}
  async create(input: unknown): Promise<string> {
    const value = manualSchema.parse(input);
    const account = this.store.settings.accounts.find(
      (a) => a.id === value.accountId,
    );
    if (!account) throw new Error("Choose a connected account.");
    const id = account.petCalendars[value.category];
    if (!id)
      throw new Error(
        "Sign in again to finish setting up this account’s task calendars.",
      );
    const date = DateTime.fromISO(value.start, {
      zone: DateTime.local().zoneName!,
    });
    if (
      !date.isValid ||
      value.allDay !== /^\d{4}-\d{2}-\d{2}$/.test(value.start)
    )
      throw new Error("Choose a valid date and time.");
    if (date.toMillis() < DateTime.local().startOf("day").toMillis())
      throw new Error("Choose today or a future date.");
    if (value.yearly && !value.allDay)
      throw new Error("Yearly important dates must be all-day.");
    const event = createPayload(
      {
        action: "create",
        category: value.category,
        title: value.title,
        start: value.allDay ? date.toISODate()! : date.toISO()!,
        all_day: value.allDay,
        recurrence: value.yearly ? "RRULE:FREQ=YEARLY" : null,
        reminders_minutes_before: value.reminders,
        target_query: "",
        changes: {},
        confidence: 1,
        clarification_needed: null,
      },
      "Created manually in MISO",
      DateTime.local().zoneName!,
    );
    await this.provider().createEvent(id, {
      ...event,
      id: randomUUID().replace(/-/g, ""),
    });
    return await this.finish(`Added “${value.title}” to ${account.email}.`);
  }
  async preview(
    calendarId: string,
    eventId: string,
    scope: "instance" | "series",
  ) {
    const calendar = this.calendars().find((c) => c.id === calendarId);
    if (!calendar || !["owner", "writer"].includes(calendar.role))
      throw new Error("You cannot delete events from this calendar.");
    let event = await this.provider().getEvent(calendarId, eventId);
    const recurring = !!event.recurringEventId || !!event.recurrence?.length;
    if (scope === "series" && event.recurringEventId)
      event = await this.provider().getEvent(
        calendarId,
        event.recurringEventId,
      );
    if (event.status === "cancelled")
      throw new Error("This event was already deleted. Refresh the calendar.");
    const ticket = randomUUID();
    for (const [id, p] of this.deletions)
      if (p.expires < Date.now()) this.deletions.delete(id);
    if (this.deletions.size >= 20) this.deletions.clear();
    this.deletions.set(ticket, {
      event,
      series: scope === "series",
      expires: Date.now() + 5 * 60000,
    });
    return {
      ticket,
      title: `${event.summary ?? "Untitled event"} · ${event.start?.dateTime ?? event.start?.date ?? ""}${recurring && scope === "series" ? " · Entire series" : ""}`,
      calendar: `${calendar.title} · ${calendar.accountEmail ?? ""}`,
      recurring,
    };
  }
  async previewEdit(calendarId: string, eventId: string, input: unknown) {
    const value = z
      .object({
        title: z.string().trim().min(1).max(300),
        start: z.string().max(100),
        end: z.string().max(100),
        reminders: z
          .array(z.number().int().min(0).max(40320))
          .max(5)
          .optional(),
      })
      .strict()
      .parse(input);
    const calendar = this.calendars().find((c) => c.id === calendarId);
    if (!calendar || !["owner", "writer"].includes(calendar.role))
      throw new Error("This calendar is read-only.");
    const event = await this.provider().getEvent(calendarId, eventId);
    if (event.status === "cancelled")
      throw new Error("This event was deleted. Refresh the calendar.");
    if (event.recurrence?.length && !event.recurringEventId)
      throw new Error("Edit an entire repeating series in Google Calendar.");
    const allDay = !!event.start?.date;
    const start = DateTime.fromISO(value.start);
    const end = DateTime.fromISO(value.end);
    if (
      !start.isValid ||
      !end.isValid ||
      end.toMillis() <= start.toMillis() ||
      [value.start, value.end].some(
        (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) !== allDay,
      )
    )
      throw new Error("Enter valid dates. The end must be after the start.");
    if (!event.etag)
      throw new Error(
        "Google did not return an event version. Refresh and try again.",
      );
    const patch = {
      summary: value.title,
      start: allDay
        ? { date: start.toISODate()! }
        : { dateTime: start.toISO()! },
      end: allDay ? { date: end.toISODate()! } : { dateTime: end.toISO()! },
      ...(value.reminders !== undefined
        ? { reminders: explicitReminders(value.reminders) }
        : {}),
    };
    for (const [id, p] of this.edits)
      if (p.expires < Date.now()) this.edits.delete(id);
    if (this.edits.size >= 20) this.edits.clear();
    const ticket = randomUUID();
    this.edits.set(ticket, { event, patch, expires: Date.now() + 300000 });
    return {
      ticket,
      summary: `${value.title}\n${start.toFormat(allDay ? "dd LLL yyyy" : "dd LLL yyyy, HH:mm")} → ${end.toFormat(allDay ? "dd LLL yyyy" : "dd LLL yyyy, HH:mm")}\n${calendar.title} · ${calendar.accountEmail ?? ""}${value.reminders !== undefined ? `\nReminders: ${value.reminders.length ? value.reminders.join(", ") + " minutes before" : "None"}` : ""}${event.recurringEventId ? "\nOnly this occurrence will change." : ""}`,
    };
  }
  cancelEdit(ticket: string) {
    this.edits.delete(ticket);
  }
  async confirmEdit(ticket: string) {
    const pending = this.edits.get(ticket);
    this.edits.delete(ticket);
    if (!pending || pending.expires < Date.now())
      throw new Error("This confirmation expired. Review the event again.");
    const calendar = this.calendars().find(
      (c) => c.id === pending.event.calendarId,
    );
    if (!calendar || !["owner", "writer"].includes(calendar.role))
      throw new Error("Calendar access changed. Nothing was updated.");
    const fresh = await this.provider().getEvent(
      pending.event.calendarId,
      pending.event.id!,
    );
    if (fresh.etag !== pending.event.etag)
      throw new Error("The event changed after your preview. Review it again.");
    await this.provider().updateEvent(
      fresh.calendarId,
      fresh.id!,
      pending.patch,
      fresh.etag!,
    );
    return this.finish(`Updated “${pending.patch.summary}”.`);
  }
  clear() {
    this.deletions.clear();
    this.edits.clear();
  }
  cancel(ticket: string) {
    this.deletions.delete(ticket);
  }
  async confirm(ticket: string) {
    const pending = this.deletions.get(ticket);
    this.deletions.delete(ticket);
    if (!pending || pending.expires < Date.now())
      throw new Error("This confirmation expired. Review the event again.");
    const calendar = this.calendars().find(
      (c) => c.id === pending.event.calendarId,
    );
    if (!calendar)
      throw new Error(
        "This account or calendar was removed. Nothing was deleted.",
      );
    const fresh = await this.provider().getEvent(
      pending.event.calendarId,
      pending.event.id!,
    );
    if (fresh.etag !== pending.event.etag)
      throw new Error(
        "The event changed after your preview. Review it again before deleting.",
      );
    await this.provider().deleteEvent(
      fresh.calendarId,
      fresh.id!,
      fresh.etag ?? undefined,
    );
    return await this.finish(
      `Deleted ${pending.series ? "the series" : "the event"} “${fresh.summary ?? "Untitled event"}”.`,
    );
  }
  private async finish(message: string) {
    try {
      await this.refresh();
      return message;
    } catch {
      return (
        message +
        " Google saved the change, but the local view could not refresh. Retry sync; do not repeat the change."
      );
    }
  }
}
