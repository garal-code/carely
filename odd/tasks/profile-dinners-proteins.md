# Profile keyboard, dinner alternatives and weekly proteins

Branch: `feat/profile-dinners-proteins` (from `develop` f1ace7b). Shopping list explicitly out of scope (user decision).

## Design
- Keyboard: core React Native only (Expo Go compatible; `react-native-keyboard-controller` needs a dev build). Focused input — and the caret area of long multiline text — stays visible above the keyboard.
- Proteins: the AI tags every school meal and dinner with `proteins: ('carne'|'pescado'|'huevo'|'legumbre')[]`; menus stored without tags fall back to a keyword detector.
- Dinner alternatives: new `POST /v1/dinners/alternative` (`mode: 'another' | 'pantry'`, optional pantry text) returns one `DinnerProposal` that complements that week's school menu and respects age, allergies, diet and preferences. The user previews it and accepts to replace the day's dinner; protein counts recompute from stored data.
- Weekly protein view: per week, school meals + chosen dinners with protein counts split into comida / cena / total, labelled as planned menu, not confirmed intake.

## Tasks
- [x] 1. Server: protein tags in analysis schema + dinner alternative endpoint
- [ ] 2. App data: types, protein counting (+ keyword fallback) with tests, alternative API client, dinner replacement in context
- [ ] 3. App UI: «Otra receta» / «Cocinar con lo que tengo» with preview and accept
- [ ] 4. App UI: weekly protein view
- [ ] 5. App UI: keyboard-aware profile form
- [ ] 6. Verify: typecheck, lint, tests (app + server)

## Evidence
- Task 1: commits 42130fe (protein tags), 056afe2 (POST /v1/dinners/alternative) — server typecheck passed; not run against real AI providers.
