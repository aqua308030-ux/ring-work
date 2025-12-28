/**
 * PDF生成ルート
 */

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { generatePayslipPDF } = require('../utils/pdfGenerator');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

/**
 * 給料明細PDFを生成
 */
router.post('/generate-payslip', asyncHandler(async (req, res) => {
    const { payslip } = req.body;
    
    if (!payslip) {
        return res.status(400).json({
            error: 'Bad Request',
            message: '給料明細データが必要です'
        });
    }
    
    // PDF生成
    const pdfBuffer = await generatePayslipPDF(payslip);
    
    // ファイル名を生成
    const filename = `payslip_${payslip.driver_name}_${payslip.year}_${payslip.month}.pdf`;
    
    // レスポンスヘッダーを設定
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // PDFを送信
    res.send(pdfBuffer);
}));

/**
 * 給料明細PDFをプレビュー
 */
router.post('/preview-payslip', asyncHandler(async (req, res) => {
    const { payslip } = req.body;
    
    if (!payslip) {
        return res.status(400).json({
            error: 'Bad Request',
            message: '給料明細データが必要です'
        });
    }
    
    // PDF生成
    const pdfBuffer = await generatePayslipPDF(payslip);
    
    // レスポンスヘッダーを設定（インライン表示）
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // PDFを送信
    res.send(pdfBuffer);
}));

/**
 * 複数の給料明細PDFを一括生成（ZIP）
 */
router.post('/generate-bulk', asyncHandler(async (req, res) => {
    const { payslips } = req.body;
    
    if (!payslips || !Array.isArray(payslips)) {
        return res.status(400).json({
            error: 'Bad Request',
            message: '給料明細データの配列が必要です'
        });
    }
    
    // TODO: ZIP生成機能は追加実装可能
    res.status(501).json({
        error: 'Not Implemented',
        message: '一括PDF生成機能は現在開発中です'
    });
}));

module.exports = router;
