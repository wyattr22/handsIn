# HandsIn approved logo

The team selected concept **1A, Everyone together**, on November 15, 2026: three teal, terracotta and plum people embracing a heart.

- `public/brand/handsin-mark-source.png`: full-resolution transparent master.
- `public/brand/handsin-mark.png`: 512px web asset.
- `components/brand/BrandLogo.tsx`: shared mark and accessible text wordmark; the surrounding link controls navigation. The text uses the existing DM Sans family rather than image-generated lettering.
- `app/icon.png` and `app/apple-icon.png`: browser and home-screen icons.

Use the same brand across recipients; patient-specific colors still belong to their profiles and care controls. Keep the heart negative space clear and preserve the mark's aspect ratio. These assets are raster PNGs, not vector artwork. No trademark clearance is implied.

The source was produced using the built-in image-generation tool from the team's selected exploration board. Generation brief: extract only the top-left 1A symbol, preserve the three people and intertwined embrace around the heart; teal `#2f766d`, plum `#8a5d78`, terracotta `#c96137`; transparent background and gaps; no words, labels or board; square composition with clear margins. Smaller assets are resized from that master.

Validation: TypeScript and production build passed. Browser review checked the shared home header at desktop size, and the health capture header and authentication branding at 390px width. Authentication and patient-data behavior were not changed or revalidated by this visual update.
