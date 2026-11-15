import type { HealthDraft, LabResult, ResultFlag } from "./types";

const resultLine = /^([A-Za-z][A-Za-z0-9 ()%/.,+_-]{1,45}?)\s{1,}(<?|>?|<=|>=)?\s*([+-]?\d+(?:\.\d+)?|positive|negative|detected|not detected|reactive|nonreactive)\s*([A-Za-zµμ/%0-9^.-]+)?\s*(?:\(?\s*([<>]?\s*[+-]?\d+(?:\.\d+)?\s*(?:-|to)\s*[+-]?\d+(?:\.\d+)?|[<>]\s*[+-]?\d+(?:\.\d+)?)\s*\)?)?\s*([HL*A])?$/i;

function inferFlag(marker: string | undefined): ResultFlag {
  const value = marker?.toUpperCase();
  if (value === "H") return "high";
  if (value === "L") return "low";
  if (value === "A" || value === "*") return "abnormal";
  return "not-provided";
}

export function parseReportText(rawText: string, current: HealthDraft): HealthDraft {
  const lines = rawText.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const results: LabResult[] = [];
  for (const line of lines) {
    const match = line.match(resultLine);
    if (!match) continue;
    const qualitative = /positive|negative|detected|reactive/i.test(match[3]) ? match[3] : "";
    results.push({
      id: crypto.randomUUID(), testName: match[1].trim(), rawValue: `${match[2] ?? ""}${match[3]}`,
      numericValue: qualitative ? "" : match[3], comparator: match[2] ?? "", qualitativeValue: qualitative,
      unit: match[4] ?? "", referenceRange: match[5]?.replace(/\s+/g, " ") ?? "",
      flag: inferFlag(match[6]), review: "needs-review", sourceLine: line,
    });
  }
  const date = rawText.match(/(?:collected|collection date|date collected)\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i)?.[1] ?? current.collectedDate;
  const specimen = rawText.match(/specimen\s*[:\-]?\s*([^\n]+)/i)?.[1]?.trim() ?? current.specimen;
  const laboratory = rawText.match(/(?:laboratory|lab)\s*[:\-]?\s*([^\n]+)/i)?.[1]?.trim() ?? current.laboratory;
  return { ...current, rawText, results: results.length ? results : current.results, collectedDate: date, specimen, laboratory };
}

export const sampleDraft: Partial<HealthDraft> = {
  sourceName: "sample-comprehensive-metabolic-panel.pdf", sourceType: "sample", pageCount: 2,
  reportType: "blood", laboratory: "Northstar Community Lab", collectedDate: "11/04/2026",
  reportedDate: "11/05/2026", specimen: "Blood / serum", orderingProvider: "Dr. Rivera",
  rawText: "Synthetic demonstration report. No real patient data.",
  results: [
    ["Glucose", "112", "mg/dL", "70-99", "high"], ["Creatinine", "0.92", "mg/dL", "0.60-1.20", "in-range"],
    ["Sodium", "139", "mmol/L", "135-145", "in-range"], ["Potassium", "4.2", "mmol/L", "3.5-5.1", "in-range"],
    ["ALT", "46", "U/L", "7-40", "high"], ["Albumin", "4.3", "g/dL", "3.5-5.0", "in-range"],
  ].map(([testName, numericValue, unit, referenceRange, flag]) => ({ id: crypto.randomUUID(), testName, rawValue: numericValue, numericValue, comparator: "", qualitativeValue: "", unit, referenceRange, flag: flag as ResultFlag, review: "needs-review" as const, sourceLine: `${testName} ${numericValue} ${unit} (${referenceRange})` })),
};

export function suggestedQuestions(results: LabResult[]) {
  return results.filter((result) => result.flag === "high" || result.flag === "low" || result.flag === "abnormal").map((result) =>
    `What does the ${result.testName} result of ${result.rawValue}${result.unit ? ` ${result.unit}` : ""} mean in the context of the rest of this report?`
  );
}
