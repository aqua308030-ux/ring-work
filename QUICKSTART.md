# 🎉 ¥0 テスト運用開始ガイド

## ✅ システム起動完了！

おめでとうございます！給料明細管理システムが正常に起動しました。

---

## 🌐 アクセスURL

### **管理画面（フルバージョン）**
```
https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/
```

### **ドライバーポータル**
```
https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/driver-portal
```

### **API エンドポイント**
```
https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/api/
```

---

## 🔐 初期アカウント

### **管理者アカウント**
```
Email: admin@example.com
Password: admin123456
```

このアカウントでログインすると、すべての機能が使えます。

---

## 📝 使い方ガイド

### **ステップ1: 管理画面にアクセス**

1. ブラウザで以下のURLを開く:
   ```
   https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/
   ```

2. 従来通り、以下の機能が使えます:
   - ドライバー管理
   - 配送タイプ管理
   - 給料明細作成
   - 明細一覧

### **ステップ2: PDF生成をテスト**

1. 給料明細を1つ作成
2. 明細一覧で明細をクリック
3. 「印刷」ボタンをクリック
4. **新機能**: ブラウザの印刷ダイアログで「PDFに保存」を選択

**または、API経由でPDF生成:**

```bash
# ログイン
curl -X POST https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123456"}'

# レスポンスからtokenを取得

# PDF生成
curl -X POST https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/api/pdf/generate-payslip \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"payslip":{...}}' \
  --output payslip.pdf
```

### **ステップ3: ドライバーアカウントを作成**

管理画面で管理者としてログイン後、以下のAPIを実行:

```javascript
// ブラウザのコンソールで実行
fetch('https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/api/auth/register-driver', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer <admin-token>'
    },
    body: JSON.stringify({
        email: 'driver@example.com',
        password: 'driver123',
        driver_id: 'driver-001',  // ドライバー管理で登録したID
        name: 'テストドライバー'
    })
})
.then(r => r.json())
.then(console.log);
```

### **ステップ4: ドライバーポータルをテスト**

1. ドライバーポータルにアクセス:
   ```
   https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/driver-portal
   ```

2. 作成したドライバーアカウントでログイン:
   ```
   Email: driver@example.com
   Password: driver123
   ```

3. 自分の明細を閲覧・ダウンロード

### **ステップ5: メール送信をテスト（開発モード）**

現在は開発モードなので、メールは実際には送信されず、ログに出力されます。

```javascript
// 管理画面で実行
fetch('https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/api/email/send-payslip', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer <admin-token>'
    },
    body: JSON.stringify({
        payslip: { /* 明細データ */ },
        driverEmail: 'driver@example.com'
    })
})
.then(r => r.json())
.then(console.log);
```

サーバーログで送信内容を確認できます:
```bash
tail -f /tmp/server.log
```

---

## 🎯 主な機能テスト項目

### ✅ **基本機能（従来通り）**
- [ ] ドライバー登録
- [ ] 配送タイプ登録
- [ ] 給料明細作成
- [ ] 明細一覧表示
- [ ] 印刷機能

### ✨ **新機能（バックエンド）**
- [ ] 管理者ログイン
- [ ] PDF自動生成（API経由）
- [ ] ドライバーアカウント作成
- [ ] ドライバーポータルログイン
- [ ] ドライバー専用明細閲覧
- [ ] PDFダウンロード
- [ ] メール送信（ログ確認）

---

## 🔧 カスタマイズ方法

### **環境変数を変更**

`.env`ファイルを編集:

```bash
# メール設定を本番用に変更
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 管理者パスワードを変更
ADMIN_PASSWORD=your-secure-password
```

変更後、サーバーを再起動:
```bash
cd /home/user/webapp
npm start
```

---

## 📊 動作確認チェックリスト

### **API動作確認**

```bash
# 1. ヘルスチェック
curl https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/health

# 2. ログインテスト
curl -X POST https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123456"}'

# 3. データ取得テスト（要トークン）
curl https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/api/tables/drivers_v3 \
  -H "Authorization: Bearer <token>"
```

---

## 🚨 トラブルシューティング

### **サーバーが起動しない**
```bash
# ログを確認
tail -f /tmp/server.log

# ポートが使用中の場合
lsof -i :3000
kill -9 <PID>
```

### **PDFが生成されない**
- Puppeteerのインストールを確認
- メモリ不足の可能性（大量データの場合）

### **ログインできない**
- ブラウザのCookieをクリア
- 正しいURLを使用しているか確認

---

## 💰 現在のコスト

**月額: ¥0**
- サーバー: Sandbox環境（無料）
- メール: 開発モード（ログ出力のみ）
- データベース: メモリストレージ（無料）
- SSL: 自動付与（無料）

---

## 📈 次のステップ

### **本番環境への移行準備**

1. **データベース導入**
   - PostgreSQL/MySQLのセットアップ
   - データ永続化

2. **メール設定**
   - Gmailアカウントの設定
   - アプリパスワードの取得

3. **VPSへのデプロイ**
   - さくらVPS等の契約
   - ドメインの取得
   - SSL証明書の設定

---

## 📞 サポート

**システムの動作確認が完了したら:**
- 本番環境への移行相談
- カスタマイズのご相談
- 追加機能のご要望

お気軽にお問い合わせください！

---

**テスト運用期間中の制約:**
- データは再起動時にリセットされます
- 大量データの処理には適していません
- メールは実際には送信されません（ログ出力のみ）

**本格運用の際は:**
- データベースの導入（PostgreSQL推奨）
- VPS契約（月額¥1,000〜）
- メール設定の本番化

---

🎉 **テスト運用を開始しましょう！**

まずは上記のURLにアクセスして、システムを試してみてください。
