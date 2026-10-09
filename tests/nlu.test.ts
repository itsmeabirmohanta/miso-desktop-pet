import { describe, it, expect, vi } from "vitest";
import { InputService, systemPrompt } from "../src/main/nlu/input";
import { parseIntent, intentSchema, type Intent } from "../src/main/nlu/schema";
import { DateTime } from "luxon";
const base: Intent = {
  action: "create",
  category: "task",
  title: "Submit report",
  start: "2026-10-09T17:00:00+05:30",
  all_day: false,
  recurrence: null,
  reminders_minutes_before: [0],
  target_query: "",
  changes: {},
  confidence: 0.98,
  clarification_needed: null,
};
const examples: [string, Partial<Intent>][] = [
  ["Submit report Friday 5pm", {}],
  [
    "Remind me tomorrow at 9 to stretch",
    {
      category: "reminder",
      title: "Stretch",
      start: "2026-10-10T09:00:00+05:30",
    },
  ],
  [
    "Ravi birthday March 14 two days before",
    {
      category: "date",
      title: "Ravi's birthday",
      start: "2027-03-14",
      all_day: true,
      recurrence: "RRULE:FREQ=YEARLY",
      reminders_minutes_before: [2340],
    },
  ],
  [
    "Water in two hours",
    {
      category: "reminder",
      title: "Drink water",
      start: "2026-10-09T14:00:00+05:30",
    },
  ],
  [
    "Move dentist to Monday 4pm",
    {
      action: "update",
      title: "",
      start: null,
      target_query: "dentist",
      changes: { start: "2026-10-12T16:00:00+05:30", all_day: false },
    },
  ],
  [
    "Delete gym reminder",
    { action: "delete", title: "", start: null, target_query: "gym" },
  ],
  ["What is coming up?", { action: "query", title: "", start: null }],
  [
    "Buy groceries tomorrow",
    { title: "Buy groceries", start: "2026-10-10", all_day: true },
  ],
  [
    "Anniversary on December 20",
    {
      category: "date",
      title: "Anniversary",
      start: "2026-12-20",
      all_day: true,
      recurrence: "RRULE:FREQ=YEARLY",
    },
  ],
  [
    "Gym every Monday 6pm",
    {
      title: "Gym",
      start: "2026-10-12T18:00:00+05:30",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO",
    },
  ],
  [
    "Standup weekdays at 10",
    {
      title: "Standup",
      start: "2026-10-12T10:00:00+05:30",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    },
  ],
  [
    "Pay rent first of every month",
    {
      title: "Pay rent",
      start: "2026-11-01",
      all_day: true,
      recurrence: "RRULE:FREQ=MONTHLY;BYMONTHDAY=1",
    },
  ],
  [
    "Tea every day at 4",
    {
      category: "reminder",
      title: "Tea",
      start: "2026-10-09T16:00:00+05:30",
      recurrence: "RRULE:FREQ=DAILY",
    },
  ],
  ["Remind ten minutes before report", { reminders_minutes_before: [10] }],
  ["Remind one hour before", { reminders_minutes_before: [60] }],
  [
    "Remind day before birthday at nine",
    {
      category: "date",
      start: "2027-03-14",
      all_day: true,
      reminders_minutes_before: [900],
    },
  ],
  ["Remind four weeks before", { reminders_minutes_before: [40320] }],
  ["Remind five weeks before", { reminders_minutes_before: [50400] }],
  [
    "Rename dentist to dental checkup",
    {
      action: "update",
      start: null,
      target_query: "dentist",
      changes: { title: "Dental checkup" },
    },
  ],
  [
    "Remove recurrence from gym",
    {
      action: "update",
      start: null,
      target_query: "gym",
      changes: { recurrence: null },
    },
  ],
  [
    "Move report to tomorrow all day",
    {
      action: "update",
      start: null,
      target_query: "report",
      changes: { start: "2026-10-10", all_day: true },
    },
  ],
  [
    "Make gym repeat weekly",
    {
      action: "update",
      start: null,
      target_query: "gym",
      changes: { recurrence: "RRULE:FREQ=WEEKLY" },
    },
  ],
  ["Find dentist", { action: "query", start: null, target_query: "dentist" }],
  [
    "Remember something",
    {
      action: "unknown",
      start: null,
      confidence: 0.3,
      clarification_needed: "What should I remember?",
    },
  ],
  [
    "Submit report someday",
    { start: null, confidence: 0.6, clarification_needed: "Which date?" },
  ],
  [
    "Leap day birthday",
    {
      category: "date",
      start: "2028-02-29",
      all_day: true,
      recurrence: "RRULE:FREQ=YEARLY",
    },
  ],
  ["Before DST change", { start: "2026-11-01T01:30:00-04:00" }],
  ["After DST change", { start: "2026-11-01T01:30:00-05:00" }],
  ["Call at midnight UTC", { start: "2026-10-10T00:00:00Z" }],
  [
    "Delete weekly meeting",
    { action: "delete", start: null, target_query: "weekly meeting" },
  ],
  ["Alert twice", { reminders_minutes_before: [10, 0] }],
  [
    "Birthday without reminder",
    {
      category: "date",
      start: "2027-03-14",
      all_day: true,
      reminders_minutes_before: [],
    },
  ],
];
describe("NLU transport and parser (fixed mocked model fixtures; not a claim about live accuracy)", () => {
  it.each(examples)(
    "validates expected model output for %s",
    async (sentence, patch) => {
      const expected = { ...base, ...patch };
      const transport = vi.fn(
        async (_url: unknown, _options?: RequestInit) =>
          new Response(
            JSON.stringify({
              content: [
                {
                  type: "text",
                  text: "```json\n" + JSON.stringify(expected) + "\n```",
                },
              ],
            }),
            { status: 200 },
          ),
      );
      const service = new InputService(
        () => "test-key",
        () => "configured-model",
        transport as typeof fetch,
      );
      expect(await service.parse(sentence)).toEqual(expected);
      const request = JSON.parse(transport.mock.calls[0][1]!.body as string);
      expect(request.model).toBe("configured-model");
      expect(JSON.parse(request.messages[0].content).command).toBe(sentence);
    },
  );
  it.each(["{", "null", "[]", "```json\n{}\n```"])(
    "rejects malformed output %s",
    (value) => expect(() => parseIntent(value)).toThrow(),
  );
  it.each([
    { start: "2026-02-30" },
    { start: "2026-10-09T17:00:00" },
    { confidence: 2 },
    { reminders_minutes_before: [-1] },
    { reminders_minutes_before: [1.5] },
    { recurrence: "RRULE:FREQ=NOPE" },
    { recurrence: "RRULE:FREQ=SECONDLY" },
    { changes: { attendees: ["evil"] } },
    { evil: "instruction" },
  ])("rejects invalid data %j", (patch) =>
    expect(intentSchema.safeParse({ ...base, ...patch }).success).toBe(false),
  );
  it("keeps follow-up context and date math in the prompt", async () => {
    const prompt = systemPrompt(
      DateTime.fromISO("2026-10-09T12:00:00", { zone: "Asia/Kolkata" }),
      "en-IN",
    );
    expect(prompt).toContain("Asia/Kolkata");
    expect(prompt).toContain("2340");
    expect(prompt).toContain("2026-10-09");
    const transport = vi.fn(
      async (_url: unknown, _options?: RequestInit) =>
        new Response(
          JSON.stringify({
            content: [{ type: "text", text: JSON.stringify(base) }],
          }),
        ),
    );
    await new InputService(
      () => "key",
      () => "model",
      transport as typeof fetch,
    ).parse("Friday", { original: "Submit report", question: "When?" });
    const body = JSON.parse(transport.mock.calls[0][1]!.body as string);
    expect(JSON.parse(body.messages[0].content).original_command).toBe(
      "Submit report",
    );
  });
  it("does not call Claude without a key", async () => {
    const fetcher = vi.fn();
    await expect(
      new InputService(
        () => undefined,
        () => "model",
        fetcher,
      ).parse("hello"),
    ).rejects.toThrow("API key");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
