# Service Tracker demo

React + Vite frontend with optional Node.js / Express API. Based on Service Tracker.xlsx: four existing records, 22 fields, nine master lists. No extra synthetic service records were added.

## Quick start

Install Node.js 22.12+ (or a newer compatible maintained release), then:

```sh
npm install
npm run demo
```

Open the Vite address printed in the terminal (normally http://localhost:5173). Select Management or Administrator to explore all screens. No password is required: roles are UI simulation only.

Frontend only: `npm run dev`. When the API is unavailable at initial load, the app uses browser localStorage. Reload after starting the API to switch to server storage. Browser and server stores are separate; they are not automatically merged.

```sh
npm test
npm run build
npm run preview
```

`preview` previews the frontend only; it uses browser storage. Run `npm run demo` for the API-backed demonstration.

## Included screens

- Management Dashboard: KPIs, category/status charts, drill-downs, missing-target/critical/repeat indicators, service table.
- Service Log: all 22 workbook fields, create/edit/detail, assignment, nine statuses, priority, date filters, search, pagination, overdue scope, resolution/cancellation validation.
- Client Summary: total, pending, resolved, repeat, latest raised request and service history.
- Director Dashboard: category, status, root cause, responsibility, monthly raised trends, priority.
- Master Lists: nine workbook lists, add unique values. Additive only to preserve references.
- Import / Export: real .xlsx parsing with preview, required-column checks, duplicate rejection and row-level validation; five-sheet export with summaries.
- Activity History: changes made in this demo, with actor, role, time and request.
- Notifications: assignment notices and computed overdue reminders.
- Demo role selector: Management, Administrator, Service Team can edit; Director and Viewer are read-only in the UI. Master list/import controls are Management/Administrator only.
- Attachment picker: metadata only (name and size), no file upload or download.

## Demo walkthrough

1. Enter as Management and review the four source requests.
2. Click Overdue to drill down; Reset filters to return.
3. Create a request with client, location, description and priority; assign Service Team.
4. View the request, edit to Completed and supply a resolution.
5. Review Client Summary, Director Dashboard and Activity History.
6. Add a master value and verify it appears in the service form.
7. Export the workbook. Re-import it to see duplicate-ID detection. To test a successful import, change a service ID in the exported file and ensure the row satisfies validation.
8. Sign out and enter as Viewer to demonstrate read-only controls.

## Data behavior and known source issues

The seed preserves source blanks, historical timestamps and incomplete resolutions. One historical record has an assignment timestamp before its raised timestamp; editing that record requires correcting the timestamp. Completing/closing a request requires resolution. Source completed requests without resolutions remain visible until edited. Client identity is grouped by exact name for this demo, not a production client identifier.

Pending excludes Completed, Closed and Cancelled. Overdue uses target date before today's UTC date; waiting does not pause it. Missing targets are counted separately. Latest client status refers to the most recently raised request. Repeat is an explicit YES/NO flag, not inferred. Export respects current filters, even when triggered on another screen; reset filters first for all records. Monthly chart uses raised dates.

Import is append-only and reads SERVICE LOG only. Existing IDs are never overwritten. Master lists are not imported. Invalid rows can be excluded while valid rows are committed. Source workbook re-import will show duplicates and source data-quality errors. Export recreates data tables, not original formulas/charts.

## API

- GET /api/health
- GET /api/state -> {state, revision}
- PUT /api/state with {state, revision} -> {revision}

Server binds to 127.0.0.1:3001. Data is persisted to server/data.json using an atomic file replacement. Revision conflict returns 409; reload to obtain current state. This is a single-process demo state API, not the proposed production service API. To reset: stop server, delete server/data.json and restart. For browser-only mode, clear the st-data localStorage key.

## Important limitations

NOT production ready. No real authentication, server-side role authorization, database, per-record API validation, immutable audit trail, file storage, email delivery, background scheduler, cloud deployment or strict status-transition graph. UI role controls are not a security boundary. API state is client supplied. Do not expose the API or demo publicly. The seed contains the workbook's client/contact information; restrict sharing. Browser storage is unencrypted. Use a sanitized seed for public demos.

Before production: replace demo roles with authenticated sessions and server authorization; implement per-record validated endpoints, database transactions/IDs, normalized clients, protected storage, notifications, timezone rules, monitoring and backups.

## Project layout

src/App.jsx: screens and workflows
src/domain.js: shared calculations and validation
src/seed.json: workbook records and master values
src/styles.css: responsive styling
server/index.js: local demo persistence API
server/seed.json: initial API data
tests/domain.test.js: core rule tests

## Verification

Core domain tests are included. Package installation/build may require network access. See CHECKS.md for checks performed in the delivery environment.

Vite setup reference: https://vite.dev/guide/
