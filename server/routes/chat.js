/**
 * チャット機能のAPIルート
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

// インメモリストレージ（本番環境ではデータベースを使用）
const MESSAGES = new Map();

/**
 * ドライバーのメッセージ一覧を取得
 * GET /api/chat/messages/:driverId
 */
router.get('/messages/:driverId', asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    
    if (!driverId) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'ドライバーIDが必要です'
        });
    }
    
    // ドライバーのメッセージを取得
    const messages = MESSAGES.get(driverId) || [];
    
    res.json({
        driverId,
        messages,
        total: messages.length
    });
}));

/**
 * 新しいメッセージを送信
 * POST /api/chat/messages
 */
router.post('/messages', asyncHandler(async (req, res) => {
    const { driverId, text, sender } = req.body;
    
    // バリデーション
    if (!driverId || !text || !sender) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'driverId、text、senderが必要です'
        });
    }
    
    if (!['driver', 'admin'].includes(sender)) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'senderは "driver" または "admin" である必要があります'
        });
    }
    
    // メッセージを作成
    const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        driverId,
        text,
        sender,
        timestamp: new Date().toISOString()
    };
    
    // ドライバーのメッセージリストを取得または作成
    const messages = MESSAGES.get(driverId) || [];
    messages.push(message);
    MESSAGES.set(driverId, messages);
    
    res.status(201).json({
        success: true,
        message: 'メッセージを送信しました',
        data: message
    });
}));

/**
 * メッセージを既読にする
 * PUT /api/chat/messages/:messageId/read
 */
router.put('/messages/:messageId/read', asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    
    if (!messageId) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'メッセージIDが必要です'
        });
    }
    
    // すべてのドライバーのメッセージから該当メッセージを探す
    let found = false;
    for (const [driverId, messages] of MESSAGES.entries()) {
        const message = messages.find(m => m.id === messageId);
        if (message) {
            message.read = true;
            message.readAt = new Date().toISOString();
            MESSAGES.set(driverId, messages);
            found = true;
            
            return res.json({
                success: true,
                message: 'メッセージを既読にしました',
                data: message
            });
        }
    }
    
    if (!found) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'メッセージが見つかりません'
        });
    }
}));

/**
 * 未読メッセージ数を取得
 * GET /api/chat/unread-count/:driverId
 */
router.get('/unread-count/:driverId', asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    
    if (!driverId) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'ドライバーIDが必要です'
        });
    }
    
    const messages = MESSAGES.get(driverId) || [];
    const unreadCount = messages.filter(m => m.sender === 'driver' && !m.read).length;
    
    res.json({
        driverId,
        unreadCount
    });
}));

/**
 * すべてのドライバーの未読メッセージ数を取得
 * GET /api/chat/unread-counts
 */
router.get('/unread-counts', asyncHandler(async (req, res) => {
    const unreadCounts = {};
    
    for (const [driverId, messages] of MESSAGES.entries()) {
        const unreadCount = messages.filter(m => m.sender === 'driver' && !m.read).length;
        if (unreadCount > 0) {
            unreadCounts[driverId] = unreadCount;
        }
    }
    
    res.json({
        unreadCounts,
        total: Object.keys(unreadCounts).length
    });
}));

module.exports = router;
