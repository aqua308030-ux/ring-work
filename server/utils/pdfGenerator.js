/**
 * PDF生成ユーティリティ
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * 金額フォーマット
 */
function formatCurrency(amount) {
    return '¥' + Number(amount).toLocaleString('ja-JP');
}

/**
 * 日付フォーマット
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * 給料明細PDFを生成
 */
async function generatePayslipPDF(payslip) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // HTMLコンテンツを生成
        const htmlContent = generatePayslipHTML(payslip);
        
        // HTMLをセット
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });
        
        // PDFを生成
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        });
        
        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

/**
 * 給料明細HTMLを生成
 */
function generatePayslipHTML(payslip) {
    const workDetailsRows = (payslip.work_details || []).map(detail => `
        <tr>
            <td>${detail.name}</td>
            <td style="text-align: center;">${detail.quantity}</td>
            <td style="text-align: right;">${formatCurrency(detail.unit_price)}</td>
            <td style="text-align: right;">${formatCurrency(detail.amount)}</td>
        </tr>
    `).join('');
    
    const deductionsRows = [];
    
    if (payslip.transfer_fee > 0) {
        deductionsRows.push(`
            <tr>
                <td>振込手数料</td>
                <td style="text-align: right;">${formatCurrency(payslip.transfer_fee)}</td>
            </tr>
        `);
    }
    
    if (payslip.insurance_fee > 0) {
        deductionsRows.push(`
            <tr>
                <td>保険料</td>
                <td style="text-align: right;">${formatCurrency(payslip.insurance_fee)}</td>
            </tr>
        `);
    }
    
    if (payslip.vehicle_lease_fee > 0) {
        deductionsRows.push(`
            <tr>
                <td>車両リース代</td>
                <td style="text-align: right;">${formatCurrency(payslip.vehicle_lease_fee)}</td>
            </tr>
        `);
    }
    
    if (payslip.advance_payment > 0) {
        deductionsRows.push(`
            <tr>
                <td>前借り</td>
                <td style="text-align: right;">${formatCurrency(payslip.advance_payment)}</td>
            </tr>
        `);
    }
    
    if (payslip.other_deduction_name && payslip.other_deductions > 0) {
        deductionsRows.push(`
            <tr>
                <td>${payslip.other_deduction_name}</td>
                <td style="text-align: right;">${formatCurrency(payslip.other_deductions)}</td>
            </tr>
        `);
    }
    
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>給料明細書 - ${payslip.driver_name}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm 15mm;
        }
        
        body {
            font-family: 'Noto Sans JP', 'MS PGothic', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 20pt;
            margin-bottom: 10px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 10px;
        }
        
        .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        
        .info-left, .info-right {
            width: 48%;
        }
        
        .info-item {
            margin-bottom: 8px;
        }
        
        .info-item strong {
            display: inline-block;
            width: 120px;
        }
        
        .period {
            background: #f8fafc;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section h2 {
            font-size: 14pt;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid #2563eb;
            color: #2563eb;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        
        table th,
        table td {
            border: 1px solid #ccc;
            padding: 8px;
        }
        
        table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: left;
        }
        
        .total-row {
            background-color: #f8fafc;
            font-weight: bold;
        }
        
        .grand-total {
            background-color: #e0f2fe;
            font-size: 12pt;
            font-weight: bold;
            color: #2563eb;
        }
        
        .notes {
            background: #f8fafc;
            padding: 15px;
            border-radius: 6px;
            white-space: pre-wrap;
        }
        
        .highlight {
            font-size: 14pt;
            color: #2563eb;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>給 料 明 細 書</h1>
    </div>
    
    <div class="info-section">
        <div class="info-left">
            <div class="info-item">
                <strong>御中:</strong> ${payslip.driver_name} 様
            </div>
            <div class="info-item">
                <strong>支払合計金額:</strong> <span class="highlight">${formatCurrency(payslip.net_pay)}</span>
            </div>
        </div>
        <div class="info-right" style="text-align: right;">
            ${payslip.company_name ? `<div>${payslip.company_name}</div>` : ''}
            ${payslip.center_name ? `<div>${payslip.center_name}</div>` : ''}
        </div>
    </div>
    
    <div class="period">
        <strong>${payslip.year}年${payslip.month}月</strong><br>
        集計期間: ${formatDate(payslip.period_start)} 〜 ${formatDate(payslip.period_end)}
    </div>
    
    <div class="section">
        <h2>作業明細</h2>
        <table>
            <thead>
                <tr>
                    <th>配送タイプ</th>
                    <th style="text-align: center; width: 15%;">個数</th>
                    <th style="text-align: right; width: 20%;">単価</th>
                    <th style="text-align: right; width: 25%;">金額</th>
                </tr>
            </thead>
            <tbody>
                ${workDetailsRows}
            </tbody>
        </table>
        
        <table>
            <tr>
                <td style="width: 70%;">内消費税（10%対象）:</td>
                <td style="text-align: right; width: 30%;">${formatCurrency(payslip.consumption_tax)}</td>
            </tr>
            <tr class="grand-total">
                <td>作業合計（税込10%対象）:</td>
                <td style="text-align: right;">${formatCurrency(payslip.work_total)}</td>
            </tr>
        </table>
    </div>
    
    <div class="section">
        <h2>控除明細</h2>
        <table>
            <tbody>
                ${deductionsRows.join('')}
            </tbody>
        </table>
        
        <table>
            <tr>
                <td style="width: 70%;">控除合計:</td>
                <td style="text-align: right; width: 30%;">${formatCurrency(payslip.total_deductions)}</td>
            </tr>
            <tr class="grand-total">
                <td>差引合計金額:</td>
                <td style="text-align: right;">${formatCurrency(payslip.net_pay)}</td>
            </tr>
        </table>
    </div>
    
    ${payslip.notes ? `
    <div class="section">
        <h2>備考</h2>
        <div class="notes">${payslip.notes}</div>
    </div>
    ` : ''}
</body>
</html>
    `;
}

module.exports = {
    generatePayslipPDF
};
