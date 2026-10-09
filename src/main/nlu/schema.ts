import { z } from "zod";
import { DateTime } from "luxon";
import { RRule } from "rrule";
const start = z
  .string()
  .refine(
    (s) =>
      /^\d{4}-\d{2}-\d{2}$/.test(s)
        ? DateTime.fromISO(s).isValid
        : /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(s) &&
          DateTime.fromISO(s, { setZone: true }).isValid,
    "Use a valid ISO date or datetime with an explicit UTC offset",
  );
const recurrence = z
  .string()
  .max(250)
  .refine((value) => {
    if (!/^RRULE:[A-Z0-9=,;+-]+$/.test(value)) return false;
    try {
      return RRule.fromString(value).options.freq !== RRule.SECONDLY;
    } catch {
      return false;
    }
  }, "Invalid recurrence rule");
// Leads over four weeks are accepted here, then handled as a clarification, never clamped silently.
const offsets = z.array(z.number().int().min(0).max(525600)).max(5);
const changes = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    start: start.optional(),
    all_day: z.boolean().optional(),
    recurrence: recurrence.nullable().optional(),
    reminders_minutes_before: offsets.optional(),
  })
  .strict();
export const intentSchema = z
  .object({
    action: z.enum(["create", "update", "delete", "query", "unknown"]),
    category: z.enum(["task", "date", "reminder"]),
    title: z.string().max(300),
    start: start.nullable(),
    all_day: z.boolean(),
    recurrence: recurrence.nullable(),
    reminders_minutes_before: offsets,
    target_query: z.string().max(300),
    changes,
    confidence: z.number().min(0).max(1),
    clarification_needed: z.string().max(500).nullable(),
  })
  .strict()
  .superRefine((intent, ctx) => {
    if (
      intent.start &&
      intent.all_day !== /^\d{4}-\d{2}-\d{2}$/.test(intent.start)
    )
      ctx.addIssue({
        code: "custom",
        message: "all_day must match the start date format",
        path: ["start"],
      });
    if (
      intent.changes.start &&
      intent.changes.all_day !== undefined &&
      intent.changes.all_day !==
        /^\d{4}-\d{2}-\d{2}$/.test(intent.changes.start)
    )
      ctx.addIssue({
        code: "custom",
        message: "Changed all_day must match start",
        path: ["changes"],
      });
  });
export type Intent = z.infer<typeof intentSchema>;
export function parseIntent(text: string): Intent {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return intentSchema.parse(JSON.parse(clean));
  } catch {
    throw new Error(
      "I could not safely understand that. Please rephrase with a title and date or time.",
    );
  }
}
