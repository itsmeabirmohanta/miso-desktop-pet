import { DateTime } from "luxon";
import type { CalendarEvent, Reminder, Settings } from "../../shared/types";
export function eventStart(event: CalendarEvent, zone: string): number {
  return event.start?.dateTime
    ? DateTime.fromISO(event.start.dateTime, {
        zone: event.start.timeZone ?? zone,
      }).toMillis()
    : DateTime.fromISO(event.start?.date ?? "", {
        zone: event.start?.timeZone ?? event.calendarZone ?? zone,
      })
        .startOf("day")
        .toMillis();
}
export function plans(
  events: CalendarEvent[],
  settings: Settings,
  zone: string,
): Reminder[] {
  return events
    .filter((e) => e.status !== "cancelled" && e.id && e.start)
    .flatMap((event) => {
      const pet = event.extendedProperties?.private?.petApp === "1";
      let offsets = event.reminders?.useDefault
        ? (event.defaultOffsets ?? [])
        : (event.reminders?.overrides ?? [])
            .filter((r) => r.method === "popup")
            .map((r) => r.minutes ?? 0);
      if (!pet && event.start?.dateTime)
        offsets = [...new Set([...offsets, settings.meetingLead])];
      return offsets.map((offset) => ({
        key: JSON.stringify([
          event.calendarId,
          event.id,
          event.start?.dateTime ?? event.start?.date,
          offset,
        ]),
        title: event.summary ?? "Untitled event",
        event,
        fireAt: eventStart(event, zone) - offset * 60000,
        missed: false,
      }));
    })
    .filter((r) => Number.isFinite(r.fireAt))
    .sort((a, b) => a.fireAt - b.fireAt);
}
export function inQuietHours(
  now: DateTime,
  start: string,
  end: string,
): boolean {
  if (!start || !end || start === end) return false;
  const t = now.toFormat("HH:mm");
  return start < end ? t >= start && t < end : t >= start || t < end;
}
export class ReminderEngine {
  private upcoming: Reminder[] = [];
  private snoozed: Reminder[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private fired: Record<string, number>;
  private active = new Map<string, Reminder>();
  constructor(
    private settings: () => Settings,
    fired: Record<string, number>,
    private persist: (fired: Record<string, number>) => void,
    private deliver: (reminder: Reminder) => void,
    private now = () => Date.now(),
    private zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  ) {
    this.fired = { ...fired };
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.tick();
  }
  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
  rebuild(events: CalendarEvent[]) {
    this.upcoming = plans(events, this.settings(), this.zone());
    this.tick();
  }
  tick() {
    const now = this.now();
    const settings = this.settings();
    // Leave due entries unfired while paused/quiet; the grace window applies when delivery resumes.
    if (
      settings.paused ||
      inQuietHours(
        DateTime.fromMillis(now, { zone: this.zone() }),
        settings.quietStart,
        settings.quietEnd,
      )
    ) {
      this.schedule(true);
      return;
    }
    for (const reminder of [...this.upcoming, ...this.snoozed]) {
      if (
        reminder.fireAt > now ||
        now - reminder.fireAt > 30 * 60000 ||
        this.fired[reminder.key]
      )
        continue;
      this.fired[reminder.key] = now;
      const value = { ...reminder, missed: now - reminder.fireAt > 60000 };
      this.active.set(value.key, value);
      this.persist(this.fired);
      this.deliver(value);
    }
    const cutoff = now - 7 * 86400000;
    let changed = false;
    for (const [key, at] of Object.entries(this.fired))
      if (at < cutoff) {
        delete this.fired[key];
        changed = true;
      }
    for (const [key, value] of this.active)
      if (value.fireAt < cutoff) this.active.delete(key);
    this.snoozed = this.snoozed.filter((r) => r.fireAt >= now - 30 * 60000);
    if (changed) this.persist(this.fired);
    this.schedule();
  }
  private schedule(blocked = false) {
    if (!this.running) return;
    if (this.timer) clearTimeout(this.timer);
    const now = this.now();
    let delay = 60000 - (now % 60000);
    if (!blocked)
      for (const reminder of [...this.upcoming, ...this.snoozed])
        if (!this.fired[reminder.key] && reminder.fireAt > now)
          delay = Math.min(delay, reminder.fireAt - now);
    this.timer = setTimeout(() => this.tick(), Math.max(1, delay));
  }
  snooze(key: string, minutes: number) {
    if (![5, 15, 60].includes(minutes))
      throw new Error("Choose a 5, 15 or 60 minute snooze.");
    const source = this.active.get(key);
    if (!source) throw new Error("That reminder is no longer active.");
    this.snoozed.push({
      ...source,
      key: `${key}:snooze:${this.now()}`,
      fireAt: this.now() + minutes * 60000,
      missed: false,
    });
    this.active.delete(key);
    this.schedule();
  }
  done(key: string) {
    this.active.delete(key);
  }
  clear(resetHistory = false) {
    if (resetHistory) {
      this.fired = {};
      this.persist(this.fired);
    }
    this.upcoming = [];
    this.snoozed = [];
    this.active.clear();
    this.schedule();
  }
}
