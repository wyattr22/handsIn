import { mkdir } from "node:fs/promises";
import path from "node:path";

const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = await import(playwrightModule);

const baseUrl = process.env.HANDSIN_DEMO_URL || "https://handsin-six.vercel.app";
const outputDir = path.resolve(process.argv[2] || "work/judge-demo/frames");
const executablePath = process.env.PLAYWRIGHT_CHROMIUM;

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();

async function open(route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
}

async function shot(name) {
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), animations: "disabled" });
}

async function clickButton(name) {
  await page.getByRole("button", { name }).click();
  await page.waitForTimeout(350);
}

// Home and profile personalization.
await open("/demo");
await shot("01-home");
await clickButton(/June Morgan/);
await shot("02-profiles-june");

// June's deliberately distinct care routine.
await open("/care/demo");
const careRecipient = page.getByLabel("Care for");
if (await careRecipient.count()) {
  await careRecipient.selectOption({ label: "June Morgan" });
  await page.waitForTimeout(350);
}
await shot("03-june-care");

// Medication label flow: recipient -> capture -> review.
await open("/demo/medications/new/recipient");
await clickButton(/June Morgan/);
await clickButton("Continue");
await shot("04-medication-capture");
await clickButton("Enter label details manually");
await page.waitForTimeout(350);
if (!page.url().endsWith("/review")) await open("/demo/medications/new/review");
await shot("05-medication-review");

// Health report flow with the clearly labeled synthetic fixture.
await open("/demo/health/new/recipient");
await clickButton(/June Morgan/);
await clickButton("Continue");
await clickButton("Explore with a synthetic sample report");
await shot("06-health-upload");
if (!page.url().endsWith("/review") && await page.getByRole("button", { name: "Review extracted results" }).count()) {
  await page.getByRole("button", { name: "Review extracted results" }).click();
  await page.waitForTimeout(350);
} else if (!page.url().endsWith("/review")) {
  await open("/demo/health/new/review");
}
await shot("07-health-review");

// Combined and patient-filtered calendar.
await open("/calendar/demo");
await shot("08-calendar-everyone");
await page.getByRole("button", { name: "June", exact: true }).click();
await page.waitForTimeout(350);
await shot("09-calendar-june");

// Close on the branded home experience.
await open("/demo");
await shot("10-closing");

console.log(`Captured 10 verified states from ${baseUrl} into ${outputDir}`);
await browser.close();
