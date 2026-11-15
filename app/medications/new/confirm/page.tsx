"use client";

import Link from "next/link";
import { useMedicationFlow } from "@/components/medication-scanner/MedicationFlowProvider";

export default function ConfirmPage() {
  const { draft, resetDraft, recipients, isDemoMode } = useMedicationFlow();
  const recipient = recipients.find((item) => item.id === draft.recipientId) ?? recipients[0];
  return <section className="flow-page confirmation-page">
    <div className="success-mark">✓</div>
    <div className="flow-title"><p>Ready for review</p><h1>{draft.medicationName || "Medication"} is staged.</h1><span>{isDemoMode ? "This prototype keeps the draft on your device. Sign in to share confirmed medications." : "Your care circle is connected. Medication saving is the next protected operation to enable."}</span></div>
    <article className="medication-ticket"><header><span>{draft.productType}</span><strong>{recipient.name}</strong></header><div><h2>{draft.medicationName || "Unnamed medication"}</h2><p>{[draft.strength, draft.dosageForm].filter(Boolean).join(" · ") || "Strength and form not entered"}</p></div><dl><div><dt>Directions</dt><dd>{draft.directions || "Not entered—reminders disabled"}</dd></div><div><dt>Reminders</dt><dd>{draft.asNeeded ? "As needed" : draft.scheduleTimes.filter(Boolean).join(", ") || "None"}</dd></div><div><dt>Screening</dt><dd>Incomplete—professional review advised</dd></div></dl></article>
    <div className="next-step-note"><strong>Next build step</strong><p>Connect sign-in and write this confirmed version, its photos, schedule, and audit event to Supabase.</p></div>
    <div className="flow-actions stacked"><Link className="primary-action" href="/medications" onClick={resetDraft}>Finish</Link><Link className="secondary-action" href="/medications/new/review">Edit details</Link></div>
  </section>;
}
