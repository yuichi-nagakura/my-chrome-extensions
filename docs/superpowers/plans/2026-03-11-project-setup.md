# Project Setup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the my-chrome-extensions Bun workspaces monorepo with root config files and packages/shared/ skeleton.

**Architecture:** Root-first approach — create root config files, then packages/shared/ skeleton, then run `bun install` to verify workspace resolution. No extension packages yet.

**Tech Stack:** Bun, TypeScript (strict), Biome, Chrome Manifest V3, @types/chrome

---

## Chunk 1: Root Configuration Files

### Task 1: Root `package.json`

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "my-chrome-extensions",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run scripts/build-all.ts",
    "dev": "bun run --watch scripts/build-all.ts",
    "lint": "biome lint ./packages",
    "format": "biome format --write ./packages",
    "check": "biome check ./packages",
    "test": "bun test"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0"
  }
}
```

Save to: `package.json`

---

### Task 2: TypeScript config

**Files:**
- Create: `tsconfig.json`

- [ ] **Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["chrome"]
  },
  "include": ["packages/*/src/**/*.ts", "scripts/**/*.ts"]
}
```

Save to: `tsconfig.json`

---

### Task 3: Biome config

**Files:**
- Create: `biome.json`

- [ ] **Step 1: Create biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab"
  }
}
```

Save to: `biome.json`

---

### Task 4: .gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create .gitignore**

```
node_modules/
dist/
.env
*.env.local
bun.lockb
```

Save to: `.gitignore`

- [ ] **Step 2: Commit root config files**

```bash
git init
git add package.json tsconfig.json biome.json .gitignore
git commit -m "chore: initialize monorepo root config"
```

---

## Chunk 2: packages/shared/ Skeleton

### Task 5: shared package.json

**Files:**
- Create: `packages/shared/package.json`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@my-ext/shared",
  "private": true,
  "module": "src/index.ts",
  "devDependencies": {
    "@types/chrome": "^0.0.310"
  }
}
```

Save to: `packages/shared/package.json`

---

### Task 6: shared source stubs

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/storage.ts`
- Create: `packages/shared/src/claude-client.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create types.ts stub**

```typescript
// Shared type definitions for all extensions
export {};
```

Save to: `packages/shared/src/types.ts`

- [ ] **Step 2: Create storage.ts stub**

```typescript
// Chrome storage helpers
export {};
```

Save to: `packages/shared/src/storage.ts`

- [ ] **Step 3: Create claude-client.ts stub**

```typescript
// Claude API client
export {};
```

Save to: `packages/shared/src/claude-client.ts`

- [ ] **Step 4: Create index.ts re-export**

```typescript
export * from "./types";
export * from "./storage";
export * from "./claude-client";
```

Save to: `packages/shared/src/index.ts`

---

### Task 7: build-all.ts placeholder

**Files:**
- Create: `scripts/build-all.ts`

- [ ] **Step 1: Create scripts/build-all.ts**

```typescript
// Build script — add extension build steps here as packages are added
console.log("No extensions to build yet.");
```

Save to: `scripts/build-all.ts`

---

### Task 8: Install dependencies and verify

- [ ] **Step 1: Run bun install**

```bash
bun install
```

Expected: lockfile created, `@types/chrome` installed under `packages/shared/`, no errors.

- [ ] **Step 2: Verify TypeScript compiles without errors**

```bash
bunx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Verify Biome runs without errors**

```bash
bun run check
```

Expected: no lint/format errors

- [ ] **Step 4: Commit shared package**

```bash
git add packages/ scripts/ bun.lockb
git commit -m "chore: add packages/shared skeleton and build script"
```

---
