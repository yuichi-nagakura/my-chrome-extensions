# my-chrome-extensions

Chrome拡張機能をBun workspacesで管理するmonorepoプロジェクト。
開発者向け・AI活用・勉強用の拡張機能を実験的に開発する場。

---

## 技術スタック

| 項目 | 採用技術 |
|------|----------|
| Runtime | Bun |
| Workspace | Bun workspaces |
| 言語 | TypeScript (strict mode) |
| Linter / Formatter | Biome |
| ビルド | Bun build（拡張機能ごと） |
| Manifest | Chrome Manifest V3 |

---

## ディレクトリ構成

```
my-chrome-extensions/
├── CLAUDE.md
├── package.json              # root（bun workspaces設定）
├── biome.json                # Biome設定（共通）
├── tsconfig.json             # TypeScript設定（共通）
├── packages/
│   ├── shared/               # 共通ユーティリティ・型定義
│   │   ├── src/
│   │   │   ├── claude-client.ts   # Claude API クライアント
│   │   │   ├── storage.ts         # Chrome storage helper
│   │   │   └── types.ts           # 共通型定義
│   │   └── package.json
│   └── {extension-name}/     # 各拡張機能
│       ├── src/
│       │   ├── background.ts
│       │   ├── content.ts
│       │   └── popup.ts
│       ├── manifest.json
│       ├── package.json
│       └── dist/             # ビルド成果物（gitignore）
└── scripts/
    └── build-all.ts          # 全拡張機能ビルドスクリプト
```

---

## 各拡張機能の構成ルール

### manifest.json
- **Manifest V3 必須**（V2は使わない）
- `background` は `service_worker` を使う
- `permissions` は必要最小限に絞る
- `host_permissions` も最小限に

```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "dist/background.js"
  }
}
```

### TypeScript
- `strict: true` を必ず有効にする
- `__dirname` は使わない（ESM）→ `import.meta.dir` を使う
- 型定義は `packages/shared/src/types.ts` に集約する
- `any` は禁止、やむを得ない場合は `unknown` を使う

### Bun固有のルール
- `npm` コマンドは使わない → `bun` に統一
- `fetch` / `WebSocket` は Bun native を使う
- テストは `bun test`（Jest互換）
- パッケージ追加は `bun add`

### Biome
- ESLint / Prettier は使わない → Biome に統一
- フォーマットは `bun run format`
- Lint は `bun run lint`
- CIでは `bun run check`（format + lint を同時実行）

---

## 共通スクリプト（root package.json）

```json
{
  "scripts": {
    "build": "bun run scripts/build-all.ts",
    "dev": "bun run --watch scripts/build-all.ts",
    "lint": "biome lint ./packages",
    "format": "biome format --write ./packages",
    "check": "biome check ./packages",
    "test": "bun test",
    "typecheck": "bunx tsc --noEmit"
  }
}
```

---

## Claude API 利用ルール

- APIキーは `chrome.storage.local` に保存する（ハードコード禁止）
- `packages/shared/src/claude-client.ts` の共通クライアントを使う
- 使用モデル: `claude-sonnet-4-20250514`（固定）
- `max_tokens` はデフォルト `1024`、長文が必要な場合のみ増やす
- エラーハンドリングを必ず実装する（APIエラー・ネットワークエラー）

```typescript
// claude-client.ts の使い方
import { claudeClient } from '@my-ext/shared';

const response = await claudeClient.complete({
  prompt: 'your prompt here',
  maxTokens: 1024,
});
```

---

## 新しい拡張機能を追加する手順

1. `packages/{extension-name}/` ディレクトリを作成
2. `manifest.json` を作成（Manifest V3）
3. `package.json` を作成（`@my-ext/{name}` で命名）
4. `src/` に `background.ts` / `content.ts` / `popup.ts` を実装
5. `bun install` を実行して依存関係を解決（workspaces glob で自動検出される）
6. `bun run build` でビルド確認

---

## AIへの指示テンプレート

新しい拡張機能を作成する際は、以下のフォーマットで指示する：

```
以下の仕様でChrome拡張機能を作成してください。

【拡張機能名】{name}
【パッケージ名】@my-ext/{name}
【配置先】packages/{name}/

【機能】
- （具体的な機能を箇条書きで）

【権限】
- （必要なChrome APIパーミッションを列挙）

【制約】
- CLAUDE.mdのルールに従う
- Manifest V3必須
- sharedパッケージの共通クライアントを使う

【完了条件】
- bun run buildでdist/に出力される
- manifest.jsonが正しく生成される
- TypeScriptのエラーがない
```

---

## 拡張機能一覧

| パッケージ名 | 説明 | ステータス |
|------------|------|-----------|
| @my-ext/yt-like-memo | YouTube高評価した動画を自動保存してポップアップで閲覧 | 開発中 |

---

## 注意事項

- `dist/` は `.gitignore` に追加する
- APIキーをコミットしない（`.env` も `.gitignore` へ）
- Chrome拡張機能のCSP（Content Security Policy）に注意
  - インラインスクリプト不可
  - 外部スクリプトの読み込みは `content_security_policy` で明示
