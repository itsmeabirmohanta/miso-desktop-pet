import { DateTime } from "luxon";
import type { calendar_v3 } from "@googleapis/calendar";
import type { Intent } from "../nlu/schema";
import type { CalendarEvent } from "../../shared/types";
export function allDayOffset(days: number, hour = 9): number {
  const offset = days * 1440 - hour * 60;
  if (!Number.isInteger(offset) || offset < 0 || offset > 40320)
    throw new Error(
      "Use a separate timed reminder for this lead. Google allows reminders between midnight and four weeks before.",
    );
  return offset;
}
export function explicitReminders(offsets: number[]) {
  if (
    offsets.length > 5 ||
    offsets.some((n) => !Number.isInteger(n) || n < 0 || n > 40320)
  )
    throw new Error(
      "Google supports at most five reminders, up to four weeks before. Create a separate dated reminder for longer leads.",
    );
  return {
    useDefault: false,
    overrides: [...new Set(offsets)].map((minutes) => ({
      method: "popup",
      minutes,
    })),
  };
}
export function eventTimes(
  start: string,
  allDay: boolean,
  zone: string,
  durationMinutes = 15,
) {
  const date = DateTime.fromISO(start, { zone, setZone: !allDay });
  if (!date.isValid || allDay !== /^\d{4}-\d{2}-\d{2}$/.test(start))
    throw new Error(
      "The event date and time are inconsistent. Please rephrase.",
    );
  return allDay
    ? {
        start: { date: start, dateTime: null, timeZone: null },
        end: {
          date: date.plus({ days: 1 }).toISODate()!,
          dateTime: null,
          timeZone: null,
        },
      }
    : {
        start: { date: null, dateTime: date.toISO()!, timeZone: zone },
        end: {
          date: null,
          dateTime: date.plus({ minutes: durationMinutes }).toISO()!,
          timeZone: zone,
        },
      };
}
export function createPayload(
  intent: Intent,
  sentence: string,
  zone: string,
): calendar_v3.Schema$Event {
  if (!intent.start || !intent.title.trim())
    throw new Error("What should I call it, and when is it due?");
  return {
    summary: intent.title.trim(),
    ...eventTimes(
      intent.start,
      intent.all_day,
      zone,
      intent.duration_minutes ?? 15,
    ),
    recurrence: intent.recurrence ? [intent.recurrence] : undefined,
    reminders: explicitReminders(intent.reminders_minutes_before),
    extendedProperties: {
      private: {
        petApp: "1",
        petCategory: intent.category,
        petCreatedFrom: sentence.slice(0, 1000),
      },
    },
  };
}
export function updatePayload(
  intent: Intent,
  event: CalendarEvent,
  zone: string,
): calendar_v3.Schema$Event {
  const c = intent.changes;
  const payload: calendar_v3.Schema$Event = {};
  if (c.title !== undefined) payload.summary = c.title;
  if (c.start) {
    const allDay = c.all_day ?? /^\d{4}-\d{2}-\d{2}$/.test(c.start);
    const oldStart = event.start?.dateTime,
      oldEnd = event.end?.dateTime;
    const duration =
      oldStart && oldEnd
        ? (DateTime.fromISO(oldEnd).toMillis() -
            DateTime.fromISO(oldStart).toMillis()) /
          60000
        : 15;
    Object.assign(
      payload,
      eventTimes(c.start, allDay, zone, duration > 0 ? duration : 15),
    );
  } else if (c.all_day !== undefined)
    throw new Error(
      "Give a date or time when changing an event between all-day and timed.",
    );
  if (c.recurrence !== undefined)
    payload.recurrence = c.recurrence ? [c.recurrence] : [];
  if (c.reminders_minutes_before !== undefined)
    payload.reminders = explicitReminders(c.reminders_minutes_before);
  if (Object.keys(payload).length === 0)
    throw new Error("What would you like to change?");
  return payload;
}
