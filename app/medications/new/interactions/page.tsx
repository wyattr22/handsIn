"use client";

import { useRouter } from "next/navigation";
import { useMedicationFlow } from "@/components/medication-scanner/MedicationFlowProvider";

export default function InteractionsPage() {
  const router = useRouter();
  const { draft } = useMedicationFlow();
  return <section className="flow-page interactions-page">
    <div className="flow-title"><p>Medication list check</p><h1>What we could—and couldn’t—check.</h1><span>The free prototype performs conservative checks only. A pharmacist or clinician remains the source of truth.</span></div>
    <div className="screening-summary incomplete"><span aria-hidden="true">!</span><div><strong>Screening is incomplete</strong><p>We identified {draft.activeIngredient || draft.medicationName || "this product"}, but no confirmed medication list is connected in prototype mode.</p></div></div>
    <div className="check-list"><article><span className="check-icon">✓</span><div><strong>Duplicate within this label</strong><p>No repeated active ingredient was entered on this draft.</p></div></article><article><span className="pending-icon">—</span><div><strong>Medication-to-medication interactions</strong><p>Not checked. This requires a confirmed current medication list and a supported clinical source.</p></div></article><article><span className="pending-icon">—</span><div><strong>Supplement interactions</strong><p>Coverage is limited in free public sources. Ask a pharmacist about supplements and herbal products.</p></div></article></div>
    <div className="source-note"><strong>Language you can trust</strong><p>HandsIn never treats “no finding returned” as proof that products are safe together.</p></div>
    <div className="flow-actions"><button className="primary-action" onClick={() => router.push("/medications/new/confirm")}>Continue with warning</button></div>
  </section>;
}
