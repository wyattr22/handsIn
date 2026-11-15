import { mkdir, copyFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ffmpeg = process.env.FFMPEG || "ffmpeg";
const framesDir = path.resolve(process.argv[2]);
const outputDir = path.resolve(process.argv[3] || "../outputs/handsin-active-demo");
const sourceDuration = Number(process.env.SOURCE_DURATION);
if (!sourceDuration || sourceDuration <= 0) throw new Error("Set SOURCE_DURATION to the recorded WebM duration.");
const slowStart = Number(process.env.SLOW_START || 20);
const firstFactor = Number(process.env.FIRST_FACTOR || 1);
const slowFactor = Number(process.env.SLOW_FACTOR || 1.75);
if (slowStart <= 0 || slowStart >= sourceDuration || firstFactor <= 0 || slowFactor <= 0) throw new Error("Invalid section-speed settings.");
await mkdir(outputDir, { recursive: true });

function run(args) {
  const result = spawnSync(ffmpeg, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`ffmpeg failed with status ${result.status}`);
}

const master = path.join(outputDir, "handsin-active-user-demo-1080p.mp4");
const expectedDuration = slowStart * firstFactor + (sourceDuration - slowStart) * slowFactor;
const finish = [
  "scale=1920:968:force_original_aspect_ratio=decrease",
  "pad=1920:1080:0:0:color=0x102e2a",
  "drawbox=x=0:y=968:w=1920:h=112:color=0x102e2a:t=fill",
  "drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='Live demo. Clicking, typing, scrolling, and filtering fictional data.':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=1004",
].join(",");
run([
  "-y", "-framerate", "10", "-i", path.join(framesDir, "%06d.jpg"),
  "-filter_complex", `[0:v]split=2[first][second];[first]trim=start=0:end=${slowStart},setpts=${firstFactor}*(PTS-STARTPTS)[firstOut];[second]trim=start=${slowStart}:end=${sourceDuration},setpts=${slowFactor}*(PTS-STARTPTS)[secondOut];[firstOut][secondOut]concat=n=2:v=1:a=0,${finish}[out]`,
  "-map", "[out]", "-t", expectedDuration.toFixed(3), "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", master,
]);
run(["-y", "-i", master, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(outputDir, "handsin-active-user-demo-compressed.mp4")]);
await copyFile(master, path.join(outputDir, "handsin-active-user-demo-silent-captioned.mp4"));
run(["-y", "-ss", "00:00:04", "-i", master, "-frames:v", "1", "-update", "1", path.join(outputDir, "handsin-active-user-demo-thumbnail.png")]);
console.log(`Rendered ${expectedDuration.toFixed(3)} seconds. First factor ${firstFactor}; section after ${slowStart}s factor ${slowFactor}.`);
