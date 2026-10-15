import { describe, it, expect, vi } from "vitest";
import { CommandController } from "../src/main/controller";
import type { Intent } from "../src/main/nlu/schema";
import type { InputService } from "../src/main/nlu/input";
import type { CalendarProvider } from "../src/main/calendar/provider";
import type { SettingsStore } from "../src/main/settings/store";
import type { CalendarEvent } from "../src/shared/types";
const intent: Intent = {
  action: "update",
  category: "task",
  title: "",
  start: null,
  all_day: false,
  recurrence: null,
  reminders_minutes_before: [0],
  target_query: "dentist",
  changes: { start: "2026-10-12T16:00:00+05:30", all_day: false },
  confidence: 0.99,
  clarification_needed: null,
};
const event: CalendarEvent = {
  id: "a",
  calendarId: "work",
  summary: "Dentist",
  etag: "v1",
  start: { dateTime: "2026-10-09T16:00:00+05:30" },
  end: { dateTime: "2026-10-09T17:00:00+05:30" },
};
function fixture(events: CalendarEvent[], patch: Partial<Intent> = {}) {
  const provider = {
    listEvents: vi.fn<CalendarProvider["listEvents"]>(async () => ({
      items: events,
    })),
    getEvent: vi.fn<CalendarProvider["getEvent"]>(async () => event),
    updateEvent: vi.fn<CalendarProvider["updateEvent"]>(async () => event),
    deleteEvent: vi.fn<CalendarProvider["deleteEvent"]>(async () => {}),
    createEvent: vi.fn<CalendarProvider["createEvent"]>(async () => event),
  };
  const parse = vi.fn<InputService["parse"]>(async () => ({
    ...intent,
    ...patch,
  }));
  const refresh = vi.fn(async () => {});
  const controller = new CommandController(
    () => provider as unknown as CalendarProvider,
    { parse } as unknown as InputService,
    {
      settings: { petCalendars: { task: "tasks" } },
    } as unknown as SettingsStore,
    () => [
      {
        id: "work",
        title: "Work",
        role: "owner",
        timeZone: "Asia/Kolkata",
        defaultOffsets: [],
      },
    ],
    refresh,
  );
  return { controller, provider, parse, refresh };
}
describe("safe command lifecycle", () => {
  it("previews an edit, preserves duration, writes only after confirm", async () => {
    const { controller, provider } = fixture([event]);
    const preview = await controller.command("Move dentist to Monday 4pm");
    expect(preview.choices?.[0].id).toBe("confirm");
    expect(provider.updateEvent).not.toHaveBeenCalled();
    await controller.choose("confirm");
    expect(provider.updateEvent.mock.calls[0][2].end?.dateTime).toContain(
      "17:00:00",
    );
    expect(provider.updateEvent.mock.calls[0][3]).toBe("v1");
  });
  it("asks which event when multiple match", async () => {
    const { controller, provider } = fixture([
      event,
      { ...event, id: "b", summary: "Dentist follow-up" },
    ]);
    const reply = await controller.command("Move dentist");
    expect(reply.choices).toHaveLength(3);
    expect(provider.updateEvent).not.toHaveBeenCalled();
    expect((await controller.choose("event:1")).text).toContain("follow-up");
  });
  it("asks instance versus series and confirms series deletion", async () => {
    const recurring = { ...event, recurringEventId: "series" };
    const { controller, provider } = fixture([recurring], {
      action: "delete",
      changes: {},
    });
    provider.getEvent.mockResolvedValue({
      ...event,
      id: "series",
      recurrence: ["RRULE:FREQ=WEEKLY"],
    });
    const reply = await controller.command("Delete dentist");
    expect(reply.choices?.map((c) => c.id)).toContain("series");
    const preview = await controller.choose("series");
    expect(preview.text).toContain("entire series");
    expect(provider.deleteEvent).not.toHaveBeenCalled();
    await controller.choose("confirm");
    expect(provider.deleteEvent).toHaveBeenCalledWith("work", "series", "v1");
  });
  it("cancel clears pending deletion", async () => {
    const { controller, provider } = fixture([event], {
      action: "delete",
      changes: {},
    });
    await controller.command("Delete dentist");
    await controller.choose("cancel");
    await expect(controller.choose("confirm")).rejects.toThrow("expired");
    expect(provider.deleteEvent).not.toHaveBeenCalled();
  });
  it("rejects an event changed since confirmation", async () => {
    const { controller, provider } = fixture([event]);
    await controller.command("Move dentist");
    provider.getEvent.mockResolvedValue({ ...event, etag: "v2" });
    await expect(controller.choose("confirm")).rejects.toThrow("changed");
    expect(provider.updateEvent).not.toHaveBeenCalled();
  });
  it("low confidence asks and passes context on next message", async () => {
    const { controller, parse, provider } = fixture([], {
      confidence: 0.3,
      clarification_needed: "When?",
    });
    expect((await controller.command("Remember report")).text).toBe("When?");
    await controller.command("Friday");
    expect(parse.mock.calls[1][1]?.original).toBe("Remember report");
    expect(provider.createEvent).not.toHaveBeenCalled();
  });
  it("creates tagged calendar event with explicit reminders", async () => {
    const { controller, provider } = fixture([], {
      action: "create",
      title: "Report",
      start: "2026-10-09T17:00:00+05:30",
    });
    const reply = await controller.command("Report Friday 5pm");
    expect(reply.scheduledEvent).toEqual(event);
    expect(provider.createEvent).toHaveBeenCalledTimes(1);
    const payload = provider.createEvent.mock.calls[0][1];
    expect(payload.extendedProperties?.private?.petApp).toBe("1");
    expect(payload.reminders?.useDefault).toBe(false);
    expect(payload.id).toMatch(/^[0-9a-f]{32}$/);
  });
  it("preserves an explicitly requested duration in an automatically scheduled event", async () => {
    const { controller, provider } = fixture([], {
      action: "create",
      title: "Planning",
      start: "2030-01-01T09:00:00Z",
      duration_minutes: 60,
    });
    await controller.command("Planning tomorrow at 9 for an hour");
    const value = provider.createEvent.mock.calls[0][1];
    expect(
      Date.parse(value.end!.dateTime!) - Date.parse(value.start!.dateTime!),
    ).toBe(3600000);
  });
  it("overlong lead never writes", async () => {
    const { controller, provider } = fixture([], {
      action: "create",
      title: "Birthday",
      start: "2027-03-14",
      all_day: true,
      reminders_minutes_before: [50000],
    });
    expect(
      (await controller.command("Birthday five weeks before")).text,
    ).toContain("four weeks");
    expect(provider.createEvent).not.toHaveBeenCalled();
  });
});
