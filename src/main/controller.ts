import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import type { CalendarProvider } from "./calendar/provider";
import { createPayload, updatePayload } from "./calendar/mapping";
import type { Intent } from "./nlu/schema";
import type { InputService } from "./nlu/input";
import type { SettingsStore } from "./settings/store";
import type { CalendarEvent, CalendarInfo, Reply } from "../shared/types";
type Pending =
  | { kind: "select"; intent: Intent; events: CalendarEvent[] }
  | { kind: "scope"; intent: Intent; event: CalendarEvent }
  | { kind: "confirm"; intent: Intent; event: CalendarEvent };
export class CommandController {
  private pending: Pending | undefined;
  private clarification: { original: string; question: string } | undefined;
  private busy = false;
  constructor(
    private provider: () => CalendarProvider | undefined,
    private input: InputService,
    private store: SettingsStore,
    private calendars: () => CalendarInfo[],
    private refresh: () => Promise<void>,
  ) {}
  clear() {
    this.pending = undefined;
    this.clarification = undefined;
  }
  get isBusy() {
    return this.busy;
  }
  async command(sentence: string): Promise<Reply> {
    if (this.busy) throw new Error("I am still finishing your last command.");
    this.busy = true;
    try {
      this.pending = undefined;
      const context = this.clarification;
      this.clarification = undefined;
      const intent = await this.input.parse(sentence, context);
      const original = context
        ? `${context.original}\nFollow-up: ${sentence}`
        : sentence;
      if (
        intent.clarification_needed ||
        intent.confidence < 0.8 ||
        intent.action === "unknown"
      ) {
        const question =
          intent.clarification_needed ??
          "Could you give me a title and a specific date or time?";
        this.clarification = { original, question };
        return { text: question, state: "idle" };
      }
      if (
        [
          ...intent.reminders_minutes_before,
          ...(intent.changes.reminders_minutes_before ?? []),
        ].some((n) => n > 40320)
      ) {
        return {
          text: "Google reminders can be at most four weeks early. Please create a separate reminder with its own date for that earlier heads-up. Nothing was changed.",
          state: "idle",
        };
      }
      const provider = this.provider();
      if (!provider)
        throw new Error("Connect Google Calendar in Settings first.");
      if (intent.action === "create") {
        if (!intent.start || !intent.title.trim()) {
          const question = "What should I call it, and when is it due?";
          this.clarification = { original, question };
          return { text: question };
        }
        const calendarId = this.store.settings.petCalendars[intent.category];
        if (!calendarId)
          throw new Error(
            "Reconnect Google to finish creating your pet calendars.",
          );
        const event = await provider.createEvent(calendarId, {
          ...createPayload(intent, original, DateTime.local().zoneName!),
          id: randomUUID().replace(/-/g, ""),
        });
        await this.refreshAfterWrite();
        return { text: `Added: ${this.label(event)}`, state: "happy" };
      }
      if (intent.action !== "query" && !intent.target_query.trim())
        return {
          text: "Which event should I find? Include part of its title.",
        };
      const events: CalendarEvent[] = [];
      for (const c of this.calendars()) {
        const result = await provider.listEvents(c.id, {
          query: intent.target_query || undefined,
          singleEvents: true,
          timeMin: DateTime.local().minus({ days: 1 }).toISO()!,
          timeMax: DateTime.local().plus({ years: 1 }).toISO()!,
        });
        events.push(
          ...result.items
            .filter((e) => e.status !== "cancelled" && e.id)
            .map((e) => ({ ...e, calendarZone: c.timeZone })),
        );
      }
      events.sort((a, b) =>
        (a.start?.dateTime ?? a.start?.date ?? "").localeCompare(
          b.start?.dateTime ?? b.start?.date ?? "",
        ),
      );
      if (intent.action === "query")
        return {
          text: events.length
            ? events
                .slice(0, 8)
                .map((e) => this.label(e))
                .join("\n")
            : "No matching upcoming events.",
        };
      // Offer the next occurrence of each recurring series, rather than flooding the chooser with a year's instances.
      const seen = new Set<string>();
      for (let i = 0; i < events.length;) {
        const key = JSON.stringify([
          events[i].calendarId,
          events[i].recurringEventId ?? events[i].id,
        ]);
        if (seen.has(key)) events.splice(i, 1);
        else {
          seen.add(key);
          i++;
        }
      }
      if (!events.length)
        return {
          text: "I could not find that event in your selected calendars within the next year. Try another title.",
        };
      if (events.length > 15)
        return {
          text: "There are many matches. Please include more of the title to narrow the search.",
        };
      if (events.length > 1) {
        this.pending = { kind: "select", intent, events };
        return {
          text: "Which event did you mean?",
          choices: events
            .map((e, i) => ({ id: `event:${i}`, label: this.label(e) }))
            .concat({ id: "cancel", label: "Cancel" }),
        };
      }
      return this.select(intent, events[0]);
    } finally {
      this.busy = false;
    }
  }
  async choose(id: string): Promise<Reply> {
    if (this.busy) throw new Error("I am still finishing your last command.");
    if (id === "cancel") {
      this.clear();
      return { text: "Cancelled. Nothing was changed.", state: "idle" };
    }
    const pending = this.pending;
    if (!pending)
      throw new Error("That choice expired. Please enter the command again.");
    if (pending.kind === "select") {
      const match = /^event:(\d+)$/.exec(id);
      const event = match ? pending.events[Number(match[1])] : undefined;
      if (!event) throw new Error("Choose an event from the list.");
      return this.select(pending.intent, event);
    }
    if (pending.kind === "scope") {
      if (id !== "instance" && id !== "series")
        throw new Error("Choose this occurrence or the entire series.");
      if (id === "instance" && pending.intent.changes.recurrence !== undefined)
        throw new Error(
          "Recurrence changes apply to the series. Choose the entire series.",
        );
      const provider = this.provider();
      if (!provider) throw new Error("Reconnect Google first.");
      const event =
        id === "series"
          ? {
              ...(await provider.getEvent(
                pending.event.calendarId,
                pending.event.recurringEventId ?? pending.event.id!,
              )),
              calendarZone: pending.event.calendarZone,
            }
          : pending.event;
      return this.confirm(pending.intent, event, id === "series");
    }
    if (id !== "confirm") throw new Error("Confirm or cancel this change.");
    this.busy = true;
    this.pending = undefined;
    try {
      const provider = this.provider();
      if (!provider) throw new Error("Reconnect Google first.");
      const fresh = await provider.getEvent(
        pending.event.calendarId,
        pending.event.id!,
      );
      if (fresh.etag !== pending.event.etag)
        throw new Error(
          "That event changed since the preview. Enter the command again to review the latest version.",
        );
      if (pending.intent.action === "delete")
        await provider.deleteEvent(
          fresh.calendarId,
          fresh.id!,
          fresh.etag ?? undefined,
        );
      else
        await provider.updateEvent(
          fresh.calendarId,
          fresh.id!,
          updatePayload(
            pending.intent,
            fresh,
            fresh.start?.timeZone ??
              pending.event.calendarZone ??
              DateTime.local().zoneName!,
          ),
          fresh.etag ?? undefined,
        );
      await this.refreshAfterWrite();
      return {
        text: `${pending.intent.action === "delete" ? "Deleted" : "Updated"}: ${fresh.summary ?? "Untitled event"}`,
        state: "happy",
      };
    } finally {
      this.busy = false;
    }
  }
  private select(intent: Intent, event: CalendarEvent): Reply {
    const role = this.calendars().find((c) => c.id === event.calendarId)?.role;
    if (!["owner", "writer"].includes(role ?? ""))
      return {
        text: "You have read-only access to that calendar. I cannot change the event.",
      };
    if (event.recurringEventId || event.recurrence?.length) {
      this.pending = { kind: "scope", intent, event };
      return {
        text: `${this.label(event)}\nChange this occurrence or the entire series?`,
        choices: [
          { id: "instance", label: "This occurrence" },
          { id: "series", label: "Entire series" },
          { id: "cancel", label: "Cancel" },
        ],
      };
    }
    return this.confirm(intent, event, false);
  }
  private confirm(
    intent: Intent,
    event: CalendarEvent,
    series: boolean,
  ): Reply {
    this.pending = { kind: "confirm", intent, event };
    let text = `${intent.action === "delete" ? "Delete" : "Update"} ${series ? "the entire series" : "this event"}?\n${this.label(event)}`;
    if (intent.action === "update") {
      const patch = updatePayload(
        intent,
        event,
        event.start?.timeZone ??
          event.calendarZone ??
          DateTime.local().zoneName!,
      );
      text += `\n→ ${this.label({ ...event, ...patch })}`;
      if (patch.reminders)
        text += `\nReminders: ${(intent.changes.reminders_minutes_before ?? []).join(", ")} minutes before`;
      if (patch.recurrence)
        text += `\nRecurrence: ${patch.recurrence.join(", ") || "None"}`;
    }
    return {
      text,
      choices: [
        {
          id: "confirm",
          label: intent.action === "delete" ? "Delete event" : "Apply change",
        },
        { id: "cancel", label: "Cancel" },
      ],
    };
  }
  private label(event: CalendarEvent): string {
    const start = event.start?.dateTime
      ? DateTime.fromISO(event.start.dateTime)
          .toLocal()
          .toFormat("ccc, d LLL · h:mm a")
      : (event.start?.date ?? "date unavailable");
    return `${event.summary ?? "Untitled event"} · ${start}`;
  }
  private async refreshAfterWrite() {
    try {
      await this.refresh();
    } catch {
      /* The write succeeded; sync status reports any refresh failure separately. */
    }
  }
}
