export type ResultFlag = "high" | "low" | "in-range" | "abnormal" | "not-provided";
export type ResultReview = "needs-review" | "confirmed" | "corrected" | "missing-context";

export type LabResult = {
  id: string;
  testName: string;
  rawValue: string;
  numericValue: string;
  comparator: string;
  qualitativeValue: string;
  unit: string;
  referenceRange: string;
  flag: ResultFlag;
  review: ResultReview;
  sourceLine: string;
};

export type HealthDraft = {
  recipientId: string;
  sourceName: string;
  sourceType: "image" | "pdf" | "sample" | "";
  sourceUrl: string;
  pageCount: number;
  rawText: string;
  reportType: "blood" | "urine" | "other";
  laboratory: string;
  collectedDate: string;
  reportedDate: string;
  specimen: string;
  orderingProvider: string;
  results: LabResult[];
  questions: string[];
  notes: string;
};

export type HealthRecipient = { id: string; name: string; initials: string; relationship: string };

export const healthRecipients: HealthRecipient[] = [
  { id: "dad", name: "Dad", initials: "DR", relationship: "Father" },
  { id: "mom", name: "Mom", initials: "MR", relationship: "Mother" },
];

export const emptyHealthDraft: HealthDraft = {
  recipientId: "", sourceName: "", sourceType: "", sourceUrl: "", pageCount: 0, rawText: "",
  reportType: "blood", laboratory: "", collectedDate: "", reportedDate: "", specimen: "",
  orderingProvider: "", results: [], questions: [], notes: "",
};
