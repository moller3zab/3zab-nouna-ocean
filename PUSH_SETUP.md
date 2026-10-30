# Ocean Web Push — release and acceptance guide

Site: https://ahmedwanfal.web.app
Backend: https://ocean-free-push.mollerahmed5.workers.dev
Repository: https://github.com/moller3zab/3zab-nouna-ocean

## Released architecture

Standard Web Push and VAPID replace OneSignal completely. Firebase Authentication and the existing default Firestore database remain. The separate Cloudflare Worker and D1 database hold device registrations, preferences, proof hashes, event identifiers and delivery status; message/media content is not copied into D1. The root Workbox offline service worker remains separate from `/push/webpush/worker.js`.

Firebase billing was checked as disabled. The account owner confirmed Workers Free with no paid Workers subscription. No paid service, payment method, Blaze, Cloud Functions, Cloud Run or OneSignal plan was enabled. Hosting and the final Firestore metadata validation rules were deployed under the release authorization. Application records were not seeded, migrated or changed by deployment tools.

## Identity and private delivery

The Worker validates Firebase RS256 signature, Google JWKS, issuer, audience, expiry and the two existing allowed UIDs. Client External IDs and recipient claims are never trusted. A subscription must receive a server-generated 256-bit challenge through encrypted Web Push and confirm it while signed into its Firebase account. Only its hash is stored server-side. Challenges expire after five minutes, cannot be replayed or transferred across accounts, and successful device verification expires after 30 days. Up to six devices per account are supported.

Logout first pauses local private display, closes visible notifications, revokes the server registration, then unsubscribes. Offline failures remain paused and retryable. Account switching rejects old bindings. Already displayed OS notification history cannot be recalled; enable previews only on devices you trust. Firebase ID tokens can remain valid until expiry after administrative revocation; disable a compromised device immediately and rotate credentials as appropriate.

Private previews default OFF per device. Server capability gates are enabled after the ownership tests passed, but unverified subscriptions receive no private activity. Explicit preview consent is required. Category choices independently control chat, photos, memories, letters, songs and other activity. Chat photos require the relevant chat/photo choices. Sender names fall back to the actual verified account mapping Nouna/3zab, not client persona selection.

## Saved events and database compatibility

The client sends only collection and saved document ID. The backend reads the actual record and validates its writer metadata before composing English activity descriptions and short sanitized actual previews. Original user text retains its language. Private media URLs are never included. Notification clicks open the actual chat, gallery, wall, letter, playlist or relevant section.

Supported: messages, memories, polaroids, letters, songs, milestones, loveReasons, openWhen, things21, favorites, futureDreams and countdowns. Notification mirror records, settings, moods and peace-room state do not generate misleading activity. Creates generate matching activity; song metadata edits describe an update, not a new song. Hidden songs and unrelated edits do not generate fake new activities. Open When secret note text stays hidden.

New supported writes add `pushMeta` containing authenticated writer UID, random event ID, server timestamp and validated media classification. Existing content fields and legacy documents are preserved. Rules require EVERY subsequent edit of a protected document to freshly attest its writer and media, preventing an earlier valid stamp from authenticating another user's changes. Older clients may need an update before editing these protected records. Legacy records without metadata retain prior member access. Server timestamps and commit timestamps are deliberately not assumed equal.

Only metadata dated at or after 2026-10-30T10:24:07Z is accepted. This cutoff follows deployment of the final rules and excludes records stamped before that protection existed.

## Free limits and reliability

Workers Free currently permits 100,000 requests/day and 10 ms CPU per invocation, with 50 external subrequests. D1 Free has 5 million row reads/day, 100,000 row writes/day and 5 GB storage. Firebase Spark quotas still apply to the shared project. Free limits stop work rather than justify a paid upgrade; delivery is best effort, not unlimited or guaranteed.

The application additionally limits API requests to 60/minute per UID and 3,000/day globally. Reconciliation budgets 5,000 Firestore reads/day, uses selected metadata only, and scans one collection per minute in a 15-minute cycle. Each scan returns at most three records; one pending device delivery is attempted per minute. Normal client delivery loops over at most six devices with one encryption/send per invocation. Cold reconciliation uses at most four external requests. Lease/retry records and persistent device deduplication protect against duplicate display; expired endpoints are retired. Up to five delivery attempts are made.

The local durable outbox contains IDs only, retries with backoff while signed in, and survives reloads. Cron covers missed client requests. Events older than one hour are intentionally not newly accepted. Outages, high volumes, throttling, browser push-service expiry and operating-system policy can delay or lose notifications. This is not a Firestore Cloud Function trigger and cannot promise immediate delivery when the writer closes before notifying the backend.

## Provisioned configuration and secrets

Cloudflare account: 603e47c2aa30fbfad821cd870f50ea21.
Worker/D1 name: ocean-free-push. D1 ID: dcb637a3-a840-43ff-9ee3-ee7e3885e311.
Cron: every minute. Cloudflare scheduling changes can take up to 15 minutes to propagate.
Encrypted Worker secrets: VAPID_JSON, FIREBASE_READER_JSON, BENCHMARK_TOKEN. None belongs in VITE variables, Git, browser assets or public reports.

The dedicated service account `ocean-push-reader@ahmedwanfal.iam.gserviceaccount.com` has only the custom role `oceanPushReader` with datastore.entities.get/list. It cannot write Firestore. OAuth and the actual metadata query were verified with HTTP 200 without changing documents. Protect and rotate this credential; revoke its IAM key when retiring this backend. Keep the VAPID private key backed up securely: changing it requires device re-enrollment.

Local secret files are ignored under work/. `.env.example` contains only the public Worker URL. The cf configuration intentionally defaults to disabled gates and an empty identity map for safe fresh deployments; preserve reviewed production bindings when redeploying. No Wrangler/Node compatibility runtime is required. The original Functions and OneSignal material under legacy/ is reference only and must not be deployed.

## Verification performed

- 23 current frontend/data/service-worker/outbox tests pass.
- 8 bundled Worker tests pass in Miniflare/workerd without nodejs_compat, including independent encrypted payload decryption.
- 5 Firestore rules integration tests pass against isolated demo-ocean-free emulator data.
- 16 archived regression tests previously passed; they are not the current runtime.
- Production TypeScript/Vite build, Worker typecheck/build and diff whitespace checks pass.
- Production Worker dependencies: zero known audit vulnerabilities at verification. Existing frontend/dev dependency advisories and the large Vite chunk warning remain; no broad dependency migration was included.
- Three live synthetic crypto benchmarks (no notification sent) measured Workers CPU P50 4.428 ms and P99 7.961 ms, zero external subrequests/errors. These measurements do not certify complete real-device traffic or all future load.
- Live Hosting HTML matches the production build; push worker matches source, serves JavaScript with no-cache, and is excluded from root offline precaching. Unauthenticated notification endpoints return 401.

Coverage includes impersonation, unauthorized registration, replay/expired challenges, logout/offline logout, account switching, multiple devices, preference changes, duplicate events, invalid JWTs, expired endpoints and metadata spoofing. Physical iPhone/Android delivery has NOT been verified.

Reproduce locally:

    npm ci
    npm test
    npm --prefix worker ci
    npm --prefix worker test
    npm --prefix worker run typecheck
    npm --prefix worker run build
    npm run build

Rules tests require Firebase CLI and Java 21+: `firebase emulators:exec --only firestore --project demo-ocean-free --config firebase.test.json "node --test tests/firestore-rules.integration.cjs"`. Never substitute the live project for this emulator test.

## Device acceptance still required

1. Open the published HTTPS site. iPhone: install to Home Screen and open that installed app on iOS 16.4+. Android: use a supported updated browser/PWA. Notification permission must be requested by the user's button tap.
2. Sign into the correct account, enable notifications, allow permission and complete device verification after the visible verification push. Keep the app open until status confirms verification. No private content should appear before this succeeds.
3. Enable previews explicitly if desired and save category preferences. Repeat independently on each device.
4. From the other real account create a real text, photo, memory, letter and saved song activity with consent. Verify actual sender/preview, category opt-outs, correct deep links and no media URLs. Test hidden previews separately.
5. Close the installed app and repeat. Test both iPhone and Android. OS focus modes, permissions, connectivity and platform restrictions can delay delivery.
6. Test logout, account switch, two recipient devices, duplicate retry and revoked subscriptions. A logged-out device must not display later private events.

No delivery claim should be made until these real-device checks pass. No upgrade is required for this ownership-based standard Web Push design. OneSignal alias routing and paid Identity Verification are not dependencies.

The production cron began executing after propagation; its D1 read-budget counter was observed advancing. No devices were enrolled by deployment tools.
