/**
 * メール送信ユーティリティ
 */

const nodemailer = require('nodemailer');

/**
 * メールトランスポーターを作成
 */
function createTransporter() {
    // 開発環境では、ethereal.email（テスト用）を使用するか、ログに出力
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
        console.log('⚠️  メール送信は開発モードです（実際には送信されません）');
        return nodemailer.createTransport({
            streamTransport: true,
            newline: 'unix'
        });
    }
    
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

/**
 * 給料明細メールを送信
 */
async function sendPayslipEmail({ to, driverName, year, month, pdfBuffer }) {
    const transporter = createTransporter();
    
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to,
        subject: `【給料明細】${year}年${month}月分 - ${driverName}様`,
        html: `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #2563eb, #1e40af);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            background: #f8fafc;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
        }
        .info-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
            margin: 20px 0;
        }
        .info-item {
            margin: 10px 0;
        }
        .info-label {
            font-weight: bold;
            color: #2563eb;
            display: inline-block;
            width: 100px;
        }
        .footer {
            text-align: center;
            color: #64748b;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        .button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 30px;
            border-radius: 6px;
            text-decoration: none;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>給料明細のお知らせ</h1>
    </div>
    
    <div class="content">
        <div class="greeting">
            ${driverName} 様
        </div>
        
        <p>
            いつもお疲れ様です。<br>
            ${year}年${month}月分の給料明細書を添付ファイルにてお送りいたします。
        </p>
        
        <div class="info-box">
            <div class="info-item">
                <span class="info-label">対象期間:</span> ${year}年${month}月
            </div>
            <div class="info-item">
                <span class="info-label">ファイル:</span> PDF形式（添付ファイル）
            </div>
        </div>
        
        <p>
            添付のPDFファイルをご確認ください。<br>
            ご不明な点がございましたら、お気軽にお問い合わせください。
        </p>
    </div>
    
    <div class="footer">
        <p>
            このメールは給料明細管理システムから自動送信されています。<br>
            返信の必要はありません。
        </p>
        <p>
            © ${new Date().getFullYear()} 給料明細管理システム
        </p>
    </div>
</body>
</html>
        `,
        attachments: [
            {
                filename: `給料明細_${year}年${month}月_${driverName}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        
        // 開発環境の場合はログを出力
        if (process.env.NODE_ENV === 'development') {
            console.log('📧 メール送信（開発モード）:');
            console.log(`   To: ${to}`);
            console.log(`   Subject: ${mailOptions.subject}`);
            console.log(`   PDF添付: ${pdfBuffer.length} bytes`);
        }
        
        return info;
    } catch (error) {
        console.error('メール送信エラー:', error);
        throw new Error('メール送信に失敗しました: ' + error.message);
    }
}

/**
 * テストメール送信
 */
async function sendTestEmail(to) {
    const transporter = createTransporter();
    
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to,
        subject: '【テスト】給料明細管理システム メール送信テスト',
        html: `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Noto Sans JP', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #2563eb;
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .content {
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>✅ メール送信テスト成功</h1>
    </div>
    <div class="content">
        <p>給料明細管理システムのメール送信機能が正常に動作しています。</p>
        <p>送信日時: ${new Date().toLocaleString('ja-JP')}</p>
    </div>
</body>
</html>
        `
    };
    
    return await transporter.sendMail(mailOptions);
}

/**
 * トランスポーターの接続確認
 */
async function verifyConnection() {
    const transporter = createTransporter();
    
    try {
        await transporter.verify();
        console.log('✅ メールサーバー接続確認成功');
        return true;
    } catch (error) {
        console.error('❌ メールサーバー接続エラー:', error.message);
        return false;
    }
}

module.exports = {
    sendPayslipEmail,
    sendTestEmail,
    verifyConnection
};
