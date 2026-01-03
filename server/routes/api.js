/**
 * APIルート
 */

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware, ownerOrAdminMiddleware } = require('../middleware/auth');

const router = express.Router();

// 簡易的なメモリストレージ（本番環境では実際のデータベースを使用）
const storage = {
    drivers_v3: new Map(),
    delivery_types: new Map(),
    payslips_v4: new Map(),
    companies: new Map(),
    daily_reports: new Map()
};

// 初期企業コードを生成
const initializeCompanies = () => {
    if (storage.companies.size === 0) {
        const defaultCompany = {
            id: 'company-default',
            code: 'ACEexpress',
            name: 'ACE Express',
            created_at: new Date().toISOString()
        };
        storage.companies.set(defaultCompany.id, defaultCompany);
        console.log(`✅ デフォルト企業コードを生成しました: ${defaultCompany.code}`);
    }
};

initializeCompanies();

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
    const allPayslips = Array.from(storage.payslips_v4.values());
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
    const driver = storage.drivers_v3.get(driverId);
    
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

/**
 * 企業コード検証
 * POST /api/verify-company-code
 */
router.post('/verify-company-code', asyncHandler(async (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({
            error: 'Bad Request',
            message: '企業コードが必要です'
        });
    }
    
    // 企業コードを検索
    const companies = Array.from(storage.companies.values());
    const company = companies.find(c => c.code === code.toUpperCase());
    
    if (!company) {
        return res.status(404).json({
            error: 'Not Found',
            message: '企業コードが見つかりません'
        });
    }
    
    res.json({
        success: true,
        company: {
            id: company.id,
            name: company.name,
            code: company.code
        }
    });
}));

/**
 * ドライバー自己登録
 * POST /api/driver-register
 */
router.post('/driver-register', asyncHandler(async (req, res) => {
    const { 
        companyCode, 
        name, 
        phone, 
        email, 
        vehicleNumber,
        vehicleOwnership,
        insuranceDocument,
        insuranceExpiry,
        inspectionDocument,
        inspectionExpiry,
        liabilityDocument,
        liabilityExpiry
    } = req.body;
    
    // バリデーション
    if (!companyCode || !name || !phone || !vehicleOwnership) {
        return res.status(400).json({
            error: 'Bad Request',
            message: '企業コード、氏名、電話番号、車両区分は必須です'
        });
    }
    
    // 企業コード検証
    const companies = Array.from(storage.companies.values());
    const company = companies.find(c => c.code === companyCode.toUpperCase());
    
    if (!company) {
        return res.status(404).json({
            error: 'Not Found',
            message: '企業コードが見つかりません'
        });
    }
    
    // ドライバーIDを生成
    const driverId = `driver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // ドライバーデータを作成
    const driverData = {
        id: driverId,
        company_id: company.id,
        name,
        phone,
        email: email || '',
        vehicle_number: vehicleNumber || '',
        active: true,
        has_lease: vehicleOwnership === 'lease',
        vehicle_ownership: vehicleOwnership,
        insurance_fee: 0,
        vehicle_lease_fee: 0,
        self_registered: true,
        registered_at: new Date().toISOString()
    };
    
    // 個人所有の場合、書類情報を追加
    if (vehicleOwnership === 'owned') {
        driverData.documents = {
            insurance: {
                file: insuranceDocument || null,
                expiry: insuranceExpiry || null
            },
            inspection: {
                file: inspectionDocument || null,
                expiry: inspectionExpiry || null
            },
            liability: {
                file: liabilityDocument || null,
                expiry: liabilityExpiry || null
            }
        };
    }
    
    // ドライバーを登録
    storage.drivers_v3.set(driverId, driverData);
    
    res.status(201).json({
        success: true,
        message: 'ドライバー登録が完了しました',
        driver: {
            id: driverId,
            name,
            phone,
            email,
            vehicle_number: vehicleNumber,
            vehicle_ownership: vehicleOwnership
        }
    });
}));

/**
 * 日報登録
 * POST /api/daily-reports
 */
router.post('/daily-reports', asyncHandler(async (req, res) => {
    const { driverId, date, workDetails, notes } = req.body;
    
    // バリデーション
    if (!driverId || !date || !workDetails) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'ドライバーID、日付、作業明細は必須です'
        });
    }
    
    // ドライバーの存在確認
    const driver = storage.drivers_v3.get(driverId);
    if (!driver) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'ドライバーが見つかりません'
        });
    }
    
    // 日報IDを生成
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 日報データを作成
    const reportData = {
        id: reportId,
        driver_id: driverId,
        driver_name: driver.name,
        date,
        work_details: workDetails,
        notes: notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    // 日報を保存
    storage.daily_reports.set(reportId, reportData);
    
    res.status(201).json({
        success: true,
        message: '日報を登録しました',
        report: reportData
    });
}));

/**
 * 日報一覧取得（ドライバー用）
 * GET /api/daily-reports/:driverId
 */
router.get('/daily-reports/:driverId', asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    
    if (!driverId) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'ドライバーIDが必要です'
        });
    }
    
    // ドライバーの日報を取得
    const allReports = Array.from(storage.daily_reports.values());
    const driverReports = allReports.filter(r => r.driver_id === driverId);
    
    // 日付の降順でソート
    driverReports.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
        items: driverReports,
        total: driverReports.length
    });
}));

module.exports = router;
