/**
 * 認証ミドルウェア
 */

const jwt = require('jsonwebtoken');

/**
 * JWT認証ミドルウェア
 */
const authMiddleware = (req, res, next) => {
    try {
        // トークンを取得（ヘッダーまたはセッション）
        const token = req.headers.authorization?.replace('Bearer ', '') || req.session.token;
        
        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: '認証が必要です'
            });
        }
        
        // トークンを検証
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'トークンが無効です'
        });
    }
};

/**
 * 管理者権限チェックミドルウェア
 */
const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Forbidden',
            message: '管理者権限が必要です'
        });
    }
    next();
};

/**
 * ドライバー専用ミドルウェア
 */
const driverMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'driver') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'ドライバー権限が必要です'
        });
    }
    next();
};

/**
 * ドライバー本人または管理者のみアクセス可能
 */
const ownerOrAdminMiddleware = (req, res, next) => {
    const driverId = req.params.driverId || req.body.driver_id;
    
    if (req.user.role === 'admin') {
        return next();
    }
    
    if (req.user.role === 'driver' && req.user.driver_id === driverId) {
        return next();
    }
    
    return res.status(403).json({
        error: 'Forbidden',
        message: 'アクセス権限がありません'
    });
};

module.exports = {
    authMiddleware,
    adminMiddleware,
    driverMiddleware,
    ownerOrAdminMiddleware
};
