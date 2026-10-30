# Ocean preview — separate Stitch redesign

This is the independent redesign in `D:\web\anf\new`. The original application remains in the parent folder.

## Run

```sh
npm ci
npm run dev
npm test
npm run build
```

Preview: http://localhost:5174 (strict port). The original continues on http://localhost:5173.

`code.html` and `screen.png` are the supplied Stitch reference. React components implement the interactive interface; the reference HTML is not used to serve journal content.

## Firebase and existing data

Uses Firebase project `ahmedwanfal` and the same two allowed UIDs. Sign in with an existing account’s email and password. Publish `firestore.rules` from this folder in Firestore → Rules, or use `firebase deploy --only firestore:rules --project ahmedwanfal` as a project administrator.

Existing collections: `milestones`, `memories`, `polaroids`, `songs`, `loveReasons`, `letters`, `openWhen`, `things21`, `favorites`, `futureDreams`, `messages`, `moods`, `notifications`, `countdowns`, and `peaceRoom/currentSession`.

Photos are read from existing `imageUrl` fields (including Base64 images). Timeline photos use `photos`; song artwork uses `coverUrl`. The Polaroid Wall opens by default. Curated Gallery is the separate memories collection.

There are no sample records or stock-photo fallbacks in this version. Empty snapshots clear the UI. Permission/network failures show a connection warning; failed saves show an error and are not replaced by local-storage saves. Collection reads do not filter out older documents missing `createdAt`.

Optional appearance settings live in `settings/site`: title, subtitle, relationshipStartedAt (ISO date string), sanctuaryNote, videoUrl, videoPosterUrl. Set them with the settings button on The Moai Pavilion card. Nothing is automatically seeded, copied, deleted or migrated in Firebase. Existing parent-folder content is not overwritten.

## Verification limits

`npm test` tests the actual data adapter with mocked Firebase calls: image values, missing createdAt, empty snapshots, denied reads, failed writes, and peace room fields. Browser visual checks use an isolated fixture; those records are not included in the running application. Live retrieval requires signing in with one of the two real accounts and published rules. Administrator access from the current CLI account remains unavailable, so the existing database cannot be independently inspected here.

Do not deploy this preview over production until you choose to replace the original. Both folders target the same Firebase project; `firebase deploy --only hosting` would replace its hosted website.

## Preserved legacy media
The original relationship date (2026-09-04) and existing finale video are retained as fallbacks until settings/site supplies replacements. Music embeds use autoplay=0 and have no autoplay permission. Add Memory lets you choose Curated Gallery (memories) or Polaroid Wall (polaroids).

## Functional audit
The browser-audit.js runner is a Playwright callback used by the browser tool with browser-fixture.js in an isolated context. It checks add/edit/delete through the actual interface for nine journal collections, with no production writes. Additional browser checks covered Polaroid add/edit/move/delete, countdown add/edit/delete, chat send/edit/delete, dream completion, moods, peace room submission, notification read/clear, settings, failed writes/deletes, theme switching, and mobile navigation. Unit tests cover eight data-adapter behaviors including timestamp compatibility and rejected updates/deletes.

## Local music player
Music now plays directly from complete audio files in public/music using the custom Stitch controls, with no provider embeds. predev/prebuild regenerate the local catalog; restart dev after adding new files. Optional ffprobe tags supply titles/artists; filenames are the fallback. Playlist metadata and hidden tracks are saved to Firestore under stable local song IDs. Removing a song hides it from the playlist and retains the source file. Older provider records remain in Firebase but are not shown in this local player. Incomplete .crdownload files are ignored by the catalog, Git, and build output. Browser checks confirmed real playback/pause, seeking, volume, next track, repeat, shuffle, and no initial autoplay.
