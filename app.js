// ============ ДЕМО-ДАННЫЕ ============
const DB = {
    pvz: [
        { id: 'pvz-001', name: 'ПВЗ №001', addr: 'ул. Ленина, 10', active: true },
        { id: 'pvz-002', name: 'ПВЗ №002', addr: 'пр. Мира, 25', active: true },
        { id: 'pvz-003', name: 'ПВЗ №003', addr: 'ул. Гагарина, 7', active: false }
    ],
    orders: [
        { id: 'ORD-1001', client: '+7 (900) 111-22-33', title: 'Кроссовки Nike, 42', pvz: 'pvz-001', status: 'ready' },
        { id: 'ORD-1002', client: '+7 (900) 111-22-33', title: 'Футболка, белая, L', pvz: 'pvz-001', status: 'waiting' },
        { id: 'ORD-1003', client: '+7 (900) 444-55-66', title: 'Рюкзак, 20л', pvz: 'pvz-002', status: 'ready' },
        { id: 'ORD-1004', client: '+7 (900) 777-88-99', title: 'Наушники TWS', pvz: 'pvz-001', status: 'issued' }
    ]
};

const STATUS_LABELS = {
    waiting: 'Ожидает',
    ready:   'Готов к выдаче',
    issued:  'Выдан'
};

// ============ УТИЛИТЫ ============
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $('#' + id).classList.add('active');
}

function showError(msg) {
    $('#error-msg').textContent = msg || '';
    if (msg) setTimeout(() => $('#error-msg').textContent = '', 3000);
}

// Форматирование телефона
function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    let res = '+7';
    if (digits.length > 1) res += ' (' + digits.slice(1, 4);
    if (digits.length >= 5) res += ') ' + digits.slice(4, 7);
    if (digits.length >= 8) res += '-' + digits.slice(7, 9);
    if (digits.length >= 10) res += '-' + digits.slice(9, 11);
    return res;
}

// ============ ПЕРЕКЛЮЧЕНИЕ РОЛЕЙ ============
$$('.role-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        $$('.role-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const role = tab.dataset.role;
        $$('.login-form').forEach(f => f.classList.toggle('active', f.dataset.role === role));
        showError('');
    });
});

// Маска телефона
const clientPhone = $('#client-phone');
clientPhone.addEventListener('input', e => {
    e.target.value = formatPhone(e.target.value);
});

// ============ ВХОД ============
$('#form-client').addEventListener('submit', e => {
    e.preventDefault();
    const phone = clientPhone.value.trim();
    if (phone.replace(/\D/g, '').length < 11) {
        return showError('Введите корректный номер телефона');
    }
    localStorage.setItem('pvz_session', JSON.stringify({ role: 'client', phone }));
    renderClient(phone);
    showScreen('screen-client');
});

$('#form-admin').addEventListener('submit', e => {
    e.preventDefault();
    const login = $('#admin-login').value.trim();
    const pass  = $('#admin-pass').value.trim();
    if (!login || !pass) return showError('Заполните все поля');
    // Демо: любой логин/пароль
    localStorage.setItem('pvz_session', JSON.stringify({ role: 'admin', login }));
    renderAdmin();
    showScreen('screen-admin');
});

$('#form-pvz').addEventListener('submit', e => {
    e.preventDefault();
    const pointId = $('#pvz-point').value;
    const code    = $('#pvz-code').value.trim();
    if (!code) return showError('Введите код сотрудника');
    const point = DB.pvz.find(p => p.id === pointId);
    localStorage.setItem('pvz_session', JSON.stringify({ role: 'pvz', pointId, pointName: point.name }));
    renderPvz(pointId);
    showScreen('screen-pvz');
});

// ============ КАБИНЕТ КЛИЕНТА ============
function renderClient(phone) {
    $('#client-phone-display').textContent = phone;
    const orders = DB.orders.filter(o => o.client === phone);
    const box = $('#client-orders');

    if (!orders.length) {
        box.innerHTML = '<p style="color:#888">У вас пока нет заказов.</p>';
        return;
    }

    box.innerHTML = orders.map(o => `
        <div class="order-card">
            <div class="order-info">
                <h4>${o.title}</h4>
                <p>${o.id} · ПВЗ: ${DB.pvz.find(p => p.id === o.pvz)?.name || '—'}</p>
            </div>
            <span class="order-status status-${o.status}">${STATUS_LABELS[o.status]}</span>
        </div>
    `).join('');
}

// ============ КАБИНЕТ АДМИНА ============
function renderAdmin() {
    const total   = DB.orders.length;
    const ready   = DB.orders.filter(o => o.status === 'ready').length;
    const waiting = DB.orders.filter(o => o.status === 'waiting').length;
    const issued  = DB.orders.filter(o => o.status === 'issued').length;

    $('#admin-stats').innerHTML = `
        <div class="stat-card"><div class="num">${total}</div><div class="label">Всего заказов</div></div>
        <div class="stat-card"><div class="num">${ready}</div><div class="label">Готовы к выдаче</div></div>
        <div class="stat-card"><div class="num">${waiting}</div><div class="label">Ожидают</div></div>
        <div class="stat-card"><div class="num">${issued}</div><div class="label">Выдано</div></div>
    `;

    $('#admin-pvz-list').innerHTML = DB.pvz.map(p => `
        <div class="pvz-item">
            <div>
                <div class="name">${p.name}</div>
                <div class="addr">${p.addr}</div>
            </div>
            <span class="badge">${p.active ? 'Активен' : 'Закрыт'}</span>
        </div>
    `).join('');
}

// ============ КАБИНЕТ ПВЗ ============
function renderPvz(pointId) {
    const point = DB.pvz.find(p => p.id === pointId);
    $('#pvz-name').textContent = point.name;

    const orders = DB.orders.filter(o => o.pvz === pointId);
    const box = $('#pvz-orders');

    if (!orders.length) {
        box.innerHTML = '<p style="color:#888">На пункте нет заказов.</p>';
        return;
    }

    box.innerHTML = orders.map(o => `
        <div class="order-card">
            <div class="order-info">
                <h4>${o.title}</h4>
                <p>${o.id} · ${o.client}</p>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
                <span class="order-status status-${o.status}">${STATUS_LABELS[o.status]}</span>
                ${o.status === 'ready'
                    ? `<button class="btn-action" onclick="issueOrder('${o.id}')">Выдать</button>`
                    : ''}
            </div>
        </div>
    `).join('');
}

function issueOrder(orderId) {
    const order = DB.orders.find(o => o.id === orderId);
    if (!order) return;
    order.status = 'issued';
    const session = JSON.parse(localStorage.getItem('pvz_session'));
    renderPvz(session.pointId);
}

// ============ ВЫХОД ============
function logout() {
    localStorage.removeItem('pvz_session');
    // Сброс форм
    $('#form-client').reset();
    $('#form-admin').reset();
    $('#form-pvz').reset();
    showScreen('screen-login');
}

// ============ ВОССТАНОВЛЕНИЕ СЕССИИ ============
(function init() {
    const raw = localStorage.getItem('pvz_session');
    if (!raw) return;
    try {
        const s = JSON.parse(raw);
        if (s.role === 'client') { renderClient(s.phone); showScreen('screen-client'); }
        if (s.role === 'admin')  { renderAdmin();        showScreen('screen-admin'); }
        if (s.role === 'pvz')    { renderPvz(s.pointId); showScreen('screen-pvz'); }
    } catch (e) {
        localStorage.removeItem('pvz_session');
    }
})();
