# yt-like-memo Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chrome extension that auto-saves YouTube video info when the like button is pressed, viewable from a popup.

**Architecture:** Content script detects like-button clicks on YouTube via event delegation + MutationObserver for SPA navigation. It sends video metadata to a background service worker, which deduplicates by videoId and persists to chrome.storage.local. A popup renders the saved list with thumbnails. Popup sends DELETE messages to background for deletions (single source of truth for storage).

**Tech Stack:** TypeScript (strict), Bun (build + test), Manifest V3, chrome.storage.local, Biome (lint/format)

**Spec:** `docs/superpowers/specs/2026-03-11-yt-like-memo-design.md`

---

## File Structure

```
packages/yt-like-memo/
├── package.json
├── manifest.json
├── popup.html
├── popup.css
├── src/
│   ├── content.ts                     # Like-button detection + video info extraction
│   ├── background.ts                  # Message handler + storage logic (single source of truth)
│   ├── popup.ts                       # Popup rendering, sends messages to background
│   ├── types.ts                       # Extension-specific types (LikedVideo, messages)
│   └── __tests__/
│       ├── background.test.ts         # Storage logic tests
│       └── content.test.ts            # Pure function tests (getVideoId, getThumbnailUrl, isLiked)
└── dist/                              # Build output (gitignored)

scripts/
└── build-all.ts                       # Updated to include yt-like-memo build
```

Note: Types are kept in the extension's local `types.ts` because `LikedVideo`, `SaveVideoMessage`, and message types are specific to this extension and not shared across extensions. `packages/shared/src/storage.ts` is not used — background.ts owns all storage access directly.

Note: Root `package.json` uses `"workspaces": ["packages/*"]` glob, so the new package is auto-discovered — no root edit needed.

---

## Chunk 1: Package scaffolding + types + build

### Task 1: Create package scaffolding

**Files:**
- Create: `packages/yt-like-memo/package.json`
- Create: `packages/yt-like-memo/manifest.json`
- Create: `packages/yt-like-memo/src/types.ts`

- [ ] **Step 1: Create `packages/yt-like-memo/package.json`**

```json
{
  "name": "@my-ext/yt-like-memo",
  "private": true,
  "version": "0.1.0"
}
```

- [ ] **Step 2: Create `packages/yt-like-memo/src/types.ts`**

```ts
export type LikedVideo = {
  videoId: string;
  title: string;
  url: string;
  channelName: string;
  thumbnailUrl: string;
};

export type SaveVideoMessage = {
  type: "SAVE_LIKED_VIDEO";
  video: LikedVideo;
};

export type DeleteVideoMessage = {
  type: "DELETE_VIDEO";
  videoId: string;
};

export type GetVideosMessage = {
  type: "GET_VIDEOS";
};

export type ExtensionMessage =
  | SaveVideoMessage
  | DeleteVideoMessage
  | GetVideosMessage;

export type MessageResponse =
  | { success: true; data?: LikedVideo[] }
  | { success: false; error: string };
```

- [ ] **Step 3: Create `packages/yt-like-memo/manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "YT Like Memo",
  "version": "0.1.0",
  "description": "Auto-save liked YouTube videos as memos",
  "permissions": ["storage"],
  "host_permissions": ["*://www.youtube.com/*"],
  "background": {
    "service_worker": "dist/background.js"
  },
  "content_scripts": [
    {
      "matches": ["*://www.youtube.com/*"],
      "js": ["dist/content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "YT Like Memo"
  },
  "icons": {}
}
```

- [ ] **Step 4: Run `bun install` to link workspace**

Run: `bun install`
Expected: Resolves workspace packages including `@my-ext/yt-like-memo`, no errors.

- [ ] **Step 5: Verify typecheck passes**

Run: `bun run typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add packages/yt-like-memo/package.json packages/yt-like-memo/manifest.json packages/yt-like-memo/src/types.ts
git commit -m "feat(yt-like-memo): scaffold package with types and manifest"
```

### Task 2: Update build script

**Files:**
- Modify: `scripts/build-all.ts`

- [ ] **Step 1: Update `scripts/build-all.ts`**

Replace the entire file with:

```ts
import path from "node:path";

const extensions = ["yt-like-memo"];

for (const ext of extensions) {
  const srcDir = path.join("packages", ext, "src");
  const outDir = path.join("packages", ext, "dist");

  const entrypoints = ["content.ts", "background.ts", "popup.ts"]
    .map((f) => path.join(srcDir, f));

  const result = await Bun.build({
    entrypoints,
    outdir: outDir,
    target: "browser",
    format: "esm",
  });

  if (!result.success) {
    console.error(`Build failed for ${ext}:`, result.logs);
    process.exit(1);
  }

  console.log(`Built ${ext}: ${result.outputs.length} files`);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/build-all.ts
git commit -m "feat: update build script for yt-like-memo extension"
```

---

## Chunk 2: Background service worker (storage logic)

### Task 3: Write background service worker

**Files:**
- Create: `packages/yt-like-memo/src/__tests__/background.test.ts`
- Create: `packages/yt-like-memo/src/background.ts`

- [ ] **Step 1: Write test for storage logic**

Create `packages/yt-like-memo/src/__tests__/background.test.ts`:

```ts
import { describe, expect, test, beforeEach, mock } from "bun:test";
import type { LikedVideo } from "../types";

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};

globalThis.chrome = {
  storage: {
    local: {
      get: mock((keys: string[]) =>
        Promise.resolve(
          Object.fromEntries(keys.map((k) => [k, mockStorage[k]]))
        )
      ),
      set: mock((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    onMessage: {
      addListener: mock(() => {}),
    },
  },
} as unknown as typeof chrome;

// Import after mock setup
const { saveVideo, getVideos, deleteVideo } = await import("../background");

const sampleVideo: LikedVideo = {
  videoId: "abc123",
  title: "Test Video",
  url: "https://www.youtube.com/watch?v=abc123",
  channelName: "Test Channel",
  thumbnailUrl: "https://i.ytimg.com/vi/abc123/mqdefault.jpg",
};

describe("saveVideo", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  });

  test("saves a new video", async () => {
    await saveVideo(sampleVideo);
    expect(mockStorage.likedVideos).toEqual([sampleVideo]);
  });

  test("does not duplicate by videoId", async () => {
    mockStorage.likedVideos = [sampleVideo];
    await saveVideo(sampleVideo);
    expect(mockStorage.likedVideos).toEqual([sampleVideo]);
  });

  test("prepends new video to existing list", async () => {
    const existing: LikedVideo = { ...sampleVideo, videoId: "xyz789", title: "Other" };
    mockStorage.likedVideos = [existing];
    await saveVideo(sampleVideo);
    expect(mockStorage.likedVideos).toEqual([sampleVideo, existing]);
  });
});

describe("getVideos", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  });

  test("returns empty array when no data", async () => {
    const result = await getVideos();
    expect(result).toEqual([]);
  });

  test("returns saved videos", async () => {
    mockStorage.likedVideos = [sampleVideo];
    const result = await getVideos();
    expect(result).toEqual([sampleVideo]);
  });
});

describe("deleteVideo", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  });

  test("removes video by videoId", async () => {
    mockStorage.likedVideos = [sampleVideo];
    await deleteVideo("abc123");
    expect(mockStorage.likedVideos).toEqual([]);
  });

  test("no-op if videoId not found", async () => {
    mockStorage.likedVideos = [sampleVideo];
    await deleteVideo("nonexistent");
    expect(mockStorage.likedVideos).toEqual([sampleVideo]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/yt-like-memo/src/__tests__/background.test.ts`
Expected: FAIL — `../background` has no exports.

- [ ] **Step 3: Implement `packages/yt-like-memo/src/background.ts`**

```ts
import type { LikedVideo, ExtensionMessage, MessageResponse } from "./types";

const STORAGE_KEY = "likedVideos";

export async function getVideos(): Promise<LikedVideo[]> {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  return (data[STORAGE_KEY] as LikedVideo[] | undefined) ?? [];
}

export async function saveVideo(video: LikedVideo): Promise<void> {
  const videos = await getVideos();
  const exists = videos.some((v) => v.videoId === video.videoId);
  if (exists) return;
  await chrome.storage.local.set({ [STORAGE_KEY]: [video, ...videos] });
}

export async function deleteVideo(videoId: string): Promise<void> {
  const videos = await getVideos();
  const filtered = videos.filter((v) => v.videoId !== videoId);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void,
  ) => {
    if (message.type === "SAVE_LIKED_VIDEO") {
      saveVideo(message.video)
        .then(() => sendResponse({ success: true }))
        .catch((error: unknown) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        );
      return true;
    }

    if (message.type === "GET_VIDEOS") {
      getVideos()
        .then((data) => sendResponse({ success: true, data }))
        .catch((error: unknown) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        );
      return true;
    }

    if (message.type === "DELETE_VIDEO") {
      deleteVideo(message.videoId)
        .then(() => sendResponse({ success: true }))
        .catch((error: unknown) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        );
      return true;
    }
  },
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/yt-like-memo/src/__tests__/background.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run lint + typecheck**

Run: `bun run check && bun run typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add packages/yt-like-memo/src/background.ts packages/yt-like-memo/src/__tests__/background.test.ts
git commit -m "feat(yt-like-memo): add background service worker with storage logic"
```

---

## Chunk 3: Content script (like-button detection)

### Task 4: Write content script tests

**Files:**
- Create: `packages/yt-like-memo/src/__tests__/content.test.ts`

- [ ] **Step 1: Write tests for content script pure functions**

Create `packages/yt-like-memo/src/__tests__/content.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { getVideoIdFromUrl, getThumbnailUrl, isLiked } from "../content";

describe("getVideoIdFromUrl", () => {
  test("extracts video ID from standard URL", () => {
    expect(getVideoIdFromUrl("https://www.youtube.com/watch?v=abc123")).toBe("abc123");
  });

  test("extracts video ID with extra params", () => {
    expect(getVideoIdFromUrl("https://www.youtube.com/watch?v=abc123&t=60")).toBe("abc123");
  });

  test("returns null for non-watch URL", () => {
    expect(getVideoIdFromUrl("https://www.youtube.com/")).toBeNull();
  });

  test("returns null for URL without v param", () => {
    expect(getVideoIdFromUrl("https://www.youtube.com/watch")).toBeNull();
  });
});

describe("getThumbnailUrl", () => {
  test("returns mqdefault thumbnail URL", () => {
    expect(getThumbnailUrl("abc123")).toBe("https://i.ytimg.com/vi/abc123/mqdefault.jpg");
  });
});

describe("isLiked", () => {
  test("returns true when aria-pressed is true", () => {
    const el = document.createElement("button");
    el.setAttribute("aria-pressed", "true");
    expect(isLiked(el)).toBe(true);
  });

  test("returns false when aria-pressed is false", () => {
    const el = document.createElement("button");
    el.setAttribute("aria-pressed", "false");
    expect(isLiked(el)).toBe(false);
  });

  test("returns false when aria-pressed is absent", () => {
    const el = document.createElement("button");
    expect(isLiked(el)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/yt-like-memo/src/__tests__/content.test.ts`
Expected: FAIL — `../content` has no named exports.

### Task 5: Write content script

**Files:**
- Create: `packages/yt-like-memo/src/content.ts`

- [ ] **Step 1: Create `packages/yt-like-memo/src/content.ts`**

```ts
import type { LikedVideo, SaveVideoMessage } from "./types";

export function getVideoIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

export function getThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function isLiked(button: HTMLElement): boolean {
  return button.getAttribute("aria-pressed") === "true";
}

function getVideoTitle(): string {
  const el = document.querySelector<HTMLElement>(
    "yt-formatted-string.ytd-watch-metadata",
  );
  return el?.textContent?.trim() ?? "Unknown Title";
}

function getChannelName(): string {
  const el = document.querySelector<HTMLElement>(
    "ytd-channel-name yt-formatted-string a",
  );
  return el?.textContent?.trim() ?? "Unknown Channel";
}

function collectVideoInfo(): LikedVideo | null {
  const videoId = getVideoIdFromUrl(window.location.href);
  if (!videoId) return null;

  return {
    videoId,
    title: getVideoTitle(),
    url: `https://www.youtube.com/watch?v=${videoId}`,
    channelName: getChannelName(),
    thumbnailUrl: getThumbnailUrl(videoId),
  };
}

function sendToBackground(video: LikedVideo): void {
  const message: SaveVideoMessage = { type: "SAVE_LIKED_VIDEO", video };
  chrome.runtime.sendMessage(message);
}

function findLikeButton(): HTMLElement | null {
  const btn = document.querySelector<HTMLElement>(
    'like-button-view-model button, segmented-like-dislike-button-view-model button[aria-label*="like" i]',
  );
  if (btn) return btn;

  const legacyBtn = document.querySelector<HTMLElement>(
    'ytd-toggle-button-renderer#button[aria-label*="like" i] button',
  );
  return legacyBtn;
}

let currentLikeButton: HTMLElement | null = null;

function attachLikeListener(): void {
  const btn = findLikeButton();
  if (!btn || btn === currentLikeButton) return;

  currentLikeButton = btn;

  btn.addEventListener("click", () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (currentLikeButton && isLiked(currentLikeButton)) {
          const video = collectVideoInfo();
          if (video) {
            sendToBackground(video);
          }
        }
      }, 300);
    });
  });
}

function observePageChanges(): void {
  const observer = new MutationObserver(() => {
    attachLikeListener();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Initial setup
attachLikeListener();
observePageChanges();
```

- [ ] **Step 2: Run content tests to verify they pass**

Run: `bun test packages/yt-like-memo/src/__tests__/content.test.ts`
Expected: All tests PASS.

- [ ] **Step 3: Run lint + typecheck**

Run: `bun run check && bun run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/yt-like-memo/src/content.ts packages/yt-like-memo/src/__tests__/content.test.ts
git commit -m "feat(yt-like-memo): add content script for like-button detection"
```

---

## Chunk 4: Popup UI

### Task 6: Write popup HTML + CSS

**Files:**
- Create: `packages/yt-like-memo/popup.html`
- Create: `packages/yt-like-memo/popup.css`

- [ ] **Step 1: Create `packages/yt-like-memo/popup.html`**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="header">
    <h1>YT Like Memo</h1>
  </div>
  <div id="video-list"></div>
  <div id="empty-state" class="empty-state" hidden>
    高評価した動画はまだありません
  </div>
  <script src="dist/popup.js" type="module"></script>
</body>
</html>
```

- [ ] **Step 2: Create `packages/yt-like-memo/popup.css`**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 360px;
  max-height: 500px;
  overflow-y: auto;
  font-family: "Segoe UI", Roboto, sans-serif;
  background: #0f0f0f;
  color: #f1f1f1;
}

.header {
  padding: 12px 16px;
  border-bottom: 1px solid #272727;
  position: sticky;
  top: 0;
  background: #0f0f0f;
  z-index: 1;
}

.header h1 {
  font-size: 16px;
  font-weight: 600;
}

.video-item {
  display: flex;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 1px solid #272727;
  position: relative;
}

.video-item:hover {
  background: #272727;
}

.video-item img {
  width: 120px;
  height: 68px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.video-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-channel {
  font-size: 11px;
  color: #aaa;
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  line-height: 1;
  border-radius: 50%;
}

.delete-btn:hover {
  background: #3f3f3f;
  color: #f1f1f1;
}

.empty-state {
  padding: 40px 16px;
  text-align: center;
  color: #aaa;
  font-size: 13px;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/yt-like-memo/popup.html packages/yt-like-memo/popup.css
git commit -m "feat(yt-like-memo): add popup HTML and CSS"
```

### Task 7: Write popup script

**Files:**
- Create: `packages/yt-like-memo/src/popup.ts`

- [ ] **Step 1: Create `packages/yt-like-memo/src/popup.ts`**

The popup sends messages to background for all storage operations (background is single source of truth).

```ts
import type {
  LikedVideo,
  GetVideosMessage,
  DeleteVideoMessage,
  MessageResponse,
} from "./types";

function sendMessage(
  message: GetVideosMessage | DeleteVideoMessage,
): Promise<MessageResponse> {
  return chrome.runtime.sendMessage(message);
}

async function fetchVideos(): Promise<LikedVideo[]> {
  const response = await sendMessage({ type: "GET_VIDEOS" });
  if (response.success && response.data) {
    return response.data;
  }
  return [];
}

async function requestDelete(videoId: string): Promise<void> {
  await sendMessage({ type: "DELETE_VIDEO", videoId });
}

function createVideoElement(video: LikedVideo): HTMLElement {
  const item = document.createElement("div");
  item.className = "video-item";

  const img = document.createElement("img");
  img.src = video.thumbnailUrl;
  img.alt = video.title;

  const info = document.createElement("div");
  info.className = "video-info";

  const title = document.createElement("div");
  title.className = "video-title";
  title.textContent = video.title;

  const channel = document.createElement("div");
  channel.className = "video-channel";
  channel.textContent = video.channelName;

  info.appendChild(title);
  info.appendChild(channel);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "\u00d7";
  deleteBtn.title = "Delete";
  deleteBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await requestDelete(video.videoId);
    item.remove();
    updateEmptyState();
  });

  item.addEventListener("click", () => {
    chrome.tabs.create({ url: video.url });
  });

  item.appendChild(img);
  item.appendChild(info);
  item.appendChild(deleteBtn);

  return item;
}

function updateEmptyState(): void {
  const list = document.getElementById("video-list");
  const emptyState = document.getElementById("empty-state");
  if (!list || !emptyState) return;

  const hasChildren = list.children.length > 0;
  emptyState.hidden = hasChildren;
}

async function render(): Promise<void> {
  const list = document.getElementById("video-list");
  if (!list) return;

  const videos = await fetchVideos();
  for (const video of videos) {
    list.appendChild(createVideoElement(video));
  }

  updateEmptyState();
}

render();
```

- [ ] **Step 2: Verify build succeeds**

Run: `bun run build`
Expected: `Built yt-like-memo: 3 files`

- [ ] **Step 3: Run typecheck + lint**

Run: `bun run typecheck && bun run check`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/yt-like-memo/src/popup.ts
git commit -m "feat(yt-like-memo): implement popup video list UI"
```

---

## Chunk 5: Final verification + docs

### Task 8: End-to-end verification

- [ ] **Step 1: Run full build**

Run: `bun run build`
Expected: `Built yt-like-memo: 3 files`

- [ ] **Step 2: Run all tests**

Run: `bun test`
Expected: All tests pass.

- [ ] **Step 3: Run full check**

Run: `bun run check && bun run typecheck`
Expected: No errors.

- [ ] **Step 4: Verify dist output files exist**

Run: `ls packages/yt-like-memo/dist/`
Expected: `background.js`, `content.js`, `popup.js`

### Task 9: Update CLAUDE.md extension list

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the extension list table in CLAUDE.md**

Replace the placeholder row in the "拡張機能一覧" table:

```markdown
| @my-ext/yt-like-memo | YouTube高評価した動画を自動保存してポップアップで閲覧 | 開発中 |
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add yt-like-memo to extension list in CLAUDE.md"
```

### Loading the extension in Chrome

To test: open `chrome://extensions/`, enable Developer Mode, click "Load unpacked", and select the `packages/yt-like-memo/` directory.
