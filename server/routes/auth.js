/**
 * 認証ルート
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ユーザーデータ（本番環境ではデータベースを使用）
// 簡易的なメモリストレージ
const users = new Map();

// 管理者ユーザーを初期化
const initAdmin = async () => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    users.set(adminEmail, {
        id: 'admin-001',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        name: '管理者'
    });
    
    console.log('✅ 管理者アカウントを初期化しました');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
};

initAdmin();

/**
 * ログイン
 */
router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'メールアドレスとパスワードが必要です'
        });
    }
    
    // ユーザーを検索
    const user = users.get(email);
    
    if (!user) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'メールアドレスまたはパスワードが正しくありません'
        });
    }
    
    // パスワードを検証
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'メールアドレスまたはパスワードが正しくありません'
        });
    }
    
    // JWTトークンを生成
    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            driver_id: user.driver_id
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
    );
    
    // セッションにトークンを保存
    req.session.token = token;
    req.session.userId = user.id;
    
    res.json({
        success: true,
        token,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            driver_id: user.driver_id
        }
    });
}));

/**
 * ドライバー登録（管理者が実行）
 */
router.post('/register-driver', authMiddleware, asyncHandler(async (req, res) => {
    const { email, password, driver_id, name } = req.body;
    
    // 管理者チェック
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Forbidden',
            message: '管理者権限が必要です'
        });
    }
    
    if (!email || !password || !driver_id) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'メールアドレス、パスワード、ドライバーIDが必要です'
        });
    }
    
    // ユーザーが既に存在するかチェック
    if (users.has(email)) {
        return res.status(409).json({
            error: 'Conflict',
            message: 'このメールアドレスは既に登録されています'
        });
    }
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // ユーザーを作成
    const user = {
        id: `driver-${Date.now()}`,
        email,
        password: hashedPassword,
        role: 'driver',
        driver_id,
        name: name || 'ドライバー'
    };
    
    users.set(email, user);
    
    res.status(201).json({
        success: true,
        message: 'ドライバーアカウントを作成しました',
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            driver_id: user.driver_id,
            name: user.name
        }
    });
}));

/**
 * ログアウト
 */
router.post('/logout', authMiddleware, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'ログアウトに失敗しました'
            });
        }
        
        res.json({
            success: true,
            message: 'ログアウトしました'
        });
    });
});

/**
 * 現在のユーザー情報取得
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
    const user = users.get(req.user.email);
    
    if (!user) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'ユーザーが見つかりません'
        });
    }
    
    res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        driver_id: user.driver_id
    });
}));

/**
 * パスワード変更
 */
router.post('/change-password', authMiddleware, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            error: 'Bad Request',
            message: '現在のパスワードと新しいパスワードが必要です'
        });
    }
    
    const user = users.get(req.user.email);
    
    if (!user) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'ユーザーが見つかりません'
        });
    }
    
    // 現在のパスワードを検証
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: '現在のパスワードが正しくありません'
        });
    }
    
    // 新しいパスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    res.json({
        success: true,
        message: 'パスワードを変更しました'
    });
}));

module.exports = router;
