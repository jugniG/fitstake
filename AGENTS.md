CODEBASE OVERVIEW

This is "Workout Commitment", a local-only prototype for a private daily workout commitment.
It is built with TanStack Start (Vite + React 19 SSR), TanStack Router file-based routing and
Tailwind CSS v4. TypeScript throughout. Package manager is npm.

The product flow is: edit commitment terms, see the open day and daily allocations, record a
workout take in the browser, review the take, then inspect recording, verification and settlement
as separate records. demo controls in the ledger preview outcomes.

This is a demo. No payment provider, upload, AI verification, auth or real settlement exists.
Plan, ledger and capture summaries are stored in `localStorage` under
`workout-commitment:demo:v1`. The PostgreSQL URL in `.env` is configured but unused.

TECH STACK

Framework: TanStack Start (Vite + React 19)
Router: TanStack Router (file-based at src/routes/). Never edit src/routeTree.gen.ts manually.
Run npm run generate-routes after adding or renaming routes.
Database: Drizzle ORM + pg scaffolding exists but nothing in the app queries it. Do not run
migrations without asking.
UI & Styling: Tailwind CSS v4 with custom horror theme tokens in src/styles.css. Icons:
lucide-react. No shadcn/Radix dependency remains; primitives live in src/components/ui/.
Forms: react-hook-form + @hookform/resolvers/zod.
Camera: getUserMedia + MediaRecorder in src/hooks/use-camera-recorder.ts. Video stays in memory;
only capture metadata is persisted.

IMPORT ALIASES

#/* resolves to ./src/*. Prefer #/ for all internal imports.

Examples:
import { useCommitment } from '#/lib/commitment-store'
import { formatINR } from '#/lib/format'

AGENT INSTRUCTIONS & KEY CONVENTIONS

1. Routing structure: Never create single dot-nested route files (e.g. settings.dashboard.tsx).
   Use flat directory-based nested routes under folders instead.
2. State ownership: Commitment rules belong in src/lib/commitment.ts as pure functions. Persistence
   and React state belong in src/lib/commitment-store.tsx. UI components must not duplicate ledger
   rules.
3. Forms: Any time a feature uses more than 2 input fields, use react-hook-form with a Zod schema
   resolver. Put the schema at the top of the component file and infer the type with
   z.infer<typeof schema>.
4. UI components: Shared primitives live in src/components/ui/. Import them from
   '#/components/ui/*'. App-specific components live beside their feature.
5. Route file modularization: Keep route files focused. If a route file exceeds ~500 lines,
   convert it to a folder and extract page-specific sub-components into a local subfolder.
6. Error handling & logging: Never swallow an error silently. Every caught error must
   console.error with a short identifying prefix (e.g. `[camera] failed to start recording:`), then
   show the actual reason or an actionable fallback in the UI. Reproduce unknown errors before
   guessing at a fix.
7. No fluffy comments: Do not restate what the code says. Comment only non-obvious workarounds,
   subtle bugs, security/correctness constraints or why an obvious alternative was rejected.
8. Name entities for what they are: use `dailyAmount`, `durationDays`, `settlement`, `capture`.
   Avoid `data`, `info`, `temp`, `value`, `helper`. Derive values instead of storing duplicates.
9. Demo integrity: A capture summary is never verification. Recording, verification and settlement
   must remain separate. Settlement is sequential; a day settles at most once and future days stay
   locked. Do not add automatic forfeiture, self-declared payouts or real payment code to the demo.
10. Camera honesty: Handle denied permission, unsupported browsers, insecure contexts, failed
    recordings, interrupted tracks and hidden tabs explicitly. Never label an interrupted take as
    complete.
11. Accessibility and motion: Keep strong contrast, visible focus, real labels, live-region status
    messages and `prefers-reduced-motion` support.

COMMANDS

npm run generate-routes — regenerate the TanStack Router route tree
npm run lint — ESLint
npm run check — Prettier check
npm test — Vitest, including ledger invariant tests
npx tsc --noEmit — typecheck

- Never run the dev server yourself.
- Never run the production build; use typecheck to verify.
- Do not run typecheck for small copy, styling or one-off JSX tweaks. Only typecheck when the
  change touches types, routes, server code or spans several files.
- Prefer answering first and editing directly; do not ask permission for routine edits.
- Ask before running any database migration. db:push is prohibited; use migrate only.
