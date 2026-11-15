import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ffmpeg = process.env.FFMPEG || "ffmpeg";
const frames = path.resolve(process.argv[2] || "work/judge-demo/frames");
const out = path.resolve(process.argv[3] || "../outputs/handsin-judge-demo");
const temp = path.join(out, ".segments");
await mkdir(temp, { recursive: true });

const scenes = [
  ["01-home.png", 3, "One place for the whole family's care."],
  ["02-profiles-june.png", 4, "Personalized profiles make every care plan unmistakable."],
  ["03-june-care.png", 5, "Meals, routines, and reminders adapt to each person."],
  ["05-medication-review.png", 5, "Review medication labels and schedules before saving."],
  ["07-health-review.png", 4, "Verify every extracted health result against its source."],
  ["09-calendar-june.png", 5, "See one person or the whole family in a shared calendar."],
  ["10-closing.png", 4, "HandsIn — care is a team effort."],
];

function run(args) {
  const result = spawnSync(ffmpeg, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`ffmpeg failed with status ${result.status}`);
}

for (let index = 0; index < scenes.length; index += 1) {
  const [file, duration, caption] = scenes[index];
  const segment = path.join(temp, `${String(index + 1).padStart(2, "0")}.mp4`);
  const safeCaption = caption.replaceAll("'", "’").replaceAll(":", "\\:");
  const fadeOut = Math.max(0, duration - 0.28).toFixed(2);
  run([
    "-y", "-loop", "1", "-i", path.join(frames, file), "-t", String(duration),
    "-vf", [
      "scale=1920:1080:force_original_aspect_ratio=decrease",
      "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white",
      "zoompan=z='min(zoom+0.00025,1.018)':d=1:s=1920x1080:fps=30",
      "drawbox=x=70:y=890:w=1780:h=120:color=0x102e2a@0.90:t=fill",
      `drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${safeCaption}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=930`,
      "fade=t=in:st=0:d=0.22",
      `fade=t=out:st=${fadeOut}:d=0.28`,
    ].join(","),
    "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "30", segment,
  ]);
}

const concatFile = path.join(temp, "concat.txt");
await writeFile(concatFile, scenes.map((_, index) => `file '${path.join(temp, `${String(index + 1).padStart(2, "0")}.mp4`).replaceAll("'", "'\\''")}'`).join("\n"));

const master = path.join(out, "handsin-judge-demo-1080p.mp4");
run(["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", "-movflags", "+faststart", master]);

const compressed = path.join(out, "handsin-judge-demo-compressed.mp4");
run(["-y", "-i", master, "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", compressed]);

const silent = path.join(out, "handsin-judge-demo-silent-captioned.mp4");
await copyFile(master, silent);

run(["-y", "-ss", "00:00:01.5", "-i", master, "-frames:v", "1", path.join(out, "handsin-judge-demo-thumbnail.png")]);
console.log(`Rendered HandsIn judge-demo deliverables to ${out}`);
