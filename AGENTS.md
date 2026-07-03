# Agent Guidelines

## Package Manager

- Use `pnpm` for all dependency and script commands.
- Commit `pnpm-lock.yaml`; do not introduce `package-lock.json`, `yarn.lock`, or
  other package-manager locks.

## TypeScript

- Keep TypeScript strict mode enabled.
- Do not weaken `strict`, `noUncheckedIndexedAccess`, or
  `exactOptionalPropertyTypes`.
- Run `pnpm ts-type-check` before considering code complete.

## Commits

- Git commit messages must be in English.
- Use Conventional Commits style, for example `feat: add local sky dome`,
  `fix: correct horizon projection`, or `chore: update dependencies`.

## Checks

- For code changes, run:
  - `pnpm ts-type-check`
  - `pnpm lint`
  - `pnpm build`
