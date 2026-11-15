"use client";

import Link from "next/link";
import { useMedicationFlow } from "@/components/medication-scanner/MedicationFlowProvider";
import { demoRecipients } from "@/lib/medications/types";

export default function ConfirmPage() {
  const { draft, resetDraft } = useMedicationFlow();
  const recipient = demoRecipients.find((item) => item.id === draft.recipientId) ?? demoRecipients[0];
  return <section className="flow-page confirmation-page">
    <div className="success-mark">✓</div>
    <div className="flow-title"><p>Ready for review</p><h1>{draft.medicationName || "Medication"} is staged.</h1><span>This prototype keeps the draft on your device. Database saving will turn on after team authentication is connected.</span></div>
    <article className="medication-ticket"><header><span>{draft.productType}</span><strong>{recipient.name}</strong></header><div><h2>{draft.medicationName || "Unnamed medication"}</h2><p>{[draft.strength, draft.dosageForm].filter(Boolean).join(" · ") || "Strength and form not entered"}</p></div><dl><div><dt>Directions</dt><dd>{draft.directions || "Not entered—reminders disabled"}</dd></div><div><dt>Reminders</dt><dd>{draft.asNeeded ? "As needed" : draft.scheduleTimes.filter(Boolean).join(", ") || "None"}</dd></div><div><dt>Screening</dt><dd>Incomplete—professional review advised</dd></div></dl></article>
    <div className="next-step-note"><strong>Next build step</strong><p>Connect sign-in and write this confirmed version, its photos, schedule, and audit event to Supabase.</p></div>
    <div className="flow-actions stacked"><Link className="primary-action" href="/medications" onClick={resetDraft}>Finish</Link><Link className="secondary-action" href="/medications/new/review">Edit details</Link></div>
  </section>;
}
