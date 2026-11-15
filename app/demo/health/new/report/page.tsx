"use client";

import Link from "next/link";
import { useHealthFlow } from "@/components/health/HealthFlowProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCoverageWorkspace } from "@/src/features/coverage/DemoWorkspace";
import { authorize } from "@/src/server/domain/coordination/service";

export default function ComprehensiveReportPage() {
  const { draft, updateDraft, resetDraft, recipients } = useHealthFlow();
  const w=useCoverageWorkspace(),router=useRouter(),[error,setError]=useState("");
  function save(){try{authorize(w.calendar,w.actor,draft.recipientId,"manage",w.now,undefined,"health");if(!draft.results.length||draft.results.some(r=>!["confirmed","corrected"].includes(r.review)))throw new Error("Review every result before saving.");w.setReports(old=>[...old,{id:crypto.randomUUID(),draft:structuredClone(draft),savedAt:w.now}]);resetDraft();router.push("/health/demo");}catch(e){setError(e instanceof Error?e.message:"Could not save.");}}
  const recipient = recipients.find((item) => item.id === draft.recipientId)!;
  const flagged = draft.results.filter((result) => ["high", "low", "abnormal"].includes(result.flag));
  const missingContext = draft.results.filter((result) => !result.unit || !result.referenceRange || result.review === "missing-context");
  function updateQuestion(index: number, value: string) { const questions = [...draft.questions]; questions[index] = value; updateDraft({ questions }); }
  function addQuestion() { updateDraft({ questions: [...draft.questions, ""] }); }
  return <section className="health-page report-page"><div className="report-status"><span>✓</span><div><strong>Reviewed report</strong><small>Built from {draft.sourceName || "the attached source"}</small></div></div><div className="health-title"><p>Comprehensive health report</p><h1>{recipient.name}’s results, organized for the next conversation.</h1><span>This summary describes the uploaded report. It does not diagnose a condition or recommend treatment.</span></div><article className="report-sheet"><header><div><span>{draft.reportType} report</span><h2>{draft.laboratory || "Laboratory not entered"}</h2></div><strong>{draft.collectedDate || "Date not entered"}</strong></header><dl className="report-meta"><div><dt>Recipient</dt><dd>{recipient.name}</dd></div><div><dt>Specimen</dt><dd>{draft.specimen || "Not provided"}</dd></div><div><dt>Ordering provider</dt><dd>{draft.orderingProvider || "Not provided"}</dd></div><div><dt>Source</dt><dd>{draft.sourceName || "Not attached"}</dd></div></dl><section><h3>At a glance</h3><div className="report-numbers"><div><strong>{draft.results.length}</strong><span>confirmed results</span></div><div><strong>{flagged.length}</strong><span>flagged by report</span></div><div><strong>{missingContext.length}</strong><span>missing context</span></div></div></section><section><h3>Reviewed results</h3><div className="final-results">{draft.results.map((result) => <div key={result.id} className={`final-result ${result.flag}`}><div><strong>{result.testName || "Unnamed test"}</strong><span>{result.referenceRange ? `Report range: ${result.referenceRange}` : "No reference range shown"}</span></div><p>{result.rawValue || "—"} <small>{result.unit}</small></p><b>{result.flag === "not-provided" ? "No flag" : result.flag.replace("-", " ")}</b></div>)}</div></section><section><h3>Trend readiness</h3><p className="report-copy">No trend is shown yet. HandsIn will compare future results only when the test identity, units, specimen context, and method are compatible. Different units or methods will remain separate.</p></section><section><h3>Questions for the visit</h3><div className="question-list">{draft.questions.map((question, index) => <label key={index}><span>{index + 1}</span><textarea value={question} onChange={(event) => updateQuestion(index, event.target.value)} /></label>)}<button onClick={addQuestion}>+ Add a question</button></div></section><footer><strong>Source and limitations</strong><p>Values, flags, and ranges should match the original report. Results inside a reference range do not prove health, and results outside one do not by themselves establish illness. Review this report with a qualified clinician.</p></footer></article><div className="report-controls"><button onClick={() => window.print()}>Print or save as PDF</button><Link href="/demo/health/new/review">Edit reviewed data</Link></div><div className="health-actions">{error && <p role="alert">{error}</p>}<button className="health-primary" onClick={save}>Save reviewed report</button></div></section>;
}




