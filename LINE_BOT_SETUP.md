# LINE Bot 設定ガイド

## 📱 LINE Botで日報を送信する

ドライバーは、LINEから簡単に日報を送信できます！

---

## 🚀 セットアップ手順

### 1. LINE Developers コンソールにアクセス

https://developers.line.biz/console/

### 2. 新しいプロバイダーを作成

1. 「Create」ボタンをクリック
2. プロバイダー名を入力（例: 「ACE Express」）
3. 「Create」をクリック

### 3. Messaging API チャネルを作成

1. 「Create a new channel」をクリック
2. 「Messaging API」を選択
3. 必要情報を入力:
   - Channel name: `Carry Note`
   - Channel description: `ドライバー日報Bot`
   - Category: `Business Tools`
   - Subcategory: 任意
4. 利用規約に同意して「Create」

### 4. チャネル設定

#### 4-1. Webhook URL設定

1. チャネル基本設定 → Messaging API設定
2. Webhook URL: 
   ```
   https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/api/line/webhook
   ```
3. 「Verify」で接続確認
4. 「Use webhook」を有効化

#### 4-2. 応答設定

1. Messaging API設定 → LINE Official Account features
2. 「応答メッセージ」→「編集」
3. 以下を設定:
   - 応答メッセージ: **無効**
   - Webhook: **有効**
   - あいさつメッセージ: **有効**（任意）

### 5. 環境変数の設定

サーバーの`.env`ファイルに以下を追加:

```env
# LINE Bot設定
LINE_CHANNEL_SECRET=YOUR_CHANNEL_SECRET
LINE_CHANNEL_ACCESS_TOKEN=YOUR_CHANNEL_ACCESS_TOKEN
```

**取得方法**:
- **Channel Secret**: チャネル基本設定 → Basic settings
- **Channel Access Token**: チャネル基本設定 → Messaging API → Issue

---

## 📝 使い方

### 友だち追加

1. LINE Developers コンソールから「QRコード」を表示
2. ドライバーにQRコードをスキャンしてもらう
3. Botを友だち追加

### 日報の送り方

#### 基本フォーマット

```
ヤマト30
佐川20
ネコポス15
メモ:順調でした
```

#### 書き方のバリエーション

以下の形式すべてに対応しています：

```
✅ ヤマト30
✅ ヤマト 30
✅ ヤマト:30
✅ ヤマト　30
✅ ヤマト宅急便 30
```

#### 複数の配送タイプ

```
ヤマト宅急便 30
佐川急便 20
ネコポス 15
メモ:午前中は雨でした
```

### コマンド

| コマンド | 説明 |
|---------|------|
| `ヘルプ` | 使い方を表示 |
| `フォーマット` | 詳細な書き方を表示 |

---

## 🔗 LINE連携（自動）

### アプリでの登録時

ドライバーがアプリから登録すると、以下の情報が保存されます：

- ドライバーID
- LINE User ID（後で連携）

### LINE User ID の取得

LINE Botに初めてメッセージを送ると、自動的にLINE User IDが保存されます。

---

## 💡 日報送信の流れ

```
1. ドライバーがLINEでメッセージを送信
   ↓
2. Webhookがメッセージを受信
   ↓
3. メッセージを解析（配送タイプと個数）
   ↓
4. 配送タイプをデータベースと照合
   ↓
5. 日報を自動作成・保存
   ↓
6. 確認メッセージを返信
```

---

## 📊 メッセージ解析の仕組み

### パターンマッチング

```javascript
// 正規表現パターン
/^(.+?)[:：\s]*(\d+)$/

例:
"ヤマト30" → タイプ: "ヤマト", 個数: 30
"佐川 20" → タイプ: "佐川", 個数: 20
```

### あいまい一致

配送タイプ名は以下の方法でマッチングされます：

1. **完全一致**: 「ヤマト宅急便」=「ヤマト宅急便」
2. **部分一致**: 「ヤマト」→「ヤマト宅急便」
3. **キーワード**: 「yamato」→「ヤマト宅急便」

### 対応キーワード

| キーワード | マッチする配送タイプ |
|-----------|-------------------|
| ヤマト, yamato, やまと | ヤマト宅急便 |
| 佐川, sagawa, さがわ | 佐川急便 |
| ネコポス, nekopos, ねこぽす | ネコポス |
| 宅急便, takkyubin, たっきゅうびん | ヤマト宅急便 |

---

## ⚙️ API エンドポイント

### Webhook

```
POST /api/line/webhook
```

**リクエスト**: LINE Messaging APIの標準フォーマット

**処理内容**:
1. 署名検証
2. メッセージ解析
3. ドライバー認証
4. 日報作成
5. 確認メッセージ返信

### LINE連携

```
POST /api/line/link
```

**リクエスト**:
```json
{
  "driverId": "driver-xxx",
  "lineUserId": "U1234567890abcdef"
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "LINE連携を設定しました"
}
```

---

## 🎯 返信メッセージ例

### 成功時

```
✅ 日報を受け付けました！

📅 日付: 2026年1月3日 (金)
👤 山田太郎
📦 合計: 65個

• ヤマト宅急便: 30個
• 佐川急便: 20個
• ネコポス: 15個

📝 順調でした
```

### エラー時

```
❌ 配送タイプと個数を認識できませんでした。

例:
ヤマト30
佐川20
メモ:順調でした

「フォーマット」と送信すると詳細を確認できます。
```

### 未登録ドライバー

```
❌ ドライバー登録が見つかりません。

アプリから登録を完了し、LINE連携を設定してください。

🔗 https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/driver_app.html
```

---

## 🔒 セキュリティ

### 署名検証

```javascript
function validateSignature(body, signature, channelSecret) {
    const hash = crypto
        .createHmac('SHA256', channelSecret)
        .update(JSON.stringify(body))
        .digest('base64');
    return hash === signature;
}
```

本番環境では必ず署名検証を有効にしてください。

---

## 🐛 トラブルシューティング

### Webhookエラー

**症状**: メッセージに反応しない

**解決方法**:
1. Webhook URLが正しいか確認
2. 「Use webhook」が有効か確認
3. 「応答メッセージ」が無効か確認
4. サーバーログを確認

### 配送タイプが認識されない

**症状**: 「登録されている配送タイプが見つかりません」

**解決方法**:
1. 管理画面で配送タイプを登録
2. 配送タイプ名を正確に入力
3. 「フォーマット」コマンドで確認

### ドライバーが見つからない

**症状**: 「ドライバー登録が見つかりません」

**解決方法**:
1. アプリから登録を完了
2. LINE User IDが保存されているか確認
3. 再度Botにメッセージを送信

---

## 📚 参考リンク

- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)
- [Webhook](https://developers.line.biz/ja/docs/messaging-api/receiving-messages/)
- [Reply API](https://developers.line.biz/ja/reference/messaging-api/#send-reply-message)

---

## 💡 今後の拡張案

- 📸 写真添付機能
- 📍 位置情報記録
- 📊 日次レポート自動送信
- 🔔 リマインダー機能
- 💬 双方向チャット
