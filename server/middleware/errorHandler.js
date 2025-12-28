/**
 * エラーハンドラーミドルウェア
 */

/**
 * グローバルエラーハンドラー
 */
const errorHandler = (err, req, res, next) => {
    console.error('エラー:', err);
    
    // デフォルトのステータスコード
    const statusCode = err.statusCode || 500;
    
    // エラーレスポンス
    res.status(statusCode).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'サーバーエラーが発生しました',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * 非同期ハンドラーラッパー
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    errorHandler,
    asyncHandler
};
