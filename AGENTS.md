# Repository Agent Rules

These instructions are mandatory for every coding agent and AI model working in this repository.

## Read before editing

Before changing React frontend code, read completely:

1. `docs/编码规范.md`
2. The nearest relevant tests, shared contracts, and page or feature modules

Before changing Fastify backend code, read completely:

1. `docs/Fastify后端编码规范.md`
2. The nearest relevant tests and shared schemas

Changes to `packages/shared` must satisfy both frontend and backend boundaries. Read both coding
standards when a shared contract affects both applications.

If a task conflicts with these rules, follow the user's explicit request and report the conflict.

## Required workflow

1. Inspect `git status` and preserve existing user changes.
2. Use the code knowledge graph before text search for code discovery and impact analysis.
3. State the intended scope and invariants before implementation.
4. Keep dependencies one-way:
   - Web: Router/Page/Component -> data-provider -> Service -> HTTP Client/shared contract.
   - Server: Route -> Service -> Repository/shared contract.
5. Add or update behavior tests for every contract or behavior change.
6. Do not add dependencies, change database schemas, or change public APIs unless explicitly required.
7. Run the completion gate for every application affected by the change.
8. Report the exact commands run, skipped checks, and every remaining failure. Never reuse stale
   “all green” claims.

## Repository-wide hard prohibitions

- No `any`, `@ts-ignore`, disabled lint rules, or deleted tests used to bypass failures.
- No empty catch blocks or catch-and-return-success behavior.
- No unrelated refactors, repository-wide formatting, or destructive Git operations.
- No generic `manager`, `helper`, `utils`, or `common` modules without a documented, cohesive responsibility.

## Backend hard prohibitions

- No raw API response objects, arrays, errors, 204, or 304 responses.
- No `console.*` in server code; use structured Fastify/Pino logging.
- No `process.env` outside `config/` and controlled `cli/` entry points.
- No database schema imports or Drizzle queries in Route modules.
- No Fastify Request/Reply types in Service or Repository modules.

## Frontend hard prohibitions

- No direct Axios or `fetch` calls from Pages or Components; use `data-provider` and Services.
- No server data duplicated in Zustand, Context, or component state.
- No ad hoc TanStack Query keys; create and reuse keys from `data-provider/query-keys.ts`.
- No React imports or browser UI concerns in Services or shared contracts.
- No side effects during render and no `useEffect` for derived state or user-triggered actions.
- No clickable non-semantic elements when a native button, link, input, or other control applies.
- No unstable list keys for mutable lists, unlabelled form controls, or focus traps without escape and
  focus restoration.
- No `!important`, disabled accessibility behavior, or arbitrary waits used to hide UI defects or test
  races.
- No Web source file above 600 lines; split by cohesive responsibility before crossing the gate.

## Frontend completion gate

Frontend work is incomplete unless all of the following are true:

- the dependency direction in `docs/编码规范.md` is preserved;
- loading, refreshing, empty, error, disabled, and submitting states affected by the change are handled;
- keyboard interaction, focus behavior, accessible names, and responsive behavior are preserved;
- changed behavior has unit, component, or end-to-end coverage at the appropriate level;
- `bun run lint`, `bun run check:web-size`, `bun run --cwd apps/web typecheck`,
  `bun run test:web`, and `bun run --cwd apps/web build` pass;
- `bun run test:e2e` passes when routes, authentication, responsive navigation, critical forms, or
  cross-page flows change;
- correctness, readability, architecture, accessibility, security, and performance were reviewed.

## Backend completion gate

Backend work is incomplete unless all of the following are true:

- response contract is `code/message/data` only;
- input and output boundaries are validated;
- authentication, authorization, and user isolation are preserved;
- failure paths and invariants have tests;
- `bun run check:backend` passes;
- correctness, readability, architecture, security, and performance were reviewed.
