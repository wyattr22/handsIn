import type { MedicationDraft } from "./types";

const strengthPattern = /\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|%|units?)\b/i;
const directionsPattern = /(?:sig|directions?)\s*[:\-]?\s*([^\n]+)/i;
const rxPattern = /(?:rx|rx#|prescription)\s*[:#]?\s*([a-z0-9-]+)/i;
const refillPattern = /refills?\s*[:\-]?\s*(\d+)/i;

export function parseMedicationLabel(rawText: string, current: MedicationDraft): MedicationDraft {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const strength = rawText.match(strengthPattern)?.[0] ?? current.strength;
  const directions = rawText.match(directionsPattern)?.[1]?.trim() ?? current.directions;
  const prescriptionNumber = rawText.match(rxPattern)?.[1] ?? current.prescriptionNumber;
  const refillsRemaining = rawText.match(refillPattern)?.[1] ?? current.refillsRemaining;
  const nameCandidate = lines.find((line) =>
    /[a-z]/i.test(line) &&
    !/pharmacy|directions?|take|tablet|capsule|refill|prescription|rx\b/i.test(line) &&
    line.length < 48
  );

  const medicationName = current.medicationName || nameCandidate || "";
  const status = (value: string) => value ? "needs-review" as const : "missing" as const;

  return {
    ...current,
    rawText,
    medicationName,
    activeIngredient: current.activeIngredient || medicationName,
    strength,
    directions,
    prescriptionNumber,
    refillsRemaining,
    fieldStatus: {
      ...current.fieldStatus,
      medicationName: status(medicationName),
      activeIngredient: status(current.activeIngredient || medicationName),
      strength: status(strength),
      directions: status(directions),
    },
  };
}
