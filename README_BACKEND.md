# 軽貨物ドライバー給料明細管理システム V2.2 - バックエンド機能

## 🚀 新機能

このバージョンでは、以下のバックエンド機能が追加されました：

### 1. PDF生成機能
- Puppeteerを使用したサーバーサイドPDF生成
- 印刷に最適化されたフォーマット
- 0円項目の自動非表示

### 2. メール送信機能
- Nodemailerを使用した自動メール送信
- HTML形式のメールテンプレート
- PDF添付ファイル機能

### 3. 認証システム
- JWT（JSON Web Token）による認証
- セッション管理
- 管理者とドライバーのロールベース認証

### 4. ドライバーポータル
- ドライバー専用のログインページ
- 自分の明細のみ閲覧可能
- PDFダウンロード機能

## 📦 インストール

### 必要な環境
- Node.js 16.0.0以上
- npm

### インストール手順

```bash
# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env
# .envファイルを編集して設定を変更

# サーバーを起動
npm start

# 開発モード（自動再起動）
npm run dev
```

## 🔧 環境変数の設定

`.env`ファイルを編集して、以下の設定を変更してください：

```env
# サーバー設定
PORT=3000
NODE_ENV=development

# JWT設定（本番環境では必ず変更してください）
JWT_SECRET=your-secret-key-change-this-in-production-minimum-32-characters
JWT_EXPIRES_IN=7d

# メール設定（Gmail使用例）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Gmailの場合はアプリパスワード

# メール送信者情報
EMAIL_FROM=給料明細システム <your-email@gmail.com>

# 管理者アカウント
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123456
```

### Gmail設定方法

1. Googleアカウントの2段階認証を有効化
2. アプリパスワードを生成: https://myaccount.google.com/apppasswords
3. 生成したパスワードを`SMTP_PASS`に設定

## 🎯 使用方法

### サーバー起動

```bash
npm start
```

サーバーが起動すると、以下のURLでアクセスできます：

- **管理画面**: http://localhost:3000/
- **ドライバーポータル**: http://localhost:3000/driver-portal
- **API**: http://localhost:3000/api/
- **ヘルスチェック**: http://localhost:3000/health

### 初期アカウント

**管理者アカウント:**
- Email: admin@example.com
- Password: admin123456

### API エンドポイント

#### 認証API

```bash
# ログイン
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123456"
}

# レスポンス
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin-001",
    "email": "admin@example.com",
    "role": "admin",
    "name": "管理者"
  }
}

# ドライバー登録（管理者のみ）
POST /api/auth/register-driver
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "driver@example.com",
  "password": "password123",
  "driver_id": "driver-uuid",
  "name": "ドライバー名"
}

# ログアウト
POST /api/auth/logout
Authorization: Bearer <token>
```

#### PDF生成API

```bash
# PDF生成
POST /api/pdf/generate-payslip
Authorization: Bearer <token>
Content-Type: application/json

{
  "payslip": {
    "driver_name": "實方 徹",
    "year": 2025,
    "month": 11,
    "work_total": 339680,
    "total_deductions": 100495,
    "net_pay": 239185,
    ...
  }
}

# レスポンス: PDFファイル（application/pdf）
```

#### メール送信API

```bash
# メール送信
POST /api/email/send-payslip
Authorization: Bearer <token>
Content-Type: application/json

{
  "payslip": { ... },
  "driverEmail": "driver@example.com"
}

# レスポンス
{
  "success": true,
  "message": "メールを送信しました",
  "messageId": "<message-id>"
}

# 一括メール送信
POST /api/email/send-bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "payslips": [
    {
      "payslip": { ... },
      "driverEmail": "driver1@example.com"
    },
    {
      "payslip": { ... },
      "driverEmail": "driver2@example.com"
    }
  ]
}
```

#### ドライバーAPI

```bash
# 自分の明細一覧取得（ドライバーのみ）
GET /api/driver/payslips
Authorization: Bearer <token>

# 自分の情報取得（ドライバーのみ）
GET /api/driver/info
Authorization: Bearer <token>
```

## 🏗️ アーキテクチャ

```
/home/user/webapp/
├── server/
│   ├── index.js                 # メインサーバー
│   ├── routes/
│   │   ├── auth.js              # 認証ルート
│   │   ├── pdf.js               # PDF生成ルート
│   │   ├── email.js             # メール送信ルート
│   │   └── api.js               # APIルート
│   ├── middleware/
│   │   ├── auth.js              # 認証ミドルウェア
│   │   └── errorHandler.js     # エラーハンドラー
│   └── utils/
│       ├── pdfGenerator.js      # PDF生成ユーティリティ
│       └── emailSender.js       # メール送信ユーティリティ
├── index_v2.html                # 管理画面
├── driver_portal.html           # ドライバーポータル
├── package.json                 # 依存関係
└── .env                         # 環境変数
```

## 🔐 セキュリティ

### 実装されているセキュリティ機能

1. **JWT認証**: トークンベースの認証
2. **パスワードハッシュ化**: bcryptjsによる安全なパスワード保管
3. **Helmet**: HTTPヘッダーのセキュリティ強化
4. **CORS**: クロスオリジン制御
5. **レート制限**: API呼び出し回数の制限
6. **ロールベースアクセス制御**: 管理者とドライバーの権限分離

### 本番環境での推奨事項

1. **環境変数の保護**: 
   - `JWT_SECRET`を強力なランダム文字列に変更
   - `SESSION_SECRET`を変更
   - パスワードを変更

2. **HTTPS通信**: 
   - 必ずHTTPSを使用
   - Let's Encrypt等でSSL証明書を取得

3. **データベース**: 
   - 現在はメモリストレージを使用
   - 本番環境ではPostgreSQL/MySQL等を使用

4. **ログ管理**: 
   - アクセスログの記録
   - エラーログの監視

5. **バックアップ**: 
   - 定期的なデータバックアップ

## 🧪 開発モード

開発モードでは、以下の機能が有効です：

- メール送信はログ出力のみ（実際には送信されません）
- エラーメッセージにスタックトレースを含む
- 自動再起動（nodemon使用時）

```bash
# 開発モード起動
npm run dev
```

## 📝 今後の拡張機能

- [ ] データベース統合（PostgreSQL/MySQL）
- [ ] クラウドストレージ統合（S3等）
- [ ] リアルタイム通知（WebSocket）
- [ ] 業務データ自動収集API
- [ ] ダッシュボード機能
- [ ] レポート機能
- [ ] モバイルアプリ対応

## 🐛 トラブルシューティング

### メールが送信されない

1. SMTP設定を確認
2. Gmailの場合はアプリパスワードを使用
3. ファイアウォールでポート587/465が開いているか確認

### PDF生成エラー

1. Puppeteerのインストールを確認: `npm install puppeteer`
2. ChromiumがインストールされているK確認
3. メモリ不足の場合は`--max-old-space-size`を増やす

### 認証エラー

1. JWTトークンが有効期限切れになっていないか確認
2. `JWT_SECRET`が正しく設定されているか確認
3. ブラウザのCookieをクリア

## 📞 サポート

質問やバグ報告は、プロジェクト管理者までお問い合わせください。

---

**開発:** GenSpark AI Developer  
**バージョン:** 2.2.0  
**最終更新:** 2025年12月28日
