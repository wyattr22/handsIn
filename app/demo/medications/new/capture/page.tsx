"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMedicationFlow } from "@/components/medication-scanner/MedicationFlowProvider";
import { parseMedicationLabel } from "@/lib/medications/parse-label";

export default function CapturePage() {
  const router = useRouter();
  const { draft, updateDraft } = useMedicationFlow();
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function addPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image from the camera or photo library."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("That image is over 10 MB. Choose a smaller photo."); return; }
    setError(""); setScanning(true); setProgress(0);
    const preview = URL.createObjectURL(file);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, { logger: (message) => {
        if (message.status === "recognizing text") setProgress(Math.round((message.progress ?? 0) * 100));
      }});
      const result = await worker.recognize(file);
      await worker.terminate();
      const parsed = parseMedicationLabel(`${draft.rawText}\n${result.data.text}`.trim(), draft);
      updateDraft({ ...parsed, photos: [...draft.photos, preview].slice(0, 3) });
    } catch {
      updateDraft({ photos: [...draft.photos, preview].slice(0, 3) });
      setError("Text could not be read. Keep the photo and enter the label details on the next screen.");
    } finally { setScanning(false); }
  }

  return <section className="flow-page capture-page">
    <div className="flow-title"><p>Photograph the label</p><h1>Start with the clearest side.</h1><span>Add the pharmacy label, directions, and Drug or Supplement Facts when available.</span></div>
    <div className="photo-grid">
      {draft.photos.map((photo, index) => <div className="photo-preview" key={photo}><img src={photo} alt={`Medication label ${index + 1}`} /><span>{index + 1}</span></div>)}
      {draft.photos.length < 3 && <label className="camera-tile"><input type="file" accept="image/*" capture="environment" onChange={addPhoto} disabled={scanning} /><span className="camera-mark">⌑</span><strong>{draft.photos.length ? "Add another side" : "Take label photo"}</strong><small>Good light · fill the frame</small></label>}
    </div>
    {scanning && <div className="scan-status" role="status"><span><i style={{ width: `${Math.max(5, progress)}%` }} /></span><p>Reading the label on this device… {progress}%</p></div>}
    {error && <p className="inline-error">{error}</p>}
    <div className="privacy-note"><strong>Private by design</strong><span>The prototype reads text in your browser. It does not send the image to an AI service.</span></div>
    <div className="flow-actions"><button className="primary-action" disabled={!draft.photos.length || scanning} onClick={() => router.push("/demo/medications/new/review")}>Review label</button><button className="secondary-action" disabled={scanning} onClick={() => router.push("/demo/medications/new/review")}>Enter label details manually</button></div>
  </section>;
}



