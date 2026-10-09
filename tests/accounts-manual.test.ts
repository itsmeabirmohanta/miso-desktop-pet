import { describe, it, expect, vi } from "vitest";
import {
  AccountCalendarProvider,
  scopedCalendar,
  unpackCalendar,
} from "../src/main/calendar/accounts";
import { ManualCalendarService } from "../src/main/calendar/manual";
import type { CalendarProvider } from "../src/main/calendar/provider";
import type { SettingsStore } from "../src/main/settings/store";
function raw() {
  return {
    listCalendars: vi.fn(async () => [
      {
        id: "tasks",
        title: "Tasks",
        role: "owner",
        timeZone: "UTC",
        defaultOffsets: [],
      },
    ]),
    ensureCalendar: vi.fn(async () => "tasks"),
    listEvents: vi.fn(async () => ({
      items: [{ id: "event", calendarId: "tasks" }],
    })),
    getEvent: vi.fn(async () => ({
      id: "event",
      calendarId: "tasks",
      summary: "Test",
      etag: "v1",
      start: { date: "2099-01-01" },
    })),
    createEvent: vi.fn(async (id: string, event: object) => ({
      ...event,
      calendarId: id,
    })),
    updateEvent: vi.fn(async () => ({ id: "event", calendarId: "tasks" })),
    deleteEvent: vi.fn(async () => {}),
  };
}
describe("multiple Google accounts", () => {
  it("routes colliding calendar IDs and preserves account identity", async () => {
    const a = raw(),
      b = raw(),
      provider = new AccountCalendarProvider(() => "b");
    provider.add("a", "a@example.test", a);
    provider.add("b", "b@example.test", b);
    const calendars = await provider.listCalendars();
    expect(calendars.map((c) => c.id)).toEqual([
      scopedCalendar("a", "tasks"),
      scopedCalendar("b", "tasks"),
    ]);
    await provider.deleteEvent(calendars[1].id, "event", "v1");
    expect(b.deleteEvent).toHaveBeenCalledWith("tasks", "event", "v1");
    expect(a.deleteEvent).not.toHaveBeenCalled();
    expect(
      (await provider.listEvents(calendars[0].id, {})).items[0].calendarId,
    ).toBe(calendars[0].id);
    expect(await provider.ensureCalendar("task", "UTC")).toBe(calendars[1].id);
  });
  it("isolates expired access and removal from healthy accounts", async () => {
    const a = raw(),
      b = raw(),
      provider = new AccountCalendarProvider(() => "b");
    a.listCalendars.mockRejectedValue(new Error("invalid_grant"));
    provider.add("a", "a@example.test", a);
    provider.add("b", "b@example.test", b);
    expect(await provider.listCalendars()).toHaveLength(1);
    const accounts = [
      { id: "a", email: "a", petCalendars: {} },
      { id: "b", email: "b", petCalendars: {} },
    ];
    expect(provider.statuses(accounts).map((a) => a.connected)).toEqual([
      false,
      true,
    ]);
    provider.remove("a");
    await expect(
      provider.deleteEvent(scopedCalendar("a", "tasks"), "event"),
    ).rejects.toThrow("removed");
    await provider.deleteEvent(scopedCalendar("b", "tasks"), "event");
    expect(b.deleteEvent).toHaveBeenCalledTimes(1);
  });
  it("round trips punctuation in account and calendar IDs", () => {
    expect(
      unpackCalendar(scopedCalendar("a:b", "name+space@example.test")),
    ).toEqual({ accountId: "a:b", calendarId: "name+space@example.test" });
    expect(() => unpackCalendar("unscoped")).toThrow();
  });
});
function manual() {
  const provider = raw();
  const store = {
    settings: {
      aiEnabled: false,
      accounts: [
        {
          id: "a",
          email: "a@example.test",
          petCalendars: { task: "tasks", date: "dates" },
        },
      ],
    },
  } as unknown as SettingsStore;
  const refresh = vi.fn(async () => {});
  const calendars = [
    {
      id: "tasks",
      title: "Tasks",
      role: "owner",
      timeZone: "UTC",
      defaultOffsets: [],
    },
  ];
  const service = new ManualCalendarService(
    () => provider as CalendarProvider,
    store,
    () => calendars,
    refresh,
  );
  return { service, provider, refresh, calendars };
}
describe("calendar features without AI", () => {
  it("previews edits without writing, then patches only title and dates with the fresh ETag", async () => {
    const { service, provider } = manual();
    const p = await service.previewEdit("tasks", "event", {
      title: "Updated title",
      start: "2099-01-02",
      end: "2099-01-03",
    });
    expect(provider.updateEvent).not.toHaveBeenCalled();
    expect(p.summary).toContain("Updated title");
    await service.confirmEdit(p.ticket);
    expect(provider.updateEvent).toHaveBeenCalledWith(
      "tasks",
      "event",
      {
        summary: "Updated title",
        start: { date: "2099-01-02" },
        end: { date: "2099-01-03" },
      },
      "v1",
    );
    await expect(service.confirmEdit(p.ticket)).rejects.toThrow("expired");
  });
  it("cancels edits and rejects stale previews without any write", async () => {
    const { service, provider } = manual();
    const input = {
      title: "Updated title",
      start: "2099-01-02",
      end: "2099-01-03",
    };
    const p = await service.previewEdit("tasks", "event", input);
    service.cancelEdit(p.ticket);
    await expect(service.confirmEdit(p.ticket)).rejects.toThrow("expired");
    const next = await service.previewEdit("tasks", "event", input);
    provider.getEvent.mockResolvedValue({
      id: "event",
      calendarId: "tasks",
      summary: "Changed remotely",
      etag: "v2",
      start: { date: "2099-01-01" },
    });
    await expect(service.confirmEdit(next.ticket)).rejects.toThrow("changed");
    expect(provider.updateEvent).not.toHaveBeenCalled();
  });
  it("rejects read-only edits and invalid end dates", async () => {
    const { service, provider, calendars } = manual();
    await expect(
      service.previewEdit("tasks", "event", {
        title: "Test",
        start: "2099-01-03",
        end: "2099-01-02",
      }),
    ).rejects.toThrow("end must be after");
    calendars[0].role = "reader";
    await expect(
      service.previewEdit("tasks", "event", {
        title: "Test",
        start: "2099-01-02",
        end: "2099-01-03",
      }),
    ).rejects.toThrow("read-only");
    expect(provider.updateEvent).not.toHaveBeenCalled();
  });
  it("creates yearly important dates with explicit reminders and no model", async () => {
    const { service, provider } = manual();
    expect(
      await service.create({
        accountId: "a",
        category: "date",
        title: "Birthday",
        start: "2099-03-14",
        allDay: true,
        yearly: true,
        reminders: [2340],
      }),
    ).toContain("Added");
    const [id, event] = provider.createEvent.mock.calls[0];
    expect(id).toBe("dates");
    expect(event).toMatchObject({
      recurrence: ["RRULE:FREQ=YEARLY"],
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: 2340 }],
      },
      extendedProperties: { private: { petApp: "1" } },
    });
  });
  it("never writes invalid accounts, past dates, or timed yearly events", async () => {
    const { service, provider } = manual();
    const input = {
      accountId: "a",
      category: "task",
      title: "Test",
      start: "2099-01-01",
      allDay: true,
      yearly: false,
      reminders: [0],
    };
    for (const value of [
      { ...input, accountId: "missing" },
      { ...input, start: "2000-01-01" },
      { ...input, allDay: false, yearly: true, start: "2099-01-01T09:00" },
    ])
      await expect(service.create(value)).rejects.toThrow();
    expect(provider.createEvent).not.toHaveBeenCalled();
  });
  it("does not delete on preview or cancel, and rejects reused tickets", async () => {
    const { service, provider } = manual();
    const p = await service.preview("tasks", "event", "instance");
    expect(provider.deleteEvent).not.toHaveBeenCalled();
    service.cancel(p.ticket);
    await expect(service.confirm(p.ticket)).rejects.toThrow("expired");
    const next = await service.preview("tasks", "event", "instance");
    await service.confirm(next.ticket);
    expect(provider.deleteEvent).toHaveBeenCalledWith("tasks", "event", "v1");
    await expect(service.confirm(next.ticket)).rejects.toThrow("expired");
  });
  it("rejects stale confirmation and removed calendars", async () => {
    const { service, provider, calendars } = manual();
    const p = await service.preview("tasks", "event", "instance");
    provider.getEvent.mockResolvedValue({
      id: "event",
      calendarId: "tasks",
      summary: "Test",
      etag: "v2",
      start: { date: "2099-01-01" },
    });
    await expect(service.confirm(p.ticket)).rejects.toThrow("changed");
    const next = await service.preview("tasks", "event", "instance");
    calendars.length = 0;
    await expect(service.confirm(next.ticket)).rejects.toThrow("removed");
    expect(provider.deleteEvent).not.toHaveBeenCalled();
  });
  it("confirms the series master and refuses read-only calendars", async () => {
    const { service, provider, calendars } = manual();
    provider.getEvent.mockResolvedValueOnce({
      id: "event",
      calendarId: "tasks",
      summary: "Test",
      etag: "v1",
      start: { date: "2099-01-01" },
      recurringEventId: "master",
    } as never);
    provider.getEvent.mockResolvedValue({
      id: "master",
      calendarId: "tasks",
      summary: "Series",
      etag: "v1",
      start: { date: "2099-01-01" },
    });
    const p = await service.preview("tasks", "event", "series");
    expect(p.title).toContain("Entire series");
    await service.confirm(p.ticket);
    expect(provider.deleteEvent).toHaveBeenCalledWith("tasks", "master", "v1");
    calendars[0].role = "reader";
    await expect(service.preview("tasks", "event", "instance")).rejects.toThrow(
      "cannot delete",
    );
  });
  it("reports successful writes separately from refresh failures", async () => {
    const { service, provider, refresh } = manual();
    refresh.mockRejectedValue(new Error("offline"));
    expect(
      await service.create({
        accountId: "a",
        category: "task",
        title: "Test",
        start: "2099-01-01",
        allDay: true,
        yearly: false,
        reminders: [],
      }),
    ).toContain("Google saved the change");
    expect(provider.createEvent).toHaveBeenCalledTimes(1);
  });
});
