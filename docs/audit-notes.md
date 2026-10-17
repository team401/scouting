# Audit notes: feature/admin-event-assignment-polish

> Historical record: this file captures an earlier feature-branch audit. Its
> branch status, test counts, open findings, and verification notes are not the
> current project status. Use `README.md`, `docs/architecture.md`, and
> `docs/cloudflare-deployment.md` for current behavior and operations.

## Commits (oldest first)

| Commit    | Purpose                                                                                                                                                                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `3a9af5c` | Baseline snapshot of the uncommitted event schedule, attendee, and migration work from the local checkout. CRLF normalized to LF (HEAD has no CRLF files; content diff unchanged). Committed separately so the commits below are reviewable on their own. |
| `2cf558f` | Event schedule grid: opaque sticky columns, header cleanup, paste/blur save, arrow-key navigation, click-out clipboard fix.                                                                                                                               |
| `be3b748` | Event picker moved to Event Assignments; "Current event" title removed; Event label inline; Live station coverage card removed from that tab.                                                                                                             |
| `bd35b31` | Fix for `GET /api/event-attendees` 500 / "Unexpected end of JSON input".                                                                                                                                                                                  |

To review only this work: `git diff 3a9af5c..HEAD`.

## Requested changes and where they live

1. **Opaque Person and Assigned columns** (`components/event-schedule-board.tsx`). Sticky cells used `bg-inherit` on rows whose zebra color was `bg-muted/20` (translucent), so scrolled cells showed through. Zebra rows now use an opaque `color-mix(var(--muted) 20%, var(--background))`.
2. **Live station coverage card removed** from the assignments tab (`app/page.tsx`). `ScoutingOperations mode="coverage"` has no remaining callers. The coverage branch is now dead code and can be deleted in a follow-up.
3. **Header.** The "Event schedule" title is removed. Day tabs moved onto the same row as Update day / Remove day.
4. **Paste saves on click-out.** Root cause: the focus handler wrote the cell label to the system clipboard, and the blur handler reset typed text after 100 ms, so typed or pasted text was never saved. Now typed or pasted text is tracked as an edit (`editedRef`). On blur, an exact role/station name (case-insensitive) saves, and an empty edit clears the cell. Unknown text reverts with the message "is not a recognized role or station."
5. **Arrow keys.** Up/Down always move to the adjacent row. Left/Right move only when the caret is at the edge of the text. Enter saves and moves down. Escape cancels.
6. **Current event picker** moved from Team Roster to Event Assignments, with the "Current event" title removed and the Event label inline with the dropdown.
7. **500 on `/api/event-attendees`.** The server log shows a transient `Network connection lost` from Miniflare's remote D1 proxy. That happens because `npm run dev` runs in staging mode with `remote: true`. The route threw with no body, and the client called `.json()` before checking `ok`. Fix: `GET` for attendees and schedule days returns a JSON 503 with `retryable: true`. The board parses bodies safely, retries the initial load once after 1.5 s, and uses the same safe parser for deletes.

## Behavior changes to review

- Enter on a cell that was not edited no longer clears it. Previously, Enter on an untouched empty query cleared the assignment.
- Focusing a cell no longer writes its label to the clipboard. Copy (Ctrl+C) on an untouched cell still copies its label.
- Blur commits only exact names. Enter still accepts the first suggestion, as before.

## Verification

- `npm run typecheck`: pass.
- `npx oxlint` on the changed files: 0 warnings, 0 errors.
- `npx oxfmt --check` on the changed files: clean. Repo-wide, 23 unrelated files fail the format check. They were already unformatted and were not touched.
- `npm test`: 29/29 pass.
- Not verified: browser behavior of paste/arrow keys, and the sporadic remote D1 failure itself. The cloud environment has no browser automation, and the staging D1 cannot be reproduced locally. Interactive checks are pending the user.

## Update day: when to click it

- The button reads **Add day** when the selected date is not yet a schedule day. For a saved day it appears as **Update day** only when the First/Last displayed hours differ from the saved window; otherwise it is hidden.
- It saves only the date's **First/Last displayed hour** window. It does not change any assignment; assignments are stored by absolute timestamps.
- Click it after changing the start or end hour for a day you have already added (for example, to extend a day to 9 pm). Until you click it, the grid shows the new window but nothing is saved.
- Clicking a different day tab discards unsaved hour changes. Remove day removes the day from the list and keeps existing assignments.

## Open findings for the audit (not changed)

- Hidden assignments still count. The "Assigned" total counts assignments anywhere in the day, even outside the displayed hour window.
- Switching day tabs silently drops unsaved hour changes (see above). Consider a dirty-state prompt.
- About 40 files call `.json()` and many read the body before checking `ok`. The same empty-body failure can happen anywhere (for example `scouting-operations.tsx`, `match-video-library.tsx` start upload).
- `app/page.tsx` is about 4,350 lines. Admin, event, and video sections should be split into components.
- Tests cover only `lib/` (9 files). There are no route or UI tests, and no coverage of the auth/membership checks in API routes.
- `ScoutingOperations mode="coverage"` is dead code now (see item 2).

## Video compression analysis (no code changed)

Current state (`components/match-video-library.tsx`, `app/api/match-videos/route.ts`):

- Recording uses `MediaRecorder` at 2.5 Mbps video and 64 kbps audio, about 19 MB per minute, or about 37 MB for a two-minute clip.
- Uploads are chunked multipart to R2 with a 2 GB cap, and downloads support HTTP range requests.
- Files chosen from the camera app upload as-is, with no compression.

Options (from web research; sources in the summary reply):

1. **Lower the record bitrate or resolution** (cheapest). Recording at 720p and about 1.5 Mbps is roughly 11 MB per minute and is enough to identify robots on a tablet. The trade-off is detail for later analysis.
2. **Client transcode before upload** using WebCodecs plus Mediabunny. It is fast when the browser supports the needed codecs. Probe with `VideoEncoder.isConfigSupported()`, show progress, and fall back to the original file. Safari support varies by iOS version, and mobile performance depends on the device. Test on representative phones.
3. **Server-side transcode** is the reliable choice for consistent output. Cloudflare Media Transformations is limited to 60-second outputs. Cloudflare Stream handles full-length encodes, billed by stored and delivered minutes.
4. **Two renditions.** Keep the original in R2 for archive, and create a 720p proxy for review and downloads at competitions. Uploading the proxy first gets clips to the team quickly on weak venue Wi-Fi.

Recommended direction: lower the recording bitrate now (option 1), add a 720p proxy with an original fallback (option 4), and evaluate WebCodecs transcoding on real devices before committing to it (option 2). Competition network numbers (upload speed, number of clips per day) would decide between these.

## Round 2: controls, coverage, and shift columns

Commits: `660b700` (controls and gating), `6993c79` (board).

### What changed

- **Event controls.** Migration `drizzle/0025_event_controls.sql` adds `events.scouting_enabled` and `events.outreach_enabled` (default on). `GET`/`PUT /api/event-controls` read for members and write for owners and admins. Board toggles save immediately and roll back on failure.
- **Gating.** Scouting gates the station options (Red/Blue 1–3) and the Scouting and Scouting Lead roles. Outreach gates Pit Outreach. Pit Scouting is not gated (assumption; see below). Both the dropdowns and the API (`event-schedule` POST, `scout-shifts` POST) enforce it. Turning a control off does not delete existing assignments.
- **Columns.** Person width = longest name (plus 8 ch for the Guest badge). Time columns are sized to the longest enabled option. The single Assigned column is now Assigned scouting shifts, Assigned pit shifts, and Total roles (sticky right).
- **Coverage footer.** Per displayed hour: Pit Crew 2, Pit Lead 1, Pit Programmer 1, Red scouts 3, Blue scouts 3, Scouting Lead 1, Pit Outreach 1, Team Media 1. Shortfalls are amber with `have/need` text, not errors. Scouting and outreach rows disappear when their control is off.
- **Guests.** Guest passes create real users with a `guest:` ID and a scout membership, so they already appear in the roster. The board marks them with a Guest badge and sorts them after members.

### Verification

- `npm run typecheck`: pass. `oxlint` on changed files: 0 errors. `oxfmt --check` on changed files: pass.
- `npm test`: 36/36 pass (29 existing plus 7 in `tests/event-coverage.test.ts`, covering gating, toggle-dependent targets, per-station counts, and shift summaries).
- Not verified: the SQL migration on the staging D1, the API responses against real data, the layout in a browser, and the paste/arrow behavior from round 1 (still pending).

### Assumptions to confirm

- Pit Scouting is not gated by the scouting control.
- Guest attendance is per person: each guest pass sign-in creates a separate user. A partner team that wants pre-planned blue shifts before its people sign in would need a placeholder row, which is not built.
