# Judge-demo production

The reproducible capture and render scripts for the 30-second HandsIn judge video live in `scripts/judge-demo`.

```bash
npm install --no-save playwright
npx playwright install chromium
node scripts/judge-demo/capture.mjs work/judge-demo/frames
node scripts/judge-demo/render.mjs work/judge-demo/frames ../outputs/handsin-judge-demo
```

The capture script exercises the deployed fictional demo at `https://handsin-six.vercel.app`. Override it with `HANDSIN_DEMO_URL`. `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_CHROMIUM` can point at an isolated Playwright install. The renderer expects `FFMPEG` to point to an H.264-capable FFmpeg binary. Large generated videos are kept outside Git; only the reproducible scripts and editorial documentation are committed.
