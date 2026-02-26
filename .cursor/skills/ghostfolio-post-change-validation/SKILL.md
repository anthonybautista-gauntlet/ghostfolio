---
name: ghostfolio-post-change-validation
description: Runs post-edit validation for this Ghostfolio monorepo. Use after code edits to auto-run format write/check and affected lint with OOM-safe settings and clear fallback commands.
---

# Ghostfolio Post-Change Validation

## When to use

Use immediately after code edits in this repository.

## Validation workflow

Run these in order:

1. `npm run format:write -- --uncommitted`
2. `npm run format:check -- --uncommitted`
3. `npm run affected:lint -- --base=origin/main --head=HEAD --parallel=2 --quiet`

If `origin/main` is unavailable locally, use:

`npm run affected:lint -- --base=main --head=HEAD --parallel=2 --quiet`

## Guardrails

- Do not run `nx run-many --target=lint --all` as a default post-edit check.
- Prefer affected lint with `--parallel=2` to avoid memory spikes.
- If lint output is noisy, re-run with `--quiet` and fix only blocking errors first.
- If format check fails, always run format write again before commit.

## Optional pre-push gate

When explicitly asked for full validation:

1. `npm run format:check`
2. `npm run lint`
3. `npm test`
4. `npm run eval:mvp`
