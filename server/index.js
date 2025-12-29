/**
 * 軽貨物ドライバー給料明細管理システム
 * バックエンドサーバー
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');

// ルートのインポート
const authRoutes = require('./routes/auth');
const pdfRoutes = require('./routes/pdf');
const emailRoutes = require('./routes/email');
const chatRoutes = require('./routes/chat');
const apiRoutes = require('./routes/api');

// ミドルウェアのインポート
const { authMiddleware } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// セキュリティミドルウェア
app.use(helmet({
    contentSecurityPolicy: false, // 開発環境用
}));

// CORS設定
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8000',
    credentials: true
}));

// レート制限
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'リクエストが多すぎます。しばらくしてから再試行してください。'
});
app.use('/api/', limiter);

// ボディパーサー
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// セッション設定
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7日間
    }
}));

// 静的ファイル配信
app.use(express.static(path.join(__dirname, '..')));

// ルート設定
app.use('/api/auth', authRoutes);
app.use('/api/pdf', authMiddleware, pdfRoutes);
app.use('/api/email', authMiddleware, emailRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', apiRoutes);

// ヘルスチェック
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// ルートパス
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index_v2.html'));
});

// ドライバーポータル
app.get('/driver-portal', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'driver_portal.html'));
});

// エラーハンドラー
app.use(errorHandler);

// 404ハンドラー
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: '指定されたリソースが見つかりません'
    });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🚀 サーバーが起動しました: http://localhost:${PORT}`);
    console.log(`📊 環境: ${process.env.NODE_ENV}`);
    console.log(`📧 メール機能: ${process.env.SMTP_HOST ? '有効' : '無効'}`);
    console.log(`🔒 認証機能: 有効`);
    console.log(`📄 PDF生成機能: 有効`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
    console.log('SIGTERMを受信しました。サーバーを終了します...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINTを受信しました。サーバーを終了します...');
    process.exit(0);
});
