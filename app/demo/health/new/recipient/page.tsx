"use client";

import { useRouter } from "next/navigation";
import { useHealthFlow } from "@/components/health/HealthFlowProvider";

export default function HealthRecipientPage() {
  const router = useRouter(); const { draft, updateDraft, recipients, isDemoMode } = useHealthFlow();
  return <section className="health-page"><div className="health-title"><p>Add a health record</p><h1>Whose report is this?</h1><span>Select the person before uploading any health information.</span></div><div className="health-recipient-list">{recipients.map((recipient) => <button key={recipient.id} className={draft.recipientId === recipient.id ? "selected" : ""} onClick={() => updateDraft({ recipientId: recipient.id })}><i>{recipient.initials}</i><span><strong>{recipient.name}</strong><small>{recipient.relationship}</small></span><b>{draft.recipientId === recipient.id ? "✓" : "›"}</b></button>)}</div>{isDemoMode && <p className="health-safety"><strong>Sample recipients</strong><br />Alex and June are shared across this preview. Use sample information only.</p>}<div className="health-actions"><button className="health-primary" disabled={!draft.recipientId} onClick={() => router.push("/demo/health/new/upload")}>Continue</button></div></section>;
}



