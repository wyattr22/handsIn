import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ffmpeg = process.env.FFMPEG || "ffmpeg";
const frames = path.resolve(process.argv[2] || "work/judge-demo/frames");
const out = path.resolve(process.argv[3] || "../outputs/handsin-judge-demo");
const temp = path.join(out, ".segments");
await mkdir(temp, { recursive: true });

const scenes = [
  ["01-home.png", "01-home.png", 3, "One place for the whole family's care."],
  ["01-home.png", "02-profiles-june.png", 4, "Switch profiles. The page changes with the person."],
  ["03-care-alex.png", "03-care-june.png", 5, "Choose June. Her meals, times, and theme appear."],
  ["04-medication-capture.png", "05-medication-review.png", 5, "Open medication review. Every field stays editable."],
  ["06-health-upload.png", "07-health-review.png", 4, "Load a synthetic report, then verify every result."],
  ["08-calendar-everyone.png", "09-calendar-june.png", 5, "Filter the family calendar from everyone to June."],
  ["10-closing.png", "10-closing.png", 4, "HandsIn: care is a team effort."],
];

function run(args) {
  const result = spawnSync(ffmpeg, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`ffmpeg failed with status ${result.status}`);
}

for (let index = 0; index < scenes.length; index += 1) {
  const [fromFile, toFile, duration, caption] = scenes[index];
  const segment = path.join(temp, `${String(index + 1).padStart(2, "0")}.mp4`);
  const safeCaption = caption.replaceAll("'", "’").replaceAll(":", "\\:");
  const fadeOut = Math.max(0, duration - 0.28).toFixed(2);
  const shared = "scale=1720:968:force_original_aspect_ratio=decrease,pad=1920:968:(ow-iw)/2:(oh-ih)/2:color=0xf4f1ed";
  const finish = [
    "pad=1920:1080:0:0:color=0x102e2a",
    "drawbox=x=0:y=968:w=1920:h=112:color=0x102e2a:t=fill",
    `drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${safeCaption}':fontcolor=white:fontsize=34:x=(w-text_w)/2:y=1003`,
    "fade=t=in:st=0:d=0.18",
    `fade=t=out:st=${fadeOut}:d=0.28`,
  ].join(",");
  if (fromFile === toFile) {
    run(["-y", "-loop", "1", "-i", path.join(frames, fromFile), "-t", String(duration), "-vf", `${shared},${finish}`, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "30", segment]);
  } else {
    const transitionDuration = 0.35;
    const transitionAt = (duration / 2 - transitionDuration / 2).toFixed(2);
    run([
      "-y", "-loop", "1", "-t", String(duration), "-i", path.join(frames, fromFile),
      "-loop", "1", "-t", String(duration), "-i", path.join(frames, toFile),
      "-filter_complex", `[0:v]${shared}[a];[1:v]${shared}[b];[a][b]xfade=transition=fade:duration=${transitionDuration}:offset=${transitionAt},${finish}[out]`,
      "-map", "[out]", "-t", String(duration), "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "30", segment,
    ]);
  }
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
