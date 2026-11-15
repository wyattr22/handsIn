/** Opt-in presenter adapter. Not exposed on window or enabled on normal routes. */
export type CalendarWalkthrough = {
  snapshot: { recipient: string; entryId: string | null; action: string | null; accepted: boolean; completed: boolean; note: string; error: string };
  prepare: () => void;
  open: () => void;
  accept: () => void;
  record: () => void;
  write: (note: string) => void;
  save: () => void;
};
