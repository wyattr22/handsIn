# Scanner preview release

The connected capture screen now offers a mobile rear-camera photo input as well as saved image/PDF/text selection. Camera capture depends on browser support; desktop browsers may show a file chooser. Neither input bypasses explicit field review or recipient confirmation. This is photo capture, not continuous video recognition.

`npm run dev` and `npm run build` prepare pinned OCR workers/core and PDF workers/fonts/CMaps/WASM into ignored `public/scanner-assets`. Deploy with the normal npm build command so this preparation runs. Source images and PDFs are processed on the client, not uploaded to the record API. English OCR language data still downloads from the OCR library's versioned default CDN on first use. Saved reviewed text is encrypted by the existing record adapter.

## Deployment prerequisites

- Authorize the Vercel connection for the intended team, then inspect its project/Git link and preview environment before deploying.
- Choose a hosted preview Supabase project. No projects were visible in the connected Vesper account during this check. Obtain the organization's cost quote and user acceptance before creating paid resources.
- Inspect existing schemas before applying the People and workspace migration sets, in that order. Do not apply the incompatible legacy medication migration.
- Configure the preview URL, public Supabase URL/key, `HANDSIN_PEOPLE_FOUNDATION=ready`, and `NEXT_PUBLIC_LOCAL_AUTH=false`. Configure real verification email and allowed Auth URLs. Never deploy local database credentials or a service-role key to the client.
- `.vercelignore` excludes local runtime, test output and environment files. Generated scanner assets are reconstructed in the build.

## Live acceptance checks

1. Open the HTTPS preview on a phone; take a fictional label photo and verify OCR completes, fields remain editable, and save requires review.
2. Repeat with a saved photo, a text PDF and an image-only PDF. Verify PDF worker/font/WASM requests succeed without missing assets.
3. Review the recipient, save a medication with explicit reminder times, reload, and check the calendar under a second authorized account.
4. Review a health report's values, units and ranges; verify a restricted helper cannot retrieve it.
5. Check camera cancellation, unreadable images, unsupported formats, oversized files, PDF page limits, network failure and retrying the same file.
6. Test invitation/email verification, device-key transfer, visit arrival/completion, revocation and persistence on the hosted backend.

Current result: local production build and seven workspace/capture tests passed. Hosted release and real phone/image/PDF end-to-end checks remain pending the account prerequisites. Main is unchanged.
