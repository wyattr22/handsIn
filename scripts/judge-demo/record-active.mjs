import { mkdir } from "node:fs/promises";
import path from "node:path";

const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = await import(playwrightModule);
const executablePath = process.env.PLAYWRIGHT_CHROMIUM;
const baseUrl = process.env.HANDSIN_DEMO_URL || "https://handsin-six.vercel.app";
const outputDir = path.resolve(process.argv[2] || "work/judge-demo/active");
const framesDir = path.join(outputDir, "frames");
await mkdir(framesDir, { recursive: true });

const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({
  viewport: { width: 1920, height: 968 },
});
await context.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = `#judge-cursor{position:fixed;z-index:2147483647;width:24px;height:24px;border:4px solid #e75543;border-radius:50%;background:#fff8;pointer-events:none;left:0;top:0;transform:translate(-40px,-40px);transition:transform .22s ease,width .12s,height .12s}#judge-cursor.active{width:42px;height:42px;background:#e7554355}`;
    document.head.append(style);
    const cursor = document.createElement("div");
    cursor.id = "judge-cursor";
    document.body.append(cursor);
  });
});
const page = await context.newPage();
let capturing = false;
let frame = 0;
async function captureLoop() {
  while (capturing) {
    frame += 1;
    await page.screenshot({ path: path.join(framesDir, `${String(frame).padStart(6, "0")}.jpg`), type: "jpeg", quality: 78, animations: "allow" });
    await page.waitForTimeout(35);
  }
}

async function open(route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

async function point(locator, click = false) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("Target is not visible");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 12 });
  await page.evaluate(({ x, y }) => {
    const cursor = document.querySelector("#judge-cursor");
    if (cursor) cursor.style.transform = `translate(${x - 12}px,${y - 12}px)`;
  }, { x, y });
  await page.waitForTimeout(220);
  if (click) {
    await page.evaluate(() => document.querySelector("#judge-cursor")?.classList.add("active"));
    await locator.click();
    await page.waitForTimeout(160);
    await page.evaluate(() => document.querySelector("#judge-cursor")?.classList.remove("active"));
  }
}

async function typeInto(placeholder, value) {
  const field = page.getByPlaceholder(placeholder, { exact: true });
  await point(field, true);
  await field.fill("");
  await field.pressSequentially(value, { delay: 35 });
  await page.waitForTimeout(160);
}

// Browse the home dashboard, scroll, and actively switch profiles.
await open("/demo");
capturing = true;
const capture = captureLoop();
await page.mouse.wheel(0, 520);
await page.waitForTimeout(550);
await page.mouse.wheel(0, -520);
await page.waitForTimeout(350);
await point(page.getByRole("button", { name: /June Morgan/ }), true);
await page.waitForTimeout(450);

// Enter a fictional medication label by hand.
await open("/demo/medications/new/recipient");
await point(page.getByRole("button", { name: /June Morgan/ }), true);
await point(page.getByRole("button", { name: "Continue" }), true);
await point(page.getByRole("button", { name: "Enter label details manually" }), true);
await page.waitForURL(/\/review$/);
await typeInto("e.g. Lisinopril", "DemoCare 10 mg tablet");
await typeInto("e.g. lisinopril", "fictional ingredient");
await typeInto("e.g. 10 mg", "10 mg");
await typeInto("e.g. Take 1 tablet by mouth every morning", "Take one tablet each morning");
await page.mouse.wheel(0, 520);
await page.waitForTimeout(500);

// Load and inspect the explicitly synthetic health report.
await open("/demo/health/new/recipient");
await point(page.getByRole("button", { name: /June Morgan/ }), true);
await point(page.getByRole("button", { name: "Continue" }), true);
await point(page.getByRole("button", { name: "Explore with a synthetic sample report" }), true);
await page.waitForURL(/\/review$/);
await page.mouse.wheel(0, 650);
await page.waitForTimeout(650);
await page.mouse.wheel(0, 500);
await page.waitForTimeout(500);

// Filter the shared calendar and scroll through scheduled care.
await open("/calendar/demo");
await point(page.getByRole("button", { name: "June", exact: true }), true);
await page.waitForTimeout(500);
await page.mouse.wheel(0, 540);
await page.waitForTimeout(650);

await open("/demo");
await page.waitForTimeout(1200);
capturing = false;
await capture;
await page.close();
await context.close();
await browser.close();
console.log(JSON.stringify({ framesDir, frameCount: frame, assumedFps: 10, sourceDuration: frame / 10 }));
