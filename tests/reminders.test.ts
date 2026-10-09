import { describe, it, expect, vi } from "vitest";
import { DateTime } from "luxon";
import {
  allDayOffset,
  eventTimes,
  explicitReminders,
} from "../src/main/calendar/mapping";
import {
  ReminderEngine,
  plans,
  eventStart,
  inQuietHours,
} from "../src/main/sync/reminders";
import type { CalendarEvent, Settings, Reminder } from "../src/shared/types";
const settings: Settings = {
  googleClientId: "",
  model: "test",
  aiProvider: "anthropic",
  aiBaseUrl: "",
  aiKeyRequired: true,
  aiValidationFingerprint: "",
  hotkey: "Ctrl+Alt+B",
  aiEnabled: false,
  accounts: [],
  defaultAccountId: "",
  selectedCalendars: [],
  petCalendars: {},
  meetingLead: 10,
  pollMinutes: 3,
  sound: false,
  startAtLogin: false,
  skin: "ginger",
  quietStart: "",
  quietEnd: "",
  paused: false,
};
const event: CalendarEvent = {
  calendarId: "work",
  id: "dentist",
  summary: "Dentist",
  start: { dateTime: "2026-10-09T10:00:00+05:30" },
};
describe("calendar time math", () => {
  it("reminds two days before midnight at 9am", () => {
    expect(allDayOffset(2)).toBe(2340);
    expect(
      DateTime.fromISO("2027-03-14", { zone: "Asia/Kolkata" })
        .minus({ minutes: 2340 })
        .toFormat("yyyy-MM-dd HH:mm"),
    ).toBe("2027-03-12 09:00");
  });
  it("rejects same-day positive-hour reminders and excessively early reminders", () => {
    expect(() => allDayOffset(0, 9)).toThrow();
    expect(() => allDayOffset(30)).toThrow();
  });
  it("all-day end is exclusive and crosses month boundaries", () =>
    expect(eventTimes("2026-10-31", true, "Asia/Kolkata").end).toEqual({
      date: "2026-11-01",
      dateTime: null,
      timeZone: null,
    }));
  it("clears the opposite date representation on Google patches", () => {
    expect(eventTimes("2026-10-31", true, "UTC").start.dateTime).toBeNull();
    expect(
      eventTimes("2026-10-31T16:00:00Z", false, "UTC").start.date,
    ).toBeNull();
  });
  it("makes explicit reminders and validates maximum", () => {
    expect(explicitReminders([0, 10, 10]).overrides).toHaveLength(2);
    expect(() => explicitReminders([40321])).toThrow();
  });
  it("uses calendar timezone for all-day events", () => {
    const all = {
      ...event,
      start: { date: "2026-10-09" },
      calendarZone: "America/New_York",
    };
    expect(eventStart(all, "Asia/Kolkata")).toBe(
      DateTime.fromISO("2026-10-09", { zone: "America/New_York" }).toMillis(),
    );
  });
  it("distinguishes repeated times at DST fall-back", () => {
    expect(
      eventStart(
        { ...event, start: { dateTime: "2026-11-01T01:30:00-05:00" } },
        "UTC",
      ) -
        eventStart(
          { ...event, start: { dateTime: "2026-11-01T01:30:00-04:00" } },
          "UTC",
        ),
    ).toBe(3600000);
  });
  it("adds meeting heads-up but avoids pet duplicate defaults", () => {
    expect(plans([event], settings, "UTC")).toHaveLength(1);
    expect(
      plans(
        [
          {
            ...event,
            extendedProperties: { private: { petApp: "1" } },
            reminders: {
              useDefault: false,
              overrides: [{ method: "popup", minutes: 0 }],
            },
          },
        ],
        settings,
        "UTC",
      )[0].fireAt,
    ).toBe(eventStart(event, "UTC"));
  });
  it("keys include calendar identity", () =>
    expect(
      plans([event, { ...event, calendarId: "personal" }], settings, "UTC")[0]
        .key,
    ).not.toBe(
      plans([event, { ...event, calendarId: "personal" }], settings, "UTC")[1]
        .key,
    ));
  it("quiet hours span midnight", () => {
    expect(
      inQuietHours(DateTime.fromISO("2026-10-09T23:00"), "22:00", "07:00"),
    ).toBe(true);
    expect(
      inQuietHours(DateTime.fromISO("2026-10-10T06:00"), "22:00", "07:00"),
    ).toBe(true);
    expect(
      inQuietHours(DateTime.fromISO("2026-10-10T12:00"), "22:00", "07:00"),
    ).toBe(false);
  });
});
describe("reminder delivery", () => {
  it("delivers once across rebuilds and restarts, then snoozes once", () => {
    let now = DateTime.fromISO("2026-10-09T09:50:00+05:30").toMillis();
    let fired = {};
    const deliveries: Reminder[] = [];
    const engine = new ReminderEngine(
      () => settings,
      {},
      (value) => {
        fired = { ...value };
      },
      (r) => deliveries.push(r),
      () => now,
      () => "Asia/Kolkata",
    );
    engine.rebuild([event]);
    engine.tick();
    engine.rebuild([event]);
    expect(deliveries).toHaveLength(1);
    engine.snooze(deliveries[0].key, 5);
    now += 5 * 60000;
    engine.tick();
    engine.tick();
    expect(deliveries).toHaveLength(2);
    const restarted = new ReminderEngine(
      () => settings,
      fired,
      () => {},
      (r) => deliveries.push(r),
      () => now,
      () => "Asia/Kolkata",
    );
    restarted.rebuild([event]);
    expect(deliveries).toHaveLength(2);
  });
  it("fires missed reminders within grace, ignores older ones", () => {
    const deliveries: Reminder[] = [];
    const now = DateTime.fromISO("2026-10-09T10:10:00+05:30").toMillis();
    const engine = new ReminderEngine(
      () => settings,
      {},
      () => {},
      (r) => deliveries.push(r),
      () => now,
      () => "Asia/Kolkata",
    );
    engine.rebuild([event]);
    expect(deliveries[0].missed).toBe(true);
    new ReminderEngine(
      () => settings,
      {},
      () => {},
      (r) => deliveries.push(r),
      () => now + 31 * 60000,
      () => "Asia/Kolkata",
    ).rebuild([event]);
    expect(deliveries).toHaveLength(1);
  });
  it("pause and quiet hours do not consume reminder keys", () => {
    let paused = true;
    const deliveries: Reminder[] = [];
    const now = DateTime.fromISO("2026-10-09T09:50:00+05:30").toMillis();
    const engine = new ReminderEngine(
      () => ({ ...settings, paused }),
      {},
      () => {},
      (r) => deliveries.push(r),
      () => now,
      () => "Asia/Kolkata",
    );
    engine.rebuild([event]);
    expect(deliveries).toHaveLength(0);
    paused = false;
    engine.tick();
    expect(deliveries).toHaveLength(1);
  });
});

describe("deadline-driven reminder timer", () => {
  it("fires exactly at the due time without one-second polling", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-09T00:00:00Z"));
      const deliver = vi.fn();
      const engine = new ReminderEngine(
        () => ({ ...settings, meetingLead: 0 }),
        {},
        () => {},
        deliver,
      );
      engine.rebuild([
        { ...event, start: { dateTime: "2026-10-09T00:00:05Z" } },
      ]);
      engine.start();
      vi.advanceTimersByTime(4999);
      expect(deliver).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(deliver).toHaveBeenCalledTimes(1);
      engine.stop();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it("keeps only a minute reconciliation timer when idle", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-09T00:00:00Z"));
      const read = vi.fn(() => settings);
      const engine = new ReminderEngine(
        read,
        {},
        () => {},
        () => {},
      );
      engine.start();
      read.mockClear();
      vi.advanceTimersByTime(59000);
      expect(read).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(read).toHaveBeenCalledTimes(1);
      engine.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
