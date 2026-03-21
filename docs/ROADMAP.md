# PgStudio Roadmap

> Last Updated: March 2026
> Scope: Active pipeline only (completed items removed)

---

## Guiding Rule

Reduce fear. Increase speed. Everything else waits.

---

## Phase A: Reliability and Developer Confidence

### A1. End-to-End Notebook Flow Tests
- **What**: Add E2E tests that validate notebook -> renderer -> extension-host message flow, including query run, inline edit save, and delete actions.
- **Why this helps**: Prevents regressions in the core workflow users rely on every day.
- **Implementation notes**:
  - Use `@vscode/test-electron` or Playwright-based VS Code extension testing.
  - Start with one smoke suite and one failure-path suite.
  - Reuse current test fixtures in `src/test/integration`.
- **Definition of done**:
  - CI runs E2E tests in a dedicated job.
  - Test covers success and error rendering.
  - At least one test validates renderer message routing and save/delete roundtrip.
- **Suggested files**:
  - `src/test/integration/NotebookRendererFlow.test.ts` (extend)
  - `.github/workflows/test.yml`
  - `package.json` test scripts

### A2. Message Handler Modularization Completion
- **What**: Continue splitting large handler logic into smaller handler classes with explicit input/output contracts.
- **Why this helps**: Makes debugging and onboarding easier; reduces risk of side effects when adding features.
- **Implementation notes**:
  - Keep `MessageHandlerRegistry` as the central router.
  - Ensure each handler has one responsibility and unit tests.
  - Introduce lightweight typing for message payloads.
- **Definition of done**:
  - No new large switch/case blocks for messages.
  - Handler files stay small and focused.
  - Critical handlers have direct unit tests.
- **Suggested files**:
  - `src/services/handlers/*.ts`
  - `src/services/MessageHandler.ts`
  - `src/providers/NotebookKernel.ts`
  - `src/extension.ts`

---

## Phase B: AI and Performance Intelligence

### B1. Safer AI Suggestions on Production Connections
- **What**: Force safe-by-default AI behavior for production-like contexts (read-first guidance, transaction templates, WHERE guards).
- **Why this helps**: Reduces risk of accidental destructive SQL in high-risk environments.
- **Implementation notes**:
  - Extend system prompt and per-request context with environment metadata.
  - Add clear warning banner in chat UI when connection is production.
  - Validate generated write SQL includes rollback-friendly structure.
- **Definition of done**:
  - Production context changes AI output behavior measurably.
  - UI warns users before risky AI-generated SQL.
  - Tests assert prompt rules and guardrail formatting.
- **Suggested files**:
  - `src/providers/chat/AiService.ts`
  - `src/providers/ChatViewProvider.ts`
  - `src/providers/chat/webviewHtml.ts`

### B2. Query Baseline Quality Upgrade
- **What**: Improve performance baseline model beyond simple averages (variance/std dev, outlier handling, minimum sample confidence).
- **Why this helps**: Makes "query got slower" alerts more trustworthy and less noisy.
- **Implementation notes**:
  - Replace placeholder `stdDev` with real rolling variance calculation.
  - Add sample-count confidence thresholds before showing degradation warnings.
  - Persist metadata version for future migrations.
- **Definition of done**:
  - Degradation alerts use confidence thresholds.
  - Baseline model handles outliers without major false positives.
  - Unit tests cover calculation correctness.
- **Suggested files**:
  - `src/services/QueryPerformanceService.ts`
  - `src/services/QueryAnalyzer.ts`
  - `src/providers/kernel/SqlExecutor.ts`

### B3. Explain Plan UX Polish
- **What**: Improve explain visualizer readability with better hierarchy cues, clear hotspot emphasis, and optional export/copy actions.
- **Why this helps**: Helps developers quickly identify bottlenecks without reading raw JSON/text plans.
- **Implementation notes**:
  - Add collapsible subtree controls and sticky plan summary.
  - Improve node badges for cardinality mismatch and high-cost scans.
  - Support "copy top bottlenecks" action.
- **Definition of done**:
  - Complex plans are understandable without scrolling raw JSON.
  - Expensive nodes are obvious at a glance.
  - UX validated with real sample plans.
- **Suggested files**:
  - `src/renderer/components/ExplainVisualizer.ts`
  - `src/renderer_v2.ts`

### B4. AI Schema Context Relevance (RAG-lite)
- **What**: Improve AI context assembly so only relevant schema objects are sent to the model for each prompt.
- **Why this helps**: Reduces token waste, improves answer quality, and avoids model confusion on large databases.
- **Implementation notes**:
  - Rank schema objects by mention match, recent query usage, and table relationship proximity.
  - Cap context size and include a deterministic truncation strategy.
  - Add debug metadata for what objects were selected and why.
- **Definition of done**:
  - Large-schema prompts no longer include broad unrelated schema dumps.
  - AI responses reference the expected objects more consistently.
  - Tests validate context selection and truncation behavior.
- **Suggested files**:
  - `src/providers/ChatViewProvider.ts`
  - `src/providers/chat/DbObjectService.ts`
  - `src/providers/chat/AiService.ts`

---

## Phase C: Power User Workflows

### C1. Connection Profiles (Role-Based Presets)
- **What**: Preset connection behaviors like "Read-Only Analyst", "App Dev", and "DB Admin" with safety and UX defaults.
- **Why this helps**: Reduces setup friction and ensures safer defaults for different user types.
- **Implementation notes**:
  - Each profile controls limits, read-only mode, warning strictness, and AI behavior hints.
  - Provide profile selector and migration path for existing connections.
- **Definition of done**:
  - New and existing connections can apply profiles.
  - Profile state persists and updates status bar indicators.
  - Defaults are documented in UI.
- **Suggested files**:
  - `src/services/ProfileManager.ts`
  - `src/common/types.ts`
  - `src/connectionForm.ts`
  - `src/activation/statusBar.ts`

### C2. Schema Diff (From Initial to Actionable)
- **What**: Upgrade existing schema diff into an actionable workflow with clear object-level changes and SQL patch preview.
- **Why this helps**: Makes schema comparison useful for real migration planning instead of just visual inspection.
- **Implementation notes**:
  - Categorize diff by tables/columns/indexes/constraints.
  - Provide generated patch SQL as editable preview.
  - Add safety warnings for destructive changes.
- **Definition of done**:
  - Users can inspect and copy migration-ready SQL.
  - Diff report is structured and sortable.
  - Destructive operations are clearly flagged.
- **Suggested files**:
  - `src/schemaDesigner/SchemaDiffPanel.ts`
  - `src/commands/schemaDesigner.ts`

---

## Phase D: Collaboration and Ecosystem

**Execution gate**: Begin only after Phase A and B are stable in CI and one release cycle in production.

### D1. Team Shared Query Library
- **What**: Shared saved queries with tags, ownership metadata, and optional review comments.
- **Why this helps**: Teams reuse proven SQL and reduce duplicated effort.
- **Implementation notes**:
  - Keep local-first storage; add optional sync adapter interface.
  - Support import/export of query bundles.
- **Definition of done**:
  - Queries can be shared and re-imported between environments.
  - Metadata (author, tags, updated time) is visible in UI.
- **Suggested files**:
  - `src/services/SavedQueriesService.ts`
  - `src/providers/Phase7TreeProviders.ts`

### D2. Visual Database Designer (ERD Interaction)
- **What**: Interactive ERD-style designer for relationship navigation and table structure edits.
- **Why this helps**: Improves discoverability of schema relationships for onboarding and refactoring.
- **Implementation notes**:
  - Start read-only ERD view, then add controlled edit actions.
  - Support export as image/SQL documentation snippet.
- **Definition of done**:
  - ERD loads for medium schemas with acceptable performance.
  - Users can inspect links and jump to object definitions.
- **Suggested files**:
  - `src/schemaDesigner/*`
  - `src/commands/schemaDesigner.ts`

### D3. Cloud Sync for Profiles and Preferences
- **What**: Optional sync of profiles, query favorites, and selected settings across developer machines.
- **Why this helps**: Improves setup speed and consistency across teams.
- **Implementation notes**:
  - Keep secret material in secure storage; never sync plaintext credentials.
  - Add conflict resolution strategy (last-write-wins with manual compare option).
- **Definition of done**:
  - Settings sync works across two machines with conflict handling.
  - Security review confirms no credential leakage.
- **Suggested files**:
  - `src/services/ProfileManager.ts`
  - `src/services/SecretStorageService.ts`
  - `src/services/SavedQueriesService.ts`

---

## Backlog Ideas (Not Scheduled Yet)

- TypeScript/Zod type generation from selected tables
- Advanced import wizard (mapping + validation rules)
- Query runbooks (multi-step operational scripts)
- Observability integrations (OTel/Grafana linking)
