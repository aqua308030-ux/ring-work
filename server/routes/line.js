/**
 * LINE Bot APIルート
 * ドライバーがLINEから日報を送信できる機能
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

// メモリストレージをインポート（api.jsから共有）
// 本番環境ではデータベースを使用
const getStorage = () => {
    return require('./api').storage || {
        drivers_v3: new Map(),
        delivery_types: new Map(),
        daily_reports: new Map()
    };
};

/**
 * LINE署名検証
 */
function validateSignature(body, signature, channelSecret) {
    const hash = crypto
        .createHmac('SHA256', channelSecret)
        .update(JSON.stringify(body))
        .digest('base64');
    return hash === signature;
}

/**
 * LINEメッセージをパース
 * 例: "ヤマト30 佐川20 メモ:順調でした"
 */
function parseReportMessage(text) {
    const lines = text.split('\n');
    const workDetails = [];
    let notes = '';
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // メモの検出
        if (trimmed.startsWith('メモ:') || trimmed.startsWith('備考:')) {
            notes = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            continue;
        }
        
        // 配送タイプと個数のパース
        // パターン: "ヤマト30" "佐川 20" "ヤマト宅急便:30"
        const match = trimmed.match(/^(.+?)[:：\s]*(\d+)$/);
        if (match) {
            const typeName = match[1].trim();
            const quantity = parseInt(match[2]);
            
            if (typeName && quantity > 0) {
                workDetails.push({
                    type_name: typeName,
                    quantity: quantity
                });
            }
        }
    }
    
    return { workDetails, notes };
}

/**
 * 配送タイプ名から配送タイプを検索（あいまい一致）
 */
function findDeliveryType(typeName, deliveryTypes) {
    const normalized = typeName.toLowerCase();
    
    // 完全一致
    let match = deliveryTypes.find(t => 
        t.name.toLowerCase() === normalized
    );
    if (match) return match;
    
    // 部分一致
    match = deliveryTypes.find(t => 
        t.name.toLowerCase().includes(normalized) || 
        normalized.includes(t.name.toLowerCase())
    );
    if (match) return match;
    
    // キーワードマッチング
    const keywords = {
        'ヤマト': ['yamato', 'やまと', 'ヤマト'],
        '佐川': ['sagawa', 'さがわ', '佐川'],
        'ネコポス': ['nekopos', 'ねこぽす', 'ネコポス'],
        '宅急便': ['takkyubin', 'たっきゅうびん']
    };
    
    for (const [key, patterns] of Object.entries(keywords)) {
        if (patterns.some(p => normalized.includes(p.toLowerCase()))) {
            match = deliveryTypes.find(t => t.name.includes(key));
            if (match) return match;
        }
    }
    
    return null;
}

/**
 * LINEユーザーIDからドライバーを検索
 */
function findDriverByLineId(lineUserId, storage) {
    const drivers = Array.from(storage.drivers_v3.values());
    return drivers.find(d => d.line_user_id === lineUserId);
}

/**
 * Webhook endpoint
 * POST /api/line/webhook
 */
router.post('/webhook', asyncHandler(async (req, res) => {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    
    // 署名検証（本番環境では必須）
    if (channelSecret) {
        const signature = req.headers['x-line-signature'];
        if (!validateSignature(req.body, signature, channelSecret)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
    }
    
    const events = req.body.events || [];
    const storage = getStorage();
    
    for (const event of events) {
        if (event.type !== 'message' || event.message.type !== 'text') {
            continue;
        }
        
        const lineUserId = event.source.userId;
        const messageText = event.message.text;
        
        // ドライバーを検索
        const driver = findDriverByLineId(lineUserId, storage);
        
        if (!driver) {
            // 未登録ユーザーへの案内
            await sendLineReply(event.replyToken, {
                type: 'text',
                text: '❌ ドライバー登録が見つかりません。\n\nアプリから登録を完了し、LINE連携を設定してください。\n\n🔗 https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/driver_app.html'
            });
            continue;
        }
        
        // ヘルプコマンド
        if (messageText === 'ヘルプ' || messageText === 'help' || messageText === '？') {
            await sendLineReply(event.replyToken, {
                type: 'text',
                text: generateHelpMessage()
            });
            continue;
        }
        
        // 日報フォーマットコマンド
        if (messageText === 'フォーマット' || messageText === 'format') {
            await sendLineReply(event.replyToken, {
                type: 'text',
                text: generateFormatMessage()
            });
            continue;
        }
        
        // 日報をパース
        const { workDetails, notes } = parseReportMessage(messageText);
        
        if (workDetails.length === 0) {
            await sendLineReply(event.replyToken, {
                type: 'text',
                text: '❌ 配送タイプと個数を認識できませんでした。\n\n例:\nヤマト30\n佐川20\nメモ:順調でした\n\n「フォーマット」と送信すると詳細を確認できます。'
            });
            continue;
        }
        
        // 配送タイプをマッチング
        const deliveryTypes = Array.from(storage.delivery_types.values()).filter(t => t.active);
        const matchedDetails = [];
        const unmatchedTypes = [];
        
        for (const detail of workDetails) {
            const deliveryType = findDeliveryType(detail.type_name, deliveryTypes);
            
            if (deliveryType) {
                matchedDetails.push({
                    delivery_type_id: deliveryType.id,
                    delivery_type_name: deliveryType.name,
                    quantity: detail.quantity,
                    unit_price: deliveryType.unit_price,
                    amount: deliveryType.unit_price * detail.quantity
                });
            } else {
                unmatchedTypes.push(detail.type_name);
            }
        }
        
        if (matchedDetails.length === 0) {
            await sendLineReply(event.replyToken, {
                type: 'text',
                text: `❌ 登録されている配送タイプが見つかりませんでした。\n\n認識できなかったタイプ:\n${unmatchedTypes.map(t => `• ${t}`).join('\n')}\n\n登録済みの配送タイプ:\n${deliveryTypes.map(t => `• ${t.name}`).join('\n')}`
            });
            continue;
        }
        
        // 日報を保存
        const today = new Date().toISOString().split('T')[0];
        const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const reportData = {
            id: reportId,
            driver_id: driver.id,
            driver_name: driver.name,
            date: today,
            work_details: matchedDetails,
            notes: notes || '',
            source: 'line',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        storage.daily_reports.set(reportId, reportData);
        
        // 確認メッセージ
        const totalQuantity = matchedDetails.reduce((sum, d) => sum + d.quantity, 0);
        const confirmMessage = `✅ 日報を受け付けました！\n\n📅 日付: ${formatDate(today)}\n👤 ${driver.name}\n📦 合計: ${totalQuantity}個\n\n${matchedDetails.map(d => `• ${d.delivery_type_name}: ${d.quantity}個`).join('\n')}${notes ? `\n\n📝 ${notes}` : ''}${unmatchedTypes.length > 0 ? `\n\n⚠️ 以下は登録されていません:\n${unmatchedTypes.map(t => `• ${t}`).join('\n')}` : ''}`;
        
        await sendLineReply(event.replyToken, {
            type: 'text',
            text: confirmMessage
        });
    }
    
    res.status(200).json({ success: true });
}));

/**
 * LINE返信メッセージ送信
 */
async function sendLineReply(replyToken, message) {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!channelAccessToken) {
        console.log('LINE_CHANNEL_ACCESS_TOKEN not set, skipping reply');
        return;
    }
    
    try {
        const response = await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelAccessToken}`
            },
            body: JSON.stringify({
                replyToken,
                messages: [message]
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error('LINE API error:', error);
        }
    } catch (error) {
        console.error('Failed to send LINE reply:', error);
    }
}

/**
 * ヘルプメッセージ生成
 */
function generateHelpMessage() {
    return `📚 Carry Note - 日報送信ガイド

【日報の送り方】
配送タイプと個数を1行ずつ書いて送信してください。

例:
ヤマト30
佐川20
ネコポス15
メモ:順調でした

【書き方のコツ】
• 配送タイプ名と個数を書く
• 「:」や空白で区切ってもOK
• メモは「メモ:」で始める

【コマンド】
• ヘルプ - このメッセージ
• フォーマット - 詳細な書き方

🔗 アプリはこちら
https://3000-iaowouv5k70l3ek28t4e4-b9b802c4.sandbox.novita.ai/driver_app.html`;
}

/**
 * フォーマットメッセージ生成
 */
function generateFormatMessage() {
    return `📝 日報フォーマット

【基本形式】
配送タイプ名 個数
配送タイプ名 個数
メモ:任意のメモ

【書き方の例】
✅ ヤマト30
✅ ヤマト宅急便 30
✅ ヤマト:30
✅ ヤマト　30

【複数の配送タイプ】
ヤマト宅急便 30
佐川急便 20
ネコポス 15
メモ:午前中は雨でした

【注意】
• 配送タイプ名は登録済みのものを使用
• 個数は半角数字
• 改行で複数の配送タイプを指定可能`;
}

/**
 * 日付フォーマット
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日 (${weekday})`;
}

/**
 * LINE連携設定エンドポイント
 * POST /api/line/link
 */
router.post('/link', asyncHandler(async (req, res) => {
    const { driverId, lineUserId } = req.body;
    
    if (!driverId || !lineUserId) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'driverIdとlineUserIdが必要です'
        });
    }
    
    const storage = getStorage();
    const driver = storage.drivers_v3.get(driverId);
    
    if (!driver) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'ドライバーが見つかりません'
        });
    }
    
    // LINE User IDを保存
    driver.line_user_id = lineUserId;
    storage.drivers_v3.set(driverId, driver);
    
    res.json({
        success: true,
        message: 'LINE連携を設定しました'
    });
}));

module.exports = router;
