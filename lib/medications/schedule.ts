import type { MedicationDraft, Recipient } from "./types";

const exactTimePattern = /\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/gi;

function normalizeTime(hourText: string, minuteText: string | undefined, meridiem: string) {
  const hour = Number(hourText);
  if (hour < 1 || hour > 12) return null;
  return `${hour}:${minuteText ?? "00"} ${meridiem.toLowerCase().startsWith("a") ? "AM" : "PM"}`;
}

export function suggestSchedule(directions: string, recipient: Recipient) {
  const text = directions.toLowerCase();
  const exactTimes = Array.from(directions.matchAll(exactTimePattern))
    .map((match) => normalizeTime(match[1], match[2], match[3]))
    .filter((time): time is string => Boolean(time));

  if (/as needed|\bprn\b/.test(text)) {
    return { times: [], asNeeded: true, reason: "This label says to take it only as needed. Fixed reminders are off." };
  }
  if (/every\s+\d+\s+hours?/.test(text)) {
    return { times: [], asNeeded: false, reason: "Choose the first dose time before creating an every-hours schedule." };
  }
  if (/taper|then take|for \d+ days/.test(text)) {
    return { times: [], asNeeded: false, reason: "This may be a changing schedule. Enter each phase manually." };
  }
  if (exactTimes.length) {
    return { times: [...new Set(exactTimes)], asNeeded: false, reason: "Times were stated directly in the confirmed directions." };
  }
  if (/bedtime|at night|nightly/.test(text)) {
    return { times: [recipient.routine.bedtime], asNeeded: false, reason: "Suggested from the recipient’s bedtime routine." };
  }
  if (/with breakfast|in the morning|every morning/.test(text)) {
    return { times: [recipient.routine.breakfast], asNeeded: false, reason: "Suggested from the recipient’s breakfast routine." };
  }
  if (/with dinner|evening/.test(text)) {
    return { times: [recipient.routine.dinner], asNeeded: false, reason: "Suggested from the recipient’s dinner routine." };
  }
  if (/twice (?:a|daily)|two times (?:a|daily)|\bbid\b/.test(text)) {
    return { times: [recipient.routine.breakfast, recipient.routine.dinner], asNeeded: false, reason: "Twice-daily suggestion using breakfast and dinner. Confirm before saving." };
  }
  if (/three times (?:a|daily)|\btid\b/.test(text)) {
    return { times: [recipient.routine.breakfast, recipient.routine.lunch, recipient.routine.dinner], asNeeded: false, reason: "Three-times-daily suggestion using meal anchors. Confirm before saving." };
  }
  if (/once (?:a|daily)|daily/.test(text)) {
    return { times: [recipient.routine.breakfast], asNeeded: false, reason: "Once-daily suggestion using breakfast. Confirm before saving." };
  }
  return { times: [], asNeeded: false, reason: "The directions do not provide enough timing information. Add times manually." };
}

export function applyScheduleSuggestion(draft: MedicationDraft, recipient: Recipient): MedicationDraft {
  const suggestion = suggestSchedule(draft.directions, recipient);
  return { ...draft, scheduleTimes: suggestion.times, scheduleReason: suggestion.reason, asNeeded: suggestion.asNeeded };
}
