import { it, expect, vi } from "vitest";
import { SyncService } from "../src/main/sync/sync";
import { retryRead } from "../src/main/calendar/provider";
import type { CalendarProvider } from "../src/main/calendar/provider";
const calendars = [
  {
    id: "one",
    title: "Calendar",
    role: "owner",
    timeZone: "UTC",
    defaultOffsets: [],
  },
];
it("unchanged incremental polls keep the cached window and avoid a second expanded request", async () => {
  const event = {
    id: "cached",
    calendarId: "one",
    start: { date: "2026-10-10" },
  };
  const listEvents = vi
    .fn()
    .mockResolvedValueOnce({ items: [], nextSyncToken: "token" })
    .mockResolvedValueOnce({ items: [event] })
    .mockResolvedValue({ items: [], nextSyncToken: "token" });
  const service = new SyncService(
    { listEvents } as unknown as CalendarProvider,
    [],
    () => {},
  );
  await service.run(calendars);
  expect(await service.run(calendars)).toEqual([
    expect.objectContaining({ id: "cached" }),
  ]);
  expect(listEvents).toHaveBeenCalledTimes(3);
  expect(listEvents.mock.calls[2][1]).toEqual({
    syncToken: "token",
    singleEvents: false,
  });
  await service.run(calendars, true);
  expect(listEvents).toHaveBeenCalledTimes(5);
  expect(listEvents.mock.calls[4][1].singleEvents).toBe(true);
});
it("separates change feed from expanded window and recovers 410", async () => {
  const listEvents = vi
    .fn()
    .mockResolvedValueOnce({ items: [], nextSyncToken: "first" })
    .mockResolvedValueOnce({
      items: [{ id: "a", calendarId: "one", start: { date: "2026-10-10" } }],
    })
    .mockRejectedValueOnce({ code: 410 })
    .mockResolvedValueOnce({ items: [], nextSyncToken: "second" })
    .mockResolvedValueOnce({ items: [] });
  const save = vi.fn();
  const service = new SyncService(
    { listEvents } as unknown as CalendarProvider,
    [],
    save,
  );
  await service.run(calendars);
  await service.run(calendars);
  expect(listEvents.mock.calls[0][1]).toEqual({
    syncToken: undefined,
    singleEvents: false,
  });
  expect(listEvents.mock.calls[1][1].singleEvents).toBe(true);
  expect(listEvents.mock.calls[2][1]).toEqual({
    syncToken: "first",
    singleEvents: false,
  });
  expect(save).toHaveBeenLastCalledWith([]);
});
it("retries window refresh after a failed fetch even if the new change token was committed", async () => {
  const listEvents = vi
    .fn()
    .mockResolvedValueOnce({ items: [], nextSyncToken: "one" })
    .mockResolvedValueOnce({ items: [] })
    .mockResolvedValueOnce({ items: [{ id: "changed" }], nextSyncToken: "two" })
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ items: [], nextSyncToken: "three" })
    .mockResolvedValueOnce({ items: [] });
  const service = new SyncService(
    { listEvents } as unknown as CalendarProvider,
    [],
    () => {},
  );
  await service.run(calendars);
  await expect(service.run(calendars)).rejects.toThrow();
  await service.run(calendars);
  expect(listEvents).toHaveBeenCalledTimes(6);
});
it("does not commit results after disconnect", async () => {
  const save = vi.fn();
  const listEvents = vi.fn(async () => ({ items: [], nextSyncToken: "token" }));
  const service = new SyncService(
    { listEvents } as unknown as CalendarProvider,
    [],
    save,
  );
  service.stop();
  await service.run(calendars);
  expect(save).not.toHaveBeenCalled();
});
it("backs off retryable reads but never retries forbidden access", async () => {
  const read = vi
    .fn()
    .mockRejectedValueOnce({ code: 429 })
    .mockResolvedValue("ok");
  const sleep = vi.fn(async () => {});
  expect(await retryRead(read, sleep)).toBe("ok");
  expect(sleep).toHaveBeenCalledTimes(1);
  const denied = vi.fn().mockRejectedValue({ code: 403 });
  await expect(retryRead(denied, sleep)).rejects.toEqual({ code: 403 });
  expect(denied).toHaveBeenCalledTimes(1);
});
it("backs off Google 403 rate limits without retrying ordinary permission errors", async () => {
  const read = vi
    .fn()
    .mockRejectedValueOnce({
      code: 403,
      response: {
        data: { error: { errors: [{ reason: "userRateLimitExceeded" }] } },
      },
    })
    .mockResolvedValue("ok");
  const sleep = vi.fn(async () => {});
  expect(await retryRead(read, sleep)).toBe("ok");
  expect(sleep).toHaveBeenCalledTimes(1);
});
