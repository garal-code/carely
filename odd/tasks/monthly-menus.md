# Monthly menus

Support monthly daycare menus (concrete dates) alongside weekly ones. Days are identified by date and grouped into weeks; the UI navigates week → day.

Branch: `feat/monthly-menus` (from `develop`)

## Design
- AI result: `{ title, weeks: [{ label, days: DayPlan[] }], generalNotes }`; every `DayPlan.date` is `YYYY-MM-DD`.
- Stored menus with the legacy `{ weekLabel, days }` shape are normalized on load.
- UI: week switcher (‹ label ›, hidden for single-week menus) + day tabs labelled with weekday and day of month; opens on today, else nearest week.

## Tasks
- [ ] 1. Server: schema, prompt, types and output budget for multi-week menus
- [ ] 2. App: types, legacy normalization and pure menu helpers with `node --test` tests
- [ ] 3. App UI: week switcher + dated day tabs, titles, request timeout
- [ ] 4. Verify: typecheck + lint (app and server)

## Evidence
