/**
 * 軽貨物ドライバー給料明細管理システム V2.2
 * JavaScript アプリケーション
 */

// ==================== 定数 ====================
const API_BASE_URL = '/api/tables';
const TABLES = {
    DRIVERS: 'drivers_v3',
    DELIVERY_TYPES: 'delivery_types',
    PAYSLIPS: 'payslips_v4'
};

// ==================== グローバル変数 ====================
let currentDrivers = [];
let currentDeliveryTypes = [];
let currentPayslips = [];
let selectedPayslipId = null;

// ==================== ユーティリティ関数 ====================

/**
 * UUID生成
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

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
 * モーダル表示
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * モーダル非表示
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * タブ切り替え
 */
function switchTab(tabName) {
    // すべてのタブボタンとコンテンツを非アクティブに
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 選択されたタブをアクティブに
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    document.getElementById(`${tabName}-tab`)?.classList.add('active');
}

// ==================== API関数 ====================

/**
 * データ取得
 */
async function fetchData(tableName, params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}/${tableName}${queryString ? '?' + queryString : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.items || data || [];
    } catch (error) {
        console.error('データ取得エラー:', error);
        alert('データの取得に失敗しました: ' + error.message);
        return [];
    }
}

/**
 * データ作成
 */
async function createData(tableName, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/${tableName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('データ作成エラー:', error);
        alert('データの作成に失敗しました: ' + error.message);
        throw error;
    }
}

/**
 * データ更新
 */
async function updateData(tableName, id, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/${tableName}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('データ更新エラー:', error);
        alert('データの更新に失敗しました: ' + error.message);
        throw error;
    }
}

/**
 * データ削除
 */
async function deleteData(tableName, id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${tableName}/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return true;
    } catch (error) {
        console.error('データ削除エラー:', error);
        alert('データの削除に失敗しました: ' + error.message);
        throw error;
    }
}

// ==================== ドライバー管理 ====================

/**
 * ドライバー一覧読み込み
 */
async function loadDrivers() {
    currentDrivers = await fetchData(TABLES.DRIVERS, { page: 1, limit: 100 });
    renderDriversList();
    updateDriverSelects();
}

/**
 * ドライバー一覧表示
 */
function renderDriversList() {
    const container = document.getElementById('drivers-list');
    if (!container) return;
    
    if (currentDrivers.length === 0) {
        container.innerHTML = '<p class="text-center">登録されているドライバーはありません</p>';
        return;
    }
    
    container.innerHTML = currentDrivers
        .filter(driver => driver.active !== false)
        .map(driver => `
            <div class="card fade-in">
                <div class="card-header">
                    <div class="card-title">${driver.name || '名前未設定'}</div>
                    <div class="card-actions">
                        <button class="icon-btn" onclick="editDriver('${driver.id}')" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="icon-btn danger" onclick="deleteDriver('${driver.id}')" title="削除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${driver.phone ? `<div class="card-info"><span>電話:</span> <span>${driver.phone}</span></div>` : ''}
                    ${driver.email ? `<div class="card-info"><span>Email:</span> <span>${driver.email}</span></div>` : ''}
                    ${driver.vehicle_number ? `<div class="card-info"><span>車両:</span> <span>${driver.vehicle_number}</span></div>` : ''}
                    ${driver.has_lease ? '<div class="card-info"><span class="highlight">リース契約あり</span></div>' : ''}
                </div>
            </div>
        `).join('');
}

/**
 * ドライバーセレクト更新
 */
function updateDriverSelects() {
    // driver-select (datalist) の更新
    const driverInput = document.getElementById('driver-select');
    const driverList = document.getElementById('driver-list');
    if (driverInput && driverList) {
        const currentValue = driverInput.value;
        driverList.innerHTML = currentDrivers
            .filter(driver => driver.active !== false)
            .map(driver => `<option value="${driver.name}" data-id="${driver.id}"></option>`)
            .join('');
        if (currentValue) {
            driverInput.value = currentValue;
        }
    }
    
    // filter-driver (select) の更新
    const filterSelect = document.getElementById('filter-driver');
    if (filterSelect) {
        const currentValue = filterSelect.value;
        filterSelect.innerHTML = `<option value="">すべて</option>` +
            currentDrivers
                .filter(driver => driver.active !== false)
                .map(driver => `<option value="${driver.id}">${driver.name}</option>`)
                .join('');
        if (currentValue) {
            filterSelect.value = currentValue;
        }
    }
}

/**
 * ドライバー追加ボタン
 */
function openAddDriverModal() {
    document.getElementById('driver-modal-title').textContent = 'ドライバー登録';
    document.getElementById('driver-form').reset();
    document.getElementById('driver-id').value = '';
    document.getElementById('lease-details').style.display = 'none';
    showModal('driver-modal');
}

/**
 * ドライバー編集
 */
async function editDriver(id) {
    const driver = currentDrivers.find(d => d.id === id);
    if (!driver) return;
    
    document.getElementById('driver-modal-title').textContent = 'ドライバー編集';
    document.getElementById('driver-id').value = driver.id;
    document.getElementById('driver-name').value = driver.name || '';
    document.getElementById('driver-phone').value = driver.phone || '';
    document.getElementById('driver-email').value = driver.email || '';
    document.getElementById('bank-name').value = driver.bank_name || '';
    document.getElementById('branch-name').value = driver.branch_name || '';
    document.getElementById('account-type').value = driver.account_type || '';
    document.getElementById('account-number').value = driver.account_number || '';
    document.getElementById('account-holder').value = driver.account_holder || '';
    document.getElementById('has-lease').checked = driver.has_lease || false;
    document.getElementById('insurance-fee-input').value = driver.insurance_fee || 0;
    document.getElementById('vehicle-lease-fee-input').value = driver.vehicle_lease_fee || 0;
    document.getElementById('vehicle-number').value = driver.vehicle_number || '';
    document.getElementById('driver-notes').value = driver.notes || '';
    
    document.getElementById('lease-details').style.display = driver.has_lease ? 'block' : 'none';
    
    showModal('driver-modal');
}

/**
 * ドライバー削除
 */
async function deleteDriver(id) {
    const driver = currentDrivers.find(d => d.id === id);
    if (!driver) return;
    
    if (!confirm(`${driver.name}を削除してもよろしいですか？`)) {
        return;
    }
    
    try {
        await deleteData(TABLES.DRIVERS, id);
        alert('ドライバーを削除しました');
        await loadDrivers();
    } catch (error) {
        // エラーは既にalertで表示済み
    }
}

/**
 * ドライバーフォーム送信
 */
async function handleDriverFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('driver-id').value;
    const driverData = {
        id: id || generateUUID(),
        name: document.getElementById('driver-name').value,
        phone: document.getElementById('driver-phone').value,
        email: document.getElementById('driver-email').value,
        bank_name: document.getElementById('bank-name').value,
        branch_name: document.getElementById('branch-name').value,
        account_type: document.getElementById('account-type').value,
        account_number: document.getElementById('account-number').value,
        account_holder: document.getElementById('account-holder').value,
        has_lease: document.getElementById('has-lease').checked,
        insurance_fee: Number(document.getElementById('insurance-fee-input').value) || 0,
        vehicle_lease_fee: Number(document.getElementById('vehicle-lease-fee-input').value) || 0,
        vehicle_number: document.getElementById('vehicle-number').value,
        notes: document.getElementById('driver-notes').value,
        active: true
    };
    
    try {
        if (id) {
            await updateData(TABLES.DRIVERS, id, driverData);
            alert('ドライバー情報を更新しました');
        } else {
            await createData(TABLES.DRIVERS, driverData);
            alert('ドライバーを登録しました');
        }
        
        hideModal('driver-modal');
        await loadDrivers();
    } catch (error) {
        // エラーは既にalertで表示済み
    }
}

// ==================== 配送タイプ管理 ====================

/**
 * 配送タイプ一覧読み込み
 */
async function loadDeliveryTypes() {
    currentDeliveryTypes = await fetchData(TABLES.DELIVERY_TYPES);
    renderDeliveryTypesList();
}

/**
 * 配送タイプ一覧表示
 */
function renderDeliveryTypesList() {
    const container = document.getElementById('delivery-types-list');
    if (!container) return;
    
    if (currentDeliveryTypes.length === 0) {
        container.innerHTML = '<p class="text-center">登録されている配送タイプはありません</p>';
        return;
    }
    
    container.innerHTML = currentDeliveryTypes
        .filter(type => type.active !== false)
        .map(type => `
            <div class="card fade-in">
                <div class="card-header">
                    <div class="card-title">${type.name || '名前未設定'}</div>
                    <div class="card-actions">
                        <button class="icon-btn" onclick="editDeliveryType('${type.id}')" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="icon-btn danger" onclick="deleteDeliveryType('${type.id}')" title="削除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-info">
                        <span>単価:</span>
                        <strong class="highlight">${formatCurrency(type.unit_price)}/個</strong>
                    </div>
                </div>
            </div>
        `).join('');
}

/**
 * 配送タイプ追加ボタン
 */
function openAddDeliveryTypeModal() {
    document.getElementById('delivery-type-modal-title').textContent = '配送タイプ登録';
    document.getElementById('delivery-type-form').reset();
    document.getElementById('delivery-type-id').value = '';
    showModal('delivery-type-modal');
}

/**
 * 配送タイプ編集
 */
async function editDeliveryType(id) {
    const type = currentDeliveryTypes.find(t => t.id === id);
    if (!type) return;
    
    document.getElementById('delivery-type-modal-title').textContent = '配送タイプ編集';
    document.getElementById('delivery-type-id').value = type.id;
    document.getElementById('delivery-type-name').value = type.name || '';
    document.getElementById('unit-price').value = type.unit_price || 0;
    
    showModal('delivery-type-modal');
}

/**
 * 配送タイプ削除
 */
async function deleteDeliveryType(id) {
    const type = currentDeliveryTypes.find(t => t.id === id);
    if (!type) return;
    
    if (!confirm(`${type.name}を削除してもよろしいですか？`)) {
        return;
    }
    
    try {
        await deleteData(TABLES.DELIVERY_TYPES, id);
        alert('配送タイプを削除しました');
        await loadDeliveryTypes();
    } catch (error) {
        // エラーは既にalertで表示済み
    }
}

/**
 * 配送タイプフォーム送信
 */
async function handleDeliveryTypeFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('delivery-type-id').value;
    const typeData = {
        id: id || generateUUID(),
        name: document.getElementById('delivery-type-name').value,
        unit_price: Number(document.getElementById('unit-price').value) || 0,
        active: true
    };
    
    try {
        if (id) {
            await updateData(TABLES.DELIVERY_TYPES, id, typeData);
            alert('配送タイプを更新しました');
        } else {
            await createData(TABLES.DELIVERY_TYPES, typeData);
            alert('配送タイプを登録しました');
        }
        
        hideModal('delivery-type-modal');
        await loadDeliveryTypes();
        updateWorkDetailsContainer();
    } catch (error) {
        // エラーは既にalertで表示済み
    }
}

// ==================== 給料明細作成 ====================

/**
 * 作業明細コンテナ更新
 */
function updateWorkDetailsContainer() {
    const container = document.getElementById('work-details-container');
    if (!container) return;
    
    const activeTypes = currentDeliveryTypes.filter(type => type.active !== false);
    
    if (activeTypes.length === 0) {
        container.innerHTML = '<p class="text-center">配送タイプを先に登録してください</p>';
        return;
    }
    
    // 既存の作業明細行を保持
    const existingRows = Array.from(container.querySelectorAll('.work-detail-row'));
    
    if (existingRows.length === 0) {
        // 初回または全削除後: 全配送タイプの行を追加
        container.innerHTML = activeTypes.map(type => createWorkDetailRow(type.id, type.name, type.unit_price)).join('');
    }
}

/**
 * 作業明細行を作成
 */
function createWorkDetailRow(typeId = '', typeName = '', unitPrice = 0) {
    const rowId = generateUUID();
    const types = currentDeliveryTypes.filter(type => type.active !== false);
    
    return `
        <div class="work-detail-row" data-row-id="${rowId}">
            <div class="form-group">
                <label>配送タイプ</label>
                <select class="delivery-type-select" data-row-id="${rowId}">
                    <option value="">選択してください</option>
                    ${types.map(type => `
                        <option value="${type.id}" data-price="${type.unit_price}" ${type.id === typeId ? 'selected' : ''}>
                            ${type.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>個数</label>
                <input type="number" class="quantity-input" data-row-id="${rowId}" min="0" value="0">
            </div>
            <div class="form-group">
                <label>単価（円/個）</label>
                <input type="number" class="unit-price-input" data-row-id="${rowId}" value="${unitPrice}" readonly>
            </div>
            <div class="form-group">
                <label>小計（円）</label>
                <input type="number" class="amount-input" data-row-id="${rowId}" value="0" readonly>
            </div>
            <button type="button" class="remove-btn" onclick="removeWorkDetailRow('${rowId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

/**
 * 作業明細行を追加
 */
function addWorkDetailRow() {
    const container = document.getElementById('work-details-container');
    if (!container) return;
    
    const newRow = createWorkDetailRow();
    container.insertAdjacentHTML('beforeend', newRow);
    
    // イベントリスナーを再設定
    setupWorkDetailEventListeners();
}

/**
 * 作業明細行を削除
 */
function removeWorkDetailRow(rowId) {
    const row = document.querySelector(`[data-row-id="${rowId}"]`);
    if (row) {
        row.remove();
        calculatePayslip();
    }
}

/**
 * 作業明細イベントリスナー設定
 */
function setupWorkDetailEventListeners() {
    // 配送タイプ変更時
    document.querySelectorAll('.delivery-type-select').forEach(select => {
        select.removeEventListener('change', handleDeliveryTypeChange);
        select.addEventListener('change', handleDeliveryTypeChange);
    });
    
    // 個数変更時
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.removeEventListener('input', handleQuantityChange);
        input.addEventListener('input', handleQuantityChange);
    });
}

/**
 * 配送タイプ変更ハンドラ
 */
function handleDeliveryTypeChange(e) {
    const rowId = e.target.dataset.rowId;
    const selectedOption = e.target.options[e.target.selectedIndex];
    const unitPrice = selectedOption.dataset.price || 0;
    
    const unitPriceInput = document.querySelector(`.unit-price-input[data-row-id="${rowId}"]`);
    if (unitPriceInput) {
        unitPriceInput.value = unitPrice;
    }
    
    calculateRowAmount(rowId);
}

/**
 * 個数変更ハンドラ
 */
function handleQuantityChange(e) {
    const rowId = e.target.dataset.rowId;
    calculateRowAmount(rowId);
}

/**
 * 行の金額計算
 */
function calculateRowAmount(rowId) {
    const quantityInput = document.querySelector(`.quantity-input[data-row-id="${rowId}"]`);
    const unitPriceInput = document.querySelector(`.unit-price-input[data-row-id="${rowId}"]`);
    const amountInput = document.querySelector(`.amount-input[data-row-id="${rowId}"]`);
    
    if (quantityInput && unitPriceInput && amountInput) {
        const quantity = Number(quantityInput.value) || 0;
        const unitPrice = Number(unitPriceInput.value) || 0;
        const amount = quantity * unitPrice;
        amountInput.value = amount;
    }
    
    calculatePayslip();
}

/**
 * ドライバー選択時の処理
 */
function handleDriverSelect() {
    const driverName = document.getElementById('driver-select').value;
    if (!driverName) return;
    
    // 名前でドライバーを検索
    const driver = currentDrivers.find(d => d.name === driverName);
    if (!driver) {
        // フリー入力の場合は控除情報をクリア
        document.getElementById('insurance-fee').value = 0;
        document.getElementById('vehicle-lease-fee').value = 0;
        return;
    }
    
    // リース情報を自動入力
    document.getElementById('insurance-fee').value = driver.insurance_fee || 0;
    document.getElementById('vehicle-lease-fee').value = driver.vehicle_lease_fee || 0;
    
    // 作業明細コンテナを更新
    updateWorkDetailsContainer();
    setupWorkDetailEventListeners();
}

/**
 * 給料明細計算
 */
function calculatePayslip() {
    // 作業小計（税抜）の計算
    let subtotal = 0;
    document.querySelectorAll('.amount-input').forEach(input => {
        subtotal += Number(input.value) || 0;
    });
    
    // 内消費税（10%対象）の計算
    const consumptionTax = Math.round(subtotal * 10 / 110);
    
    // 作業合計（税込）
    const workTotal = subtotal;
    
    // 控除合計の計算
    const transferFee = Number(document.getElementById('transfer-fee').value) || 0;
    const insuranceFee = Number(document.getElementById('insurance-fee').value) || 0;
    const vehicleLeaseFee = Number(document.getElementById('vehicle-lease-fee').value) || 0;
    const advancePayment = Number(document.getElementById('advance-payment').value) || 0;
    const otherDeductions = Number(document.getElementById('other-deductions').value) || 0;
    
    const totalDeductions = transferFee + insuranceFee + vehicleLeaseFee + advancePayment + otherDeductions;
    
    // 差引支給額
    const netPay = workTotal - totalDeductions;
    
    // 表示を更新
    document.getElementById('subtotal-display').textContent = formatCurrency(subtotal);
    document.getElementById('consumption-tax-display').textContent = formatCurrency(consumptionTax);
    document.getElementById('work-total-display').textContent = formatCurrency(workTotal);
    document.getElementById('total-deductions-display').textContent = formatCurrency(totalDeductions);
    document.getElementById('net-pay-display').textContent = formatCurrency(netPay);
}

/**
 * 給料明細フォーム送信
 */
async function handlePayslipFormSubmit(e) {
    e.preventDefault();
    
    const driverName = document.getElementById('driver-select').value;
    if (!driverName) {
        alert('ドライバー名を入力してください');
        return;
    }
    
    // 名前でドライバーを検索（フリー入力も許可）
    const driver = currentDrivers.find(d => d.name === driverName);
    const driverId = driver ? driver.id : generateUUID(); // フリー入力の場合は新規ID生成
    
    // 作業明細の収集
    const workDetails = [];
    document.querySelectorAll('.work-detail-row').forEach(row => {
        const rowId = row.dataset.rowId;
        const typeSelect = row.querySelector('.delivery-type-select');
        const quantityInput = row.querySelector('.quantity-input');
        const unitPriceInput = row.querySelector('.unit-price-input');
        const amountInput = row.querySelector('.amount-input');
        
        const typeId = typeSelect?.value;
        const quantity = Number(quantityInput?.value) || 0;
        
        if (typeId && quantity > 0) {
            const type = currentDeliveryTypes.find(t => t.id === typeId);
            workDetails.push({
                name: type?.name || '',
                quantity: quantity,
                unit_price: Number(unitPriceInput?.value) || 0,
                amount: Number(amountInput?.value) || 0
            });
        }
    });
    
    if (workDetails.length === 0) {
        alert('作業明細を入力してください');
        return;
    }
    
    // 計算値の取得
    const subtotal = workDetails.reduce((sum, detail) => sum + detail.amount, 0);
    const consumptionTax = Math.round(subtotal * 10 / 110);
    const workTotal = subtotal;
    
    const transferFee = Number(document.getElementById('transfer-fee').value) || 0;
    const insuranceFee = Number(document.getElementById('insurance-fee').value) || 0;
    const vehicleLeaseFee = Number(document.getElementById('vehicle-lease-fee').value) || 0;
    const advancePayment = Number(document.getElementById('advance-payment').value) || 0;
    const otherDeductions = Number(document.getElementById('other-deductions').value) || 0;
    
    const totalDeductions = transferFee + insuranceFee + vehicleLeaseFee + advancePayment + otherDeductions;
    const netPay = workTotal - totalDeductions;
    
    const payslipData = {
        id: generateUUID(),
        driver_id: driverId,
        driver_name: driverName,
        company_name: document.getElementById('company-name').value,
        center_name: document.getElementById('center-name').value,
        year: Number(document.getElementById('payslip-year').value),
        month: Number(document.getElementById('payslip-month').value),
        period_start: document.getElementById('period-start').value,
        period_end: document.getElementById('period-end').value,
        subtotal: subtotal,
        consumption_tax: consumptionTax,
        work_total: workTotal,
        transfer_fee: transferFee,
        insurance_fee: insuranceFee,
        vehicle_lease_fee: vehicleLeaseFee,
        advance_payment: advancePayment,
        other_deduction_name: document.getElementById('other-deduction-name').value,
        other_deductions: otherDeductions,
        total_deductions: totalDeductions,
        net_pay: netPay,
        notes: document.getElementById('payslip-notes').value,
        work_details: workDetails,
        created_at: new Date().toISOString()
    };
    
    try {
        await createData(TABLES.PAYSLIPS, payslipData);
        alert('給料明細を保存しました');
        document.getElementById('payslip-form').reset();
        updateWorkDetailsContainer();
        calculatePayslip();
        switchTab('payslips');
        await loadPayslips();
    } catch (error) {
        // エラーは既にalertで表示済み
    }
}

/**
 * フォームリセット
 */
function resetPayslipForm() {
    if (confirm('フォームをリセットしてもよろしいですか？')) {
        document.getElementById('payslip-form').reset();
        updateWorkDetailsContainer();
        setupWorkDetailEventListeners();
        calculatePayslip();
    }
}

// ==================== 明細一覧 ====================

/**
 * 明細一覧読み込み
 */
async function loadPayslips() {
    currentPayslips = await fetchData(TABLES.PAYSLIPS, { page: 1, limit: 100 });
    renderPayslipsList();
    updateFilterYears();
}

/**
 * 明細一覧表示
 */
function renderPayslipsList() {
    const container = document.getElementById('payslips-list');
    if (!container) return;
    
    // フィルター適用
    const filterDriver = document.getElementById('filter-driver')?.value;
    const filterYear = document.getElementById('filter-year')?.value;
    const filterMonth = document.getElementById('filter-month')?.value;
    
    let filteredPayslips = [...currentPayslips];
    
    if (filterDriver) {
        filteredPayslips = filteredPayslips.filter(p => p.driver_id === filterDriver);
    }
    
    if (filterYear) {
        filteredPayslips = filteredPayslips.filter(p => p.year === Number(filterYear));
    }
    
    if (filterMonth) {
        filteredPayslips = filteredPayslips.filter(p => p.month === Number(filterMonth));
    }
    
    // 日付でソート（新しい順）
    filteredPayslips.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
    });
    
    if (filteredPayslips.length === 0) {
        container.innerHTML = '<p class="text-center">明細が見つかりません</p>';
        return;
    }
    
    container.innerHTML = filteredPayslips.map(payslip => `
        <div class="card fade-in" onclick="showPayslipDetail('${payslip.id}')">
            <div class="card-header">
                <div class="card-title">${payslip.driver_name}</div>
            </div>
            <div class="card-body">
                <div class="card-info">
                    <span>年月:</span>
                    <strong>${payslip.year}年${payslip.month}月</strong>
                </div>
                <div class="card-info">
                    <span>差引支給額:</span>
                    <strong class="highlight">${formatCurrency(payslip.net_pay)}</strong>
                </div>
                <div class="card-info">
                    <span>作成日:</span>
                    <span>${formatDate(payslip.created_at)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * フィルター年更新
 */
function updateFilterYears() {
    const select = document.getElementById('filter-year');
    if (!select) return;
    
    const years = [...new Set(currentPayslips.map(p => p.year))].sort((a, b) => b - a);
    
    select.innerHTML = '<option value="">すべて</option>' +
        years.map(year => `<option value="${year}">${year}年</option>`).join('');
}

/**
 * 明細詳細表示
 */
function showPayslipDetail(id) {
    const payslip = currentPayslips.find(p => p.id === id);
    if (!payslip) return;
    
    selectedPayslipId = id;
    
    const content = document.getElementById('payslip-detail-content');
    if (!content) return;
    
    content.innerHTML = `
        <div style="padding: 20px;">
            <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 10px;">基本情報</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div><strong>ドライバー:</strong> ${payslip.driver_name}</div>
                    <div><strong>年月:</strong> ${payslip.year}年${payslip.month}月</div>
                    <div><strong>会社名:</strong> ${payslip.company_name || '-'}</div>
                    <div><strong>担当センター:</strong> ${payslip.center_name || '-'}</div>
                    <div><strong>集計期間:</strong> ${formatDate(payslip.period_start)} 〜 ${formatDate(payslip.period_end)}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 10px;">作業明細</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                            <th style="padding: 10px; text-align: left;">配送タイプ</th>
                            <th style="padding: 10px; text-align: right;">個数</th>
                            <th style="padding: 10px; text-align: right;">単価</th>
                            <th style="padding: 10px; text-align: right;">金額</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(payslip.work_details || []).map(detail => `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 10px;">${detail.name}</td>
                                <td style="padding: 10px; text-align: right;">${detail.quantity}</td>
                                <td style="padding: 10px; text-align: right;">${formatCurrency(detail.unit_price)}</td>
                                <td style="padding: 10px; text-align: right;">${formatCurrency(detail.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 15px; padding: 10px; background: #f8fafc; border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>内消費税（10%対象）:</span>
                        <strong>${formatCurrency(payslip.consumption_tax)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #2563eb; font-size: 18px; color: #2563eb;">
                        <span><strong>作業合計（税込10%対象）:</strong></span>
                        <strong>${formatCurrency(payslip.work_total)}</strong>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 10px;">控除明細</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tbody>
                        ${payslip.transfer_fee > 0 ? `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 10px;">振込手数料</td>
                                <td style="padding: 10px; text-align: right;">${formatCurrency(payslip.transfer_fee)}</td>
                            </tr>
                        ` : ''}
                        ${payslip.insurance_fee > 0 ? `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 10px;">保険料</td>
                                <td style="padding: 10px; text-align: right;">${formatCurrency(payslip.insurance_fee)}</td>
                            </tr>
                        ` : ''}
                        ${payslip.vehicle_lease_fee > 0 ? `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 10px;">車両リース代</td>
                                <td style="padding: 10px; text-align: right;">${formatCurrency(payslip.vehicle_lease_fee)}</td>
                            </tr>
                        ` : ''}
                        ${payslip.advance_payment > 0 ? `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 10px;">前借り</td>
                                <td style="padding: 10px; text-align: right;">${formatCurrency(payslip.advance_payment)}</td>
                            </tr>
                        ` : ''}
                        ${payslip.other_deduction_name && payslip.other_deductions > 0 ? `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 10px;">${payslip.other_deduction_name}</td>
                                <td style="padding: 10px; text-align: right;">${formatCurrency(payslip.other_deductions)}</td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
                <div style="margin-top: 15px; padding: 10px; background: #f8fafc; border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>控除合計:</span>
                        <strong>${formatCurrency(payslip.total_deductions)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #2563eb; font-size: 20px; color: #2563eb;">
                        <span><strong>差引支給額:</strong></span>
                        <strong>${formatCurrency(payslip.net_pay)}</strong>
                    </div>
                </div>
            </div>
            
            ${payslip.notes ? `
                <div>
                    <h3 style="margin-bottom: 10px;">備考</h3>
                    <div style="padding: 15px; background: #f8fafc; border-radius: 6px; white-space: pre-wrap;">
                        ${payslip.notes}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    showModal('payslip-detail-modal');
}

/**
 * 明細削除
 */
async function deletePayslip() {
    if (!selectedPayslipId) return;
    
    const payslip = currentPayslips.find(p => p.id === selectedPayslipId);
    if (!payslip) return;
    
    if (!confirm(`${payslip.driver_name}の${payslip.year}年${payslip.month}月の明細を削除してもよろしいですか？`)) {
        return;
    }
    
    try {
        await deleteData(TABLES.PAYSLIPS, selectedPayslipId);
        alert('明細を削除しました');
        hideModal('payslip-detail-modal');
        await loadPayslips();
    } catch (error) {
        // エラーは既にalertで表示済み
    }
}

/**
 * 印刷
 */
function printPayslip() {
    if (!selectedPayslipId) return;
    
    const payslip = currentPayslips.find(p => p.id === selectedPayslipId);
    if (!payslip) return;
    
    const printLayout = document.getElementById('print-layout');
    if (!printLayout) return;
    
    printLayout.innerHTML = `
        <div class="print-header">
            <h1>給 料 明 細 書</h1>
            <div class="print-info">
                <div>
                    <div><strong>御中:</strong> ${payslip.driver_name} 様</div>
                    <div style="margin-top: 10px;"><strong>支払合計金額:</strong> ${formatCurrency(payslip.net_pay)}</div>
                </div>
                <div style="text-align: right;">
                    ${payslip.company_name ? `<div>${payslip.company_name}</div>` : ''}
                    ${payslip.center_name ? `<div>${payslip.center_name}</div>` : ''}
                </div>
            </div>
        </div>
        
        <div class="print-section">
            <div style="margin-bottom: 10px;">
                <strong>${payslip.year}年${payslip.month}月</strong>
            </div>
            <div>集計期間: ${formatDate(payslip.period_start)} 〜 ${formatDate(payslip.period_end)}</div>
        </div>
        
        <div class="print-section">
            <h2>作業明細</h2>
            <table class="print-table">
                <thead>
                    <tr>
                        <th>配送タイプ</th>
                        <th style="text-align: center;">個数</th>
                        <th style="text-align: right;">単価</th>
                        <th style="text-align: right;">金額</th>
                    </tr>
                </thead>
                <tbody>
                    ${(payslip.work_details || []).map(detail => `
                        <tr>
                            <td>${detail.name}</td>
                            <td style="text-align: center;">${detail.quantity}</td>
                            <td class="number">${formatCurrency(detail.unit_price)}</td>
                            <td class="number">${formatCurrency(detail.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="print-total">
                <span>内消費税（10%対象）:</span>
                <span>${formatCurrency(payslip.consumption_tax)}</span>
            </div>
            <div class="print-total">
                <span>作業合計（税込10%対象）:</span>
                <span>${formatCurrency(payslip.work_total)}</span>
            </div>
        </div>
        
        <div class="print-section">
            <h2>控除明細</h2>
            <table class="print-table">
                <tbody>
                    ${payslip.transfer_fee > 0 ? `
                        <tr>
                            <td>振込手数料</td>
                            <td class="number">${formatCurrency(payslip.transfer_fee)}</td>
                        </tr>
                    ` : ''}
                    ${payslip.insurance_fee > 0 ? `
                        <tr>
                            <td>保険料</td>
                            <td class="number">${formatCurrency(payslip.insurance_fee)}</td>
                        </tr>
                    ` : ''}
                    ${payslip.vehicle_lease_fee > 0 ? `
                        <tr>
                            <td>車両リース代</td>
                            <td class="number">${formatCurrency(payslip.vehicle_lease_fee)}</td>
                        </tr>
                    ` : ''}
                    ${payslip.advance_payment > 0 ? `
                        <tr>
                            <td>前借り</td>
                            <td class="number">${formatCurrency(payslip.advance_payment)}</td>
                        </tr>
                    ` : ''}
                    ${payslip.other_deduction_name && payslip.other_deductions > 0 ? `
                        <tr>
                            <td>${payslip.other_deduction_name}</td>
                            <td class="number">${formatCurrency(payslip.other_deductions)}</td>
                        </tr>
                    ` : ''}
                </tbody>
            </table>
            <div class="print-total">
                <span>控除合計:</span>
                <span>${formatCurrency(payslip.total_deductions)}</span>
            </div>
            <div class="print-total" style="font-size: 18px;">
                <span>差引合計金額:</span>
                <span>${formatCurrency(payslip.net_pay)}</span>
            </div>
        </div>
        
        ${payslip.notes ? `
            <div class="print-section">
                <h2>備考</h2>
                <div style="padding: 10px; border: 1px solid #000; white-space: pre-wrap;">
                    ${payslip.notes}
                </div>
            </div>
        ` : ''}
    `;
    
    window.print();
}

/**
 * メール送信モーダルを開く
 */
function openEmailModal() {
    if (!selectedPayslipId) return;
    
    const payslip = currentPayslips.find(p => p.id === selectedPayslipId);
    if (!payslip) return;
    
    // ドライバーのメールアドレスを検索
    const driver = currentDrivers.find(d => d.name === payslip.driver_name);
    const emailTo = document.getElementById('email-to');
    
    if (driver && driver.email) {
        emailTo.value = driver.email;
    } else {
        emailTo.value = '';
    }
    
    // 件名を設定
    document.getElementById('email-subject').value = `【給料明細】${payslip.year}年${payslip.month}月分`;
    
    // メッセージを設定
    document.getElementById('email-message').value = `${payslip.driver_name} 様

お疲れ様です。
${payslip.year}年${payslip.month}月分の給料明細をお送りいたします。

ご確認のほど、よろしくお願いいたします。

【支給額】
差引支給額: ${formatCurrency(payslip.net_pay)}

集計期間: ${formatDate(payslip.period_start)} 〜 ${formatDate(payslip.period_end)}`;
    
    showModal('email-modal');
}

/**
 * メール送信フォーム送信
 */
async function handleEmailFormSubmit(e) {
    e.preventDefault();
    
    if (!selectedPayslipId) return;
    
    const payslip = currentPayslips.find(p => p.id === selectedPayslipId);
    if (!payslip) return;
    
    const driverEmail = document.getElementById('email-to').value;
    const customMessage = document.getElementById('email-message').value;
    
    // バックエンドAPIが期待する形式にデータを整形
    const emailData = {
        payslip: payslip,
        driverEmail: driverEmail,
        customMessage: customMessage
    };
    
    try {
        // ローディング表示
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...';
        
        // バックエンドAPIにメール送信リクエスト
        const response = await fetch('/api/email/send-payslip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'メール送信に失敗しました');
        }
        
        const result = await response.json();
        alert(`メールを送信しました\n\n送信先: ${driverEmail}\n明細: ${payslip.year}年${payslip.month}月分\nPDF添付: あり`);
        hideModal('email-modal');
    } catch (error) {
        console.error('メール送信エラー:', error);
        alert(`メール送信に失敗しました\n\nエラー: ${error.message}\n\n対処方法:\n1. メールアドレスが正しいか確認\n2. バックエンドサーバーが起動しているか確認\n3. .envファイルのメール設定を確認\n   (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)`);
    }
}

// ==================== 初期化 ====================

/**
 * アプリケーション初期化
 */
async function initializeApp() {
    // 現在の日付を設定
    const now = new Date();
    document.getElementById('payslip-year').value = now.getFullYear();
    document.getElementById('payslip-month').value = now.getMonth() + 1;
    
    // タブ切り替えイベント
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });
    
    // モーダル閉じるボタン
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // モーダル背景クリックで閉じる
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // ドライバー管理
    document.getElementById('add-driver-btn')?.addEventListener('click', openAddDriverModal);
    document.getElementById('driver-form')?.addEventListener('submit', handleDriverFormSubmit);
    document.getElementById('has-lease')?.addEventListener('change', (e) => {
        document.getElementById('lease-details').style.display = e.target.checked ? 'block' : 'none';
    });
    
    // 配送タイプ管理
    document.getElementById('add-delivery-type-btn')?.addEventListener('click', openAddDeliveryTypeModal);
    document.getElementById('delivery-type-form')?.addEventListener('submit', handleDeliveryTypeFormSubmit);
    
    // 給料明細作成
    document.getElementById('driver-select')?.addEventListener('change', handleDriverSelect);
    document.getElementById('add-work-detail-btn')?.addEventListener('click', addWorkDetailRow);
    document.getElementById('calculate-btn')?.addEventListener('click', calculatePayslip);
    document.getElementById('payslip-form')?.addEventListener('submit', handlePayslipFormSubmit);
    document.getElementById('reset-form-btn')?.addEventListener('click', resetPayslipForm);
    
    // 控除項目変更時の自動計算
    ['transfer-fee', 'advance-payment', 'other-deductions'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculatePayslip);
    });
    
    // 明細一覧
    document.getElementById('apply-filters-btn')?.addEventListener('click', renderPayslipsList);
    document.getElementById('print-payslip-btn')?.addEventListener('click', printPayslip);
    document.getElementById('email-payslip-btn')?.addEventListener('click', openEmailModal);
    document.getElementById('delete-payslip-btn')?.addEventListener('click', deletePayslip);
    document.getElementById('email-form')?.addEventListener('submit', handleEmailFormSubmit);
    
    // データ読み込み
    await Promise.all([
        loadDrivers(),
        loadDeliveryTypes(),
        loadPayslips()
    ]);
    
    console.log('アプリケーション初期化完了');
}

// ページ読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', initializeApp);
