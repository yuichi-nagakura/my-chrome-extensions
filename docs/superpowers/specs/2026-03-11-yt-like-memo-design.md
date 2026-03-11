# yt-like-memo 設計書

YouTube で高評価ボタンを押したとき、その動画の情報を自動保存し、ポップアップから一覧で確認できる Chrome 拡張機能。

## データモデル

```ts
type LikedVideo = {
  videoId: string;       // 重複防止のキー
  title: string;
  url: string;
  channelName: string;
  thumbnailUrl: string;
}
```

## コンポーネント構成

### content script
- YouTube ページに注入
- 高評価ボタンのクリックを検出し、動画情報を収集して background へ送信
- MutationObserver で SPA 遷移に対応（YouTube はページ遷移せずに画面が変わる）
- ボタンが「押された状態」になったことを確認してから保存（解除→再押下の二重保存防止）

### background (service worker)
- content script からのメッセージを受け取り `chrome.storage.local` に保存
- `videoId` で重複チェック

### popup
- 保存済み動画の一覧表示
- サムネイル・タイトル・チャンネル名を表示
- 各アイテムに削除ボタン
- クリックで動画を新しいタブで開く

## 高評価検出の仕組み
- YouTube の高評価ボタン（`like-button-renderer` 周辺の DOM 要素）にクリックイベントリスナーを設置
- MutationObserver で SPA 遷移時にリスナーを再設置
- ボタンの aria-pressed 属性の変化で「いいね済み」状態を判定

## 権限
- `storage` — データ保存
- `host_permissions`: `*://www.youtube.com/*` — content script 注入

## ストレージ
- `chrome.storage.local` に `LikedVideo[]` として保存
- `videoId` で重複チェック

## 技術的制約
- YouTube の DOM 構造変更により検出が壊れる可能性がある（メンテナンスコスト）
- Manifest V3 必須
- shared パッケージの規約に従う
