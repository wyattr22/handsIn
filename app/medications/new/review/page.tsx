"use client";

import { useRouter } from "next/navigation";
import { useMedicationFlow } from "@/components/medication-scanner/MedicationFlowProvider";
import type { MedicationDraft, ProductType } from "@/lib/medications/types";

const fields: { key: keyof MedicationDraft; label: string; placeholder: string; required?: boolean }[] = [
  { key: "medicationName", label: "Medication name", placeholder: "e.g. Lisinopril", required: true },
  { key: "activeIngredient", label: "Active ingredient", placeholder: "e.g. lisinopril", required: true },
  { key: "strength", label: "Strength", placeholder: "e.g. 10 mg" },
  { key: "dosageForm", label: "Form", placeholder: "e.g. tablet" },
  { key: "directions", label: "Directions exactly as written", placeholder: "e.g. Take 1 tablet by mouth every morning", required: true },
  { key: "prescriber", label: "Prescriber", placeholder: "Optional" },
  { key: "pharmacy", label: "Pharmacy", placeholder: "Optional" },
  { key: "prescriptionNumber", label: "Prescription number", placeholder: "Coordinator only" },
  { key: "refillsRemaining", label: "Refills remaining", placeholder: "Optional" },
];

export default function ReviewPage() {
  const router = useRouter();
  const { draft, updateDraft } = useMedicationFlow();
  const canContinue = Boolean(draft.medicationName.trim() && draft.activeIngredient.trim());
  function updateField(key: keyof MedicationDraft, value: string) {
    updateDraft({ [key]: value, fieldStatus: { ...draft.fieldStatus, [key]: "corrected" } });
  }
  return <section className="flow-page review-page">
    <div className="flow-title"><p>Check every detail</p><h1>Does this match the bottle?</h1><span>OCR can misread names, strengths, and numbers. Correct anything that looks wrong.</span></div>
    <fieldset className="type-selector"><legend>Product type</legend>{(["prescription", "otc", "supplement"] as ProductType[]).map((type) => <button key={type} type="button" className={draft.productType === type ? "selected" : ""} onClick={() => updateDraft({ productType: type })}>{type === "otc" ? "OTC" : type[0].toUpperCase() + type.slice(1)}</button>)}</fieldset>
    <div className="review-form">{fields.map((field) => <label key={String(field.key)}><span>{field.label}{field.required && <i>Required</i>}</span>{field.key === "directions" ? <textarea value={String(draft[field.key])} placeholder={field.placeholder} onChange={(event) => updateField(field.key, event.target.value)} /> : <input value={String(draft[field.key])} placeholder={field.placeholder} onChange={(event) => updateField(field.key, event.target.value)} />}<small className={`field-state ${draft.fieldStatus[String(field.key)] ?? "missing"}`}>{draft.fieldStatus[String(field.key)] === "needs-review" ? "Read from photo · check it" : draft[field.key] ? "Entered or corrected" : "Not found"}</small></label>)}</div>
    {!draft.directions && <p className="safety-callout">You can save this medication without directions, but HandsIn will not create reminders for it.</p>}
    <div className="flow-actions"><button className="primary-action" disabled={!canContinue} onClick={() => router.push("/medications/new/schedule")}>Confirm details</button></div>
  </section>;
}
