"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useHealthFlow } from "@/components/health/HealthFlowProvider";
import { parseReportText, sampleDraft } from "@/lib/health/parse-report";

async function extractImage(file: Blob | HTMLCanvasElement, onProgress: (value: number) => void) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, { logger: (message) => { if (message.status === "recognizing text") onProgress(Math.round((message.progress ?? 0) * 100)); } });
  const { data } = await worker.recognize(file); await worker.terminate(); return data.text;
}

async function extractPdf(file: File, onProgress: (value: number) => void) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let index = 1; index <= Math.min(pdf.numPages, 6); index++) {
    const page = await pdf.getPage(index); const content = await page.getTextContent();
    let text = content.items.map((item) => "str" in item ? item.str : "").join(" ");
    if (text.trim().length < 40) {
      const viewport = page.getViewport({ scale: 1.8 }); const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
      text = await extractImage(canvas, (value) => onProgress(Math.round(((index - 1 + value / 100) / Math.min(pdf.numPages, 6)) * 100)));
    }
    pages.push(`Page ${index}\n${text}`); onProgress(Math.round((index / Math.min(pdf.numPages, 6)) * 100));
  }
  return { text: pages.join("\n\n"), pageCount: pdf.numPages };
}

export default function UploadPage() {
  const router = useRouter(); const { draft, updateDraft } = useHealthFlow(); const [working, setWorking] = useState(false); const [progress, setProgress] = useState(0); const [error, setError] = useState("");
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 15 * 1024 * 1024) { setError("Choose a file smaller than 15 MB."); return; }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") { setError("Choose a PDF, JPG, PNG, or WebP report."); return; }
    setWorking(true); setProgress(1); setError("");
    try {
      const isPdf = file.type === "application/pdf";
      const extracted = isPdf ? await extractPdf(file, setProgress) : { text: await extractImage(file, setProgress), pageCount: 1 };
      const parsed = parseReportText(extracted.text, { ...draft, sourceName: file.name, sourceType: isPdf ? "pdf" : "image", sourceUrl: URL.createObjectURL(file), pageCount: extracted.pageCount });
      updateDraft(parsed);
    } catch { setError("The report could not be read automatically. You can try a clearer file or use the sample report to explore the review flow."); }
    finally { setWorking(false); }
  }
  function loadSample() { updateDraft({ ...sampleDraft }); router.push("/health/new/review"); }
  return <section className="health-page"><div className="health-title"><p>Upload the report</p><h1>Keep every result tied to its source.</h1><span>Use a clear photo or the original PDF. Password-protected files must be unlocked first.</span></div><label className="health-upload"><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={handleFile} disabled={working} /><span>▤</span><strong>{draft.sourceName || "Choose a report"}</strong><small>PDF, JPG, PNG or WebP · up to 15 MB</small></label>{working && <div className="health-reading"><span><i style={{ width: `${progress}%` }} /></span><p>Reading this report locally… {progress}%</p></div>}{error && <p className="health-error">{error}</p>}{draft.sourceName && <div className="source-ready"><strong>{draft.results.length} possible results found</strong><span>{draft.pageCount} page{draft.pageCount === 1 ? "" : "s"} · every field still needs review</span></div>}<button className="sample-link" onClick={loadSample}>Explore with a synthetic sample report</button><div className="health-safety"><strong>What happens next</strong><p>HandsIn shows a draft beside the source. It does not diagnose, change medications, or replace the laboratory or clinician.</p></div><div className="health-actions"><button className="health-primary" disabled={!draft.sourceName || working} onClick={() => router.push("/health/new/review")}>Review extracted results</button></div></section>;
}
