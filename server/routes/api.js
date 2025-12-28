/**
 * APIルート
 */

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware, ownerOrAdminMiddleware } = require('../middleware/auth');

const router = express.Router();

// 簡易的なメモリストレージ（本番環境では実際のデータベースを使用）
const storage = {
    drivers: new Map(),
    delivery_types: new Map(),
    payslips: new Map()
};

/**
 * データ取得（汎用）
 */
router.get('/tables/:tableName', asyncHandler(async (req, res) => {
    const { tableName } = req.params;
    const table = storage[tableName];
    
    if (!table) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'テーブルが見つかりません'
        });
    }
    
    const items = Array.from(table.values());
    
    res.json({
        items,
        total: items.length
    });
}));

/**
 * データ作成（汎用）
 */
router.post('/tables/:tableName', asyncHandler(async (req, res) => {
    const { tableName } = req.params;
    const data = req.body;
    const table = storage[tableName];
    
    if (!table) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'テーブルが見つかりません'
        });
    }
    
    if (!data.id) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'IDが必要です'
        });
    }
    
    table.set(data.id, data);
    
    res.status(201).json(data);
}));

/**
 * データ更新（汎用）
 */
router.put('/tables/:tableName/:id', asyncHandler(async (req, res) => {
    const { tableName, id } = req.params;
    const data = req.body;
    const table = storage[tableName];
    
    if (!table) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'テーブルが見つかりません'
        });
    }
    
    if (!table.has(id)) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'データが見つかりません'
        });
    }
    
    table.set(id, { ...data, id });
    
    res.json(table.get(id));
}));

/**
 * データ削除（汎用）
 */
router.delete('/tables/:tableName/:id', asyncHandler(async (req, res) => {
    const { tableName, id } = req.params;
    const table = storage[tableName];
    
    if (!table) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'テーブルが見つかりません'
        });
    }
    
    if (!table.has(id)) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'データが見つかりません'
        });
    }
    
    table.delete(id);
    
    res.status(204).send();
}));

/**
 * ドライバー専用：自分の明細一覧取得
 */
router.get('/driver/payslips', authMiddleware, asyncHandler(async (req, res) => {
    if (req.user.role !== 'driver') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'ドライバー権限が必要です'
        });
    }
    
    const driverId = req.user.driver_id;
    const allPayslips = Array.from(storage.payslips.values());
    const driverPayslips = allPayslips.filter(p => p.driver_id === driverId);
    
    res.json({
        items: driverPayslips,
        total: driverPayslips.length
    });
}));

/**
 * ドライバー専用：自分の情報取得
 */
router.get('/driver/info', authMiddleware, asyncHandler(async (req, res) => {
    if (req.user.role !== 'driver') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'ドライバー権限が必要です'
        });
    }
    
    const driverId = req.user.driver_id;
    const driver = storage.drivers.get(driverId);
    
    if (!driver) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'ドライバー情報が見つかりません'
        });
    }
    
    // センシティブな情報を除外
    const { bank_name, branch_name, account_number, ...safeInfo } = driver;
    
    res.json(safeInfo);
}));

module.exports = router;
