/**
 * メール送信ルート
 */

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendPayslipEmail } = require('../utils/emailSender');
const { generatePayslipPDF } = require('../utils/pdfGenerator');

const router = express.Router();

/**
 * 給料明細をメール送信
 */
router.post('/send-payslip', asyncHandler(async (req, res) => {
    const { payslip, driverEmail, customMessage } = req.body;
    
    if (!payslip || !driverEmail) {
        return res.status(400).json({
            error: 'Bad Request',
            message: '給料明細データとドライバーのメールアドレスが必要です'
        });
    }
    
    // PDF生成
    const pdfBuffer = await generatePayslipPDF(payslip);
    
    // メール送信
    const result = await sendPayslipEmail({
        to: driverEmail,
        driverName: payslip.driver_name,
        year: payslip.year,
        month: payslip.month,
        pdfBuffer,
        customMessage: customMessage || null
    });
    
    res.json({
        success: true,
        message: 'メールを送信しました',
        messageId: result.messageId
    });
}));

/**
 * 複数のドライバーに一括メール送信
 */
router.post('/send-bulk', asyncHandler(async (req, res) => {
    const { payslips } = req.body;
    
    if (!payslips || !Array.isArray(payslips)) {
        return res.status(400).json({
            error: 'Bad Request',
            message: '給料明細データの配列が必要です'
        });
    }
    
    const results = [];
    const errors = [];
    
    for (const item of payslips) {
        try {
            const { payslip, driverEmail } = item;
            
            // PDF生成
            const pdfBuffer = await generatePayslipPDF(payslip);
            
            // メール送信
            const result = await sendPayslipEmail({
                to: driverEmail,
                driverName: payslip.driver_name,
                year: payslip.year,
                month: payslip.month,
                pdfBuffer
            });
            
            results.push({
                driverName: payslip.driver_name,
                email: driverEmail,
                success: true,
                messageId: result.messageId
            });
        } catch (error) {
            errors.push({
                driverName: item.payslip.driver_name,
                email: item.driverEmail,
                success: false,
                error: error.message
            });
        }
    }
    
    res.json({
        success: errors.length === 0,
        message: `${results.length}件のメールを送信しました（失敗: ${errors.length}件）`,
        results,
        errors
    });
}));

/**
 * テストメール送信
 */
router.post('/test', asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'メールアドレスが必要です'
        });
    }
    
    // テスト用のダミーデータ
    const testPayslip = {
        driver_name: 'テストドライバー',
        year: 2025,
        month: 12,
        work_total: 100000,
        total_deductions: 10000,
        net_pay: 90000
    };
    
    const pdfBuffer = await generatePayslipPDF(testPayslip);
    
    const result = await sendPayslipEmail({
        to: email,
        driverName: testPayslip.driver_name,
        year: testPayslip.year,
        month: testPayslip.month,
        pdfBuffer
    });
    
    res.json({
        success: true,
        message: 'テストメールを送信しました',
        messageId: result.messageId
    });
}));

module.exports = router;
