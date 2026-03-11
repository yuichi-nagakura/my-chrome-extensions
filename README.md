# my-chrome-extensions

Chrome 拡張機能を Bun workspaces で管理する monorepo プロジェクト。

## 技術スタック

- **Runtime / Build:** Bun
- **言語:** TypeScript (strict mode)
- **Linter / Formatter:** Biome
- **Manifest:** Chrome Manifest V3

## 拡張機能一覧

| パッケージ | 説明 |
|-----------|------|
| [@my-ext/yt-like-memo](./packages/yt-like-memo/) | YouTube で高評価した動画を自動保存してポップアップで閲覧 |

## セットアップ

```bash
bun install
```

## 開発コマンド

```bash
bun run build      # 全拡張機能をビルド
bun run dev        # ウォッチモードでビルド
bun test           # テスト実行
bun run check      # Biome lint + format チェック
bun run format     # フォーマット自動修正
bun run typecheck  # TypeScript 型チェック
```

## 拡張機能の読み込み方

1. `bun run build` でビルド
2. Chrome で `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. 対象の `packages/{extension-name}/` ディレクトリを選択

## ディレクトリ構成

```
my-chrome-extensions/
├── packages/
│   ├── shared/               # 共通ユーティリティ・型定義
│   └── yt-like-memo/         # YouTube 高評価メモ拡張機能
├── scripts/
│   └── build-all.ts          # 全拡張機能ビルドスクリプト
├── biome.json
├── tsconfig.json
└── package.json
```
