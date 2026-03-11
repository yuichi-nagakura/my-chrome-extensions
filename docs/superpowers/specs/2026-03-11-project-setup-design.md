# Project Setup Design

**Date:** 2026-03-11
**Scope:** Foundation-only setup (no sample extension)

## Overview

Initialize the `my-chrome-extensions` Bun workspaces monorepo with root config files and `packages/shared/` skeleton.

## Approach

Build root-first, then shared package, then verify with `bun install`. This allows early detection of workspace configuration issues.

## Files to Create

### Root
| File | Purpose |
|------|---------|
| `package.json` | Workspace root; `workspaces: ["packages/*"]`; scripts from CLAUDE.md |
| `tsconfig.json` | TypeScript strict mode, ESM, references `@types/chrome` |
| `biome.json` | Biome recommended config; formatter + linter enabled |
| `.gitignore` | Exclude `dist/`, `.env`, `node_modules/` |
| `scripts/build-all.ts` | Placeholder for multi-extension build script |

### `packages/shared/`
| File | Purpose |
|------|---------|
| `package.json` | `@my-ext/shared`; `@types/chrome` as devDependency |
| `src/index.ts` | Re-exports all modules |
| `src/claude-client.ts` | Empty stub |
| `src/storage.ts` | Empty stub |
| `src/types.ts` | Empty stub |

## Key Decisions

- `@types/chrome` placed in `packages/shared/` so all extension packages can inherit it
- `scripts/build-all.ts` created as placeholder to avoid breaking the root `build` script
- No sample extension — pure foundation only

## Out of Scope

- Actual implementation of `claude-client.ts`, `storage.ts`, `types.ts`
- Any extension package (`packages/{extension-name}/`)
