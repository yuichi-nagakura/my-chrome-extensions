# YT Like Memo

YouTube で高評価ボタンを押したとき、その動画の情報を自動的に保存し、ポップアップから一覧で確認できる Chrome 拡張機能。

## 機能

- YouTube の高評価ボタンのクリックを自動検出して動画情報を保存
- 保存される情報: 動画タイトル、URL、チャンネル名、サムネイル
- ポップアップで保存済み動画の一覧を表示
- 動画クリックで新しいタブで開く
- 個別の削除が可能
- YouTube の SPA 遷移に対応（MutationObserver）

## インストール

```bash
# プロジェクトルートで
bun install
bun run build
```

1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `packages/yt-like-memo/` ディレクトリを選択

## 使い方

1. YouTube で動画を再生
2. 高評価ボタン（👍）を押す
3. 自動的に動画情報が保存される
4. ツールバーの拡張機能アイコンをクリックして保存済み一覧を表示

## 構成

```
packages/yt-like-memo/
├── manifest.json        # Manifest V3 設定
├── popup.html           # ポップアップ UI
├── popup.css            # スタイル（YouTube ダークテーマ）
├── src/
│   ├── types.ts         # 型定義
│   ├── content.ts       # 高評価ボタン検出 + 動画情報収集
│   ├── background.ts    # メッセージ処理 + ストレージ管理
│   ├── popup.ts         # ポップアップの描画・操作
│   └── __tests__/       # テスト
└── dist/                # ビルド出力（gitignore）
```

## 権限

- `storage` — 動画データの保存
- `host_permissions: *://www.youtube.com/*` — content script の注入

## 注意事項

- YouTube の DOM 構造変更により高評価ボタンの検出が壊れる可能性があります
- データは `chrome.storage.local` に保存されます（ブラウザ間の同期なし）
