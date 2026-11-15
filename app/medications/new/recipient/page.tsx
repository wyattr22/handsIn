"use client";

import { useRouter } from "next/navigation";
import { useMedicationFlow } from "@/components/medication-scanner/MedicationFlowProvider";

export default function RecipientPage() {
  const router = useRouter();
  const { draft, updateDraft, recipients, isDemoMode } = useMedicationFlow();
  return <section className="flow-page">
    <div className="flow-title"><p>New medication</p><h1>Who is this for?</h1><span>Choose the person before you photograph the bottle.</span></div>
    <div className="recipient-list">
      {recipients.map((recipient) => <button type="button" key={recipient.id} className={`recipient-row ${draft.recipientId === recipient.id ? "selected" : ""}`} onClick={() => updateDraft({ recipientId: recipient.id })}>
        <span className="avatar">{recipient.initials}</span><span><strong>{recipient.name}</strong><small>{recipient.relationship}</small></span><i aria-hidden="true">{draft.recipientId === recipient.id ? "✓" : "›"}</i>
      </button>)}
    </div>
    {isDemoMode && <p className="safety-callout">Dad and Mom are sample recipients. <a href="/login">Sign in</a> and create a care circle to use real people.</p>}
    <div className="flow-actions"><button className="primary-action" disabled={!draft.recipientId} onClick={() => router.push("/medications/new/capture")}>Continue</button></div>
  </section>;
}
