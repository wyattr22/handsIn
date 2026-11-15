"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMedicationFlow } from "@/components/medication-scanner/MedicationFlowProvider";
import { applyScheduleSuggestion } from "@/lib/medications/schedule";
import { demoRecipients } from "@/lib/medications/types";

export default function SchedulePage() {
  const router = useRouter();
  const { draft, updateDraft, hydrated } = useMedicationFlow();
  const recipient = demoRecipients.find((item) => item.id === draft.recipientId) ?? demoRecipients[0];
  useEffect(() => {
    if (hydrated && !draft.scheduleReason) updateDraft(applyScheduleSuggestion(draft, recipient));
  }, [hydrated, draft, recipient, updateDraft]);
  function setTime(index: number, value: string) {
    const next = [...draft.scheduleTimes]; next[index] = value; updateDraft({ scheduleTimes: next });
  }
  return <section className="flow-page schedule-page">
    <div className="flow-title"><p>Reminder plan</p><h1>When should {recipient.name} take it?</h1><span>These are suggestions from the confirmed directions—not medical advice.</span></div>
    <div className="label-quote"><span>Confirmed directions</span><blockquote>{draft.directions || "No directions were entered."}</blockquote></div>
    <div className="schedule-card">
      <div><strong>{draft.asNeeded ? "No fixed reminder" : draft.scheduleTimes.length ? "Suggested reminders" : "Manual schedule needed"}</strong><p>{draft.scheduleReason}</p></div>
      {!draft.asNeeded && draft.scheduleTimes.map((time, index) => <label className="time-row" key={`${index}-${time}`}><span>Dose {index + 1}</span><input aria-label={`Dose ${index + 1} time`} value={time} onChange={(event) => setTime(index, event.target.value)} /></label>)}
      {!draft.asNeeded && <button className="text-action" type="button" onClick={() => updateDraft({ scheduleTimes: [...draft.scheduleTimes, ""] })}>+ Add a time</button>}
    </div>
    <label className="confirmation-check"><input type="checkbox" checked={draft.acknowledged} onChange={(event) => updateDraft({ acknowledged: event.target.checked })} /><span><strong>I checked these times against the bottle.</strong><small>HandsIn will never change them automatically.</small></span></label>
    <div className="flow-actions"><button className="primary-action" disabled={!draft.acknowledged || (!draft.asNeeded && draft.directions !== "" && draft.scheduleTimes.some((time) => !time.trim()))} onClick={() => router.push("/medications/new/interactions")}>Check medication list</button></div>
  </section>;
}
