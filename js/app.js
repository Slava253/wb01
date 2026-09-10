/* ================= КОНСТАНТЫ ================= */
const STORAGE_KEY = 'pvz_db_v3';
const SESSION_KEY = 'pvz_session_v3';

const DEFAULT_DB = {
  admin: { login: 'admin', password: 'admin' },
  pvz: [
    { id:'pvz-001', name:'ПВЗ №001', addr:'ул. Ленина, 10', active:true },
    { id:'pvz-002', name:'ПВЗ №002', addr:'пр. Мира, 25', active:true }
  ],
  employees: [
    { id:'emp-001', name:'Иван Петров', pvz:'pvz-001', code:'1234' },
    { id:'emp-002', name:'Мария Сидорова', pvz:'pvz-002', code:'5678' }
  ],
  // Заказ: { id, qr (5 цифр), title, client, pvz, cell, status, createdAt }
  // status: 'waiting' (создан клиентом) | 'storage' (принят) | 'issued'
  orders: []
};

/* ================= ХРАНИЛИЩЕ ================= */
function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DB));
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}
function saveDB() { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); }
let DB = loadDB();

/* ================= УТИЛИТЫ ================= */
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}
function showError(msg) {
  const el = $('#error-msg');
  el.textContent = msg || '';
  if (msg) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000);
}

/** Озвучка */
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU'; u.rate = 1; u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch(e) { console.warn(e); }
}

/** Генерация случайного 5-значного QR (уникального) */
function generateQR() {
  const used = new Set(DB.orders.map(o => o.qr));
  let qr;
  do {
    qr = String(Math.floor(10000 + Math.random() * 90000));
  } while (used.has(qr));
  return qr;
}

/** Генерация ID заказа */
function nextOrderId() {
  const nums = DB.orders
    .map(o => parseInt((o.id.match(/\d+$/) || ['0'])[0], 10))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return 'ORD-' + (max + 1);
}

/** Отрисовка QR как SVG */
function renderQR(text) {
  if (typeof qrcode !== 'function') {
    console.warn('QR generator не загружен');
    return '<div style="padding:20px;color:#888">QR недоступен</div>';
  }
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Numeric');
  qr.make();
  return qr.createSvgTag(6, 8);
}

/* ================= ПЕРЕКЛЮЧЕНИЕ РОЛЕЙ ================= */
$$('.role-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.role-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const role = tab.dataset.role;
    $$('.login-form').forEach(f => f.classList.toggle('active', f.dataset.role === role));
    showError('');
  });
});

/* ================= ЗАПОЛНЕНИЕ SELECT'ОВ ================= */
function fillPvzSelects() {
  const active = DB.pvz.filter(p => p.active);
  const options = active.map(p => `<option value="${p.id}">${p.name} — ${p.addr}</option>`).join('');

  // Вход сотрудника — все ПВЗ (включая закрытые, чтобы можно было зайти)
  $('#pvz-point').innerHTML = DB.pvz.map(p => `<option value="${p.id}">${p.name} — ${p.addr}</option>`).join('');

  // Клиент — только активные
  $('#order-pvz').innerHTML = options || '<option value="">— нет активных ПВЗ —</option>';

  // Админ: сотрудники — только активные
  $('#emp-new-pvz').innerHTML = options || '<option value="">— нет активных ПВЗ —</option>';
}

/* ================= ВХОД: КЛИЕНТ ================= */
const clientPhoneInput = $('#client-phone');
clientPhoneInput.addEventListener('input', e => {
  const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
  let v = '+7';
  if (digits.length > 1) v += ' (' + digits.slice(1,4);
  if (digits.length >= 5) v += ') ' + digits.slice(4,7);
  if (digits.length >= 8) v += '-' + digits.slice(7,9);
  if (digits.length >= 10) v += '-' + digits.slice(9,11);
  e.target.value = v;
});

$('#form-client').addEventListener('submit', e => {
  e.preventDefault();
  const raw = clientPhoneInput.value.replace(/\D/g, '');
  if (raw.length < 10) return showError('Введите номер телефона полностью');
  const normalized = '+7' + (raw.length === 11 ? raw.slice(1) : raw);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ role:'client', phone: normalized }));
  renderClient(normalized);
  showScreen('screen-client');
});

/* ================= ВХОД: АДМИН ================= */
$('#form-admin').addEventListener('submit', e => {
  e.preventDefault();
  const login = $('#admin-login').value.trim();
  const pass  = $('#admin-pass').value.trim();
  if (login !== DB.admin.login || pass !== DB.admin.password) {
    return showError('Неверный логин или пароль');
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ role:'admin' }));
  renderAdmin();
  showScreen('screen-admin');
});

/* ================= ВХОД: ПВЗ ================= */
$('#form-pvz').addEventListener('submit', e => {
  e.preventDefault();
  const pointId = $('#pvz-point').value;
  const code    = $('#pvz-code').value.trim();
  if (!code) return showError('Введите код сотрудника');

  const emp = DB.employees.find(x => x.pvz === pointId && x.code === code);
  if (!emp) return showError('Неверный код для этого пункта');

  const point = DB.pvz.find(p => p.id === pointId);
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    role:'pvz', pointId, pointName: point.name, employeeName: emp.name
  }));
  renderPvz(pointId);
  setPvzMode('receive');
  showScreen('screen-pvz');
});

/* ================= КЛИЕНТ: СОЗДАНИЕ ЗАКАЗА ================= */
function createOrder() {
  const title = $('#order-title').value.trim();
  const pvzId = $('#order-pvz').value;
  const resultBox = $('#order-result');

  if (!title) {
    resultBox.className = 'result err';
    resultBox.textContent = '❌ Введите название товара';
    return;
  }
  if (!pvzId) {
    resultBox.className = 'result err';
    resultBox.textContent = '❌ Выберите пункт выдачи';
    return;
  }

  const session = JSON.parse(localStorage.getItem(SESSION_KEY));
  const qr = generateQR();
  const order = {
    id: nextOrderId(),
    qr,
    title,
    client: session.phone,
    pvz: pvzId,
    cell: null,
    status: 'waiting',
    createdAt: Date.now()
  };
  DB.orders.push(order);
  saveDB();

  resultBox.className = 'result ok';
  resultBox.textContent = `✅ Заказ ${order.id} создан! QR: ${qr}`;

  $('#order-title').value = '';
  renderClient(session.phone);
}

/* ================= КЛИЕНТ: РЕНДЕР ЗАКАЗОВ ================= */
function renderClient(phone) {
  $('#client-phone-display').textContent = phone;
  fillPvzSelects();

  const orders = DB.orders
    .filter(o => o.client === phone)
    .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

  const box = $('#client-orders');
  if (!orders.length) {
    box.innerHTML = '<p style="color:#888">У вас пока нет заказов.</p>';
    return;
  }

  const LABELS = { waiting:'Ожидает поступления', storage:'На складе', issued:'Выдан' };
  const CLS    = { waiting:'status-waiting', storage:'status-storage', issued:'status-issued' };

  box.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-info">
        <h4>${escapeHtml(o.title)}</h4>
        <p>${o.id} · ПВЗ: ${escapeHtml(DB.pvz.find(p=>p.id===o.pvz)?.name || '—')}</p>
        ${o.cell ? `<span class="cell">Ячейка ${o.cell}</span>` : ''}
      </div>
      <div class="qr-block">
        <div class="qr-wrap">${renderQR(o.qr)}</div>
        <div class="qr-code-num">QR: <b>${o.qr}</b></div>
        <span class="order-status ${CLS[o.status]}">${LABELS[o.status]}</span>
      </div>
    </div>
  `).join('');
}

/* ================= АДМИН: РЕНДЕР ================= */
function renderAdmin() {
  const total   = DB.orders.length;
  const storage = DB.orders.filter(o => o.status === 'storage').length;
  const issued  = DB.orders.filter(o => o.status === 'issued').length;
  const waiting = DB.orders.filter(o => o.status === 'waiting').length;

  $('#admin-stats').innerHTML = `
    <div class="stat-card"><div class="num">${total}</div><div class="label">Всего заказов</div></div>
    <div class="stat-card"><div class="num">${waiting}</div><div class="label">Ожидают приёмки</div></div>
    <div class="stat-card"><div class="num">${storage}</div><div class="label">На складах</div></div>
    <div class="stat-card"><div class="num">${issued}</div><div class="label">Выдано</div></div>
  `;

  // Список ПВЗ с кнопкой удаления
  $('#admin-pvz-list').innerHTML = DB.pvz.map(p => `
    <div class="pvz-item">
      <div>
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="addr">${escapeHtml(p.addr)}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="badge">${p.active ? 'Активен' : 'Закрыт'}</span>
        <button class="btn-danger" onclick="adminDeletePvz('${p.id}')">Удалить</button>
      </div>
    </div>
  `).join('') || '<p style="color:#888">Нет пунктов.</p>';

  // Список сотрудников с кнопкой удаления
  $('#admin-employees-list').innerHTML = DB.employees.map(e => {
    const point = DB.pvz.find(p => p.id === e.pvz);
    return `
      <div class="pvz-item">
        <div>
          <div class="name">${escapeHtml(e.name)}</div>
          <div class="addr">${escapeHtml(point?.name || '— удалён —')} · код: <b>${escapeHtml(e.code)}</b></div>
        </div>
        <button class="btn-danger" onclick="adminDeleteEmployee('${e.id}')">Удалить</button>
      </div>
    `;
  }).join('') || '<p style="color:#888">Нет сотрудников.</p>';

  fillPvzSelects();
}

/* ================= АДМИН: ДОБАВЛЕНИЕ / УДАЛЕНИЕ ================= */
function adminAddPvz() {
  const name = $('#pvz-new-name').value.trim();
  const addr = $('#pvz-new-addr').value.trim();
  const rb = $('#pvz-admin-result');

  if (!name || !addr) {
    rb.className = 'result err'; rb.textContent = '❌ Заполните название и адрес';
    return;
  }

  // Генерация ID
  const nums = DB.pvz.map(p => parseInt((p.id.match(/\d+$/)||['0'])[0],10)).filter(n=>!isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  const id = 'pvz-' + String(next).padStart(3,'0');

  DB.pvz.push({ id, name, addr, active:true });
  saveDB();

  rb.className = 'result ok'; rb.textContent = `✅ ПВЗ «${name}» добавлен`;
  $('#pvz-new-name').value = ''; $('#pvz-new-addr').value = '';
  renderAdmin();
}

function adminDeletePvz(id) {
  const point = DB.pvz.find(p => p.id === id);
  if (!point) return;
  if (!confirm(`Удалить «${point.name}»? Все заказы и сотрудники этого ПВЗ тоже будут удалены.`)) return;

  DB.pvz = DB.pvz.filter(p => p.id !== id);
  DB.employees = DB.employees.filter(e => e.pvz !== id);
  DB.orders = DB.orders.filter(o => o.pvz !== id);
  saveDB();
  renderAdmin();
}

function adminAddEmployee() {
  const name = $('#emp-new-name').value.trim();
  const pvzId = $('#emp-new-pvz').value;
  const code = $('#emp-new-code').value.trim();
  const rb = $('#emp-admin-result');

  if (!name || !pvzId || !code) {
    rb.className = 'result err'; rb.textContent = '❌ Заполните все поля';
    return;
  }

  // Проверка уникальности кода в пределах ПВЗ
  if (DB.employees.some(e => e.pvz === pvzId && e.code === code)) {
    rb.className = 'result err'; rb.textContent = '❌ Такой код уже используется на этом ПВЗ';
    return;
  }

  const nums = DB.employees.map(e => parseInt((e.id.match(/\d+$/)||['0'])[0],10)).filter(n=>!isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  const id = 'emp-' + String(next).padStart(3,'0');

  DB.employees.push({ id, name, pvz: pvzId, code });
  saveDB();

  rb.className = 'result ok'; rb.textContent = `✅ Сотрудник «${name}» добавлен`;
  $('#emp-new-name').value = ''; $('#emp-new-code').value = '';
  renderAdmin();
}

function adminDeleteEmployee(id) {
  const emp = DB.employees.find(e => e.id === id);
  if (!emp) return;
  if (!confirm(`Удалить сотрудника «${emp.name}»?`)) return;
  DB.employees = DB.employees.filter(e => e.id !== id);
  saveDB();
  renderAdmin();
}

/* ================= ПВЗ ================= */
let currentPointId = null;
let currentMode = 'receive';

function setPvzMode(mode) {
  currentMode = mode;
  $('#btn-mode-receive').classList.toggle('active', mode === 'receive');
  $('#btn-mode-issue').classList.toggle('active', mode === 'issue');
  $('#panel-receive').classList.toggle('active', mode === 'receive');
  $('#panel-issue').classList.toggle('active', mode === 'issue');
  setTimeout(() => (mode === 'receive' ? $('#receive-qr') : $('#issue-qr')).focus(), 50);
}

function renderPvz(pointId) {
  currentPointId = pointId;
  const point = DB.pvz.find(p => p.id === pointId);
  if (!point) return;
  $('#pvz-name').textContent = point.name;
  renderReceiveLog();
  renderIssueList();
}

/* ---- ПРИЁМКА ---- */
function renderReceiveLog() {
  const list = DB.orders
    .filter(o => o.pvz === currentPointId && o.status === 'storage')
    .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

  const box = $('#receive-log');
  if (!list.length) {
    box.innerHTML = '<p style="color:#888">Пока ничего не принято.</p>';
    return;
  }
  box.innerHTML = list.map(o => `
    <div class="order-card">
      <div class="order-info">
        <h4>${escapeHtml(o.title)}</h4>
        <p>${o.id} · QR: <b>${o.qr}</b> · ${escapeHtml(o.client)}</p>
        <span class="cell">Ячейка ${o.cell || '—'}</span>
      </div>
      <span class="order-status status-storage">На складе</span>
    </div>
  `).join('');
}

function receiveSubmit() {
  const input = $('#receive-qr');
  const qr = input.value.replace(/\D/g, '').slice(0,5);
  const resultBox = $('#receive-result');

  if (qr.length !== 5) {
    resultBox.className = 'result err';
    resultBox.textContent = '❌ QR должен содержать ровно 5 цифр';
    return;
  }

  // Ищем заказ с таким QR, ожидающий приёмки на этом ПВЗ
  const order = DB.orders.find(o => o.qr === qr && o.pvz === currentPointId);

  if (!order) {
    resultBox.className = 'result err';
    resultBox.textContent = '❌ Заказ с таким QR не найден на этом пункте';
    return;
  }
  if (order.status === 'storage') {
    resultBox.className = 'result err';
    resultBox.textContent = '⚠️ Заказ уже принят на склад';
    return;
  }
  if (order.status === 'issued') {
    resultBox.className = 'result err';
    resultBox.textContent = '⚠️ Заказ уже выдан';
    return;
  }

  // Назначаем ячейку
  const cell = assignCell();
  order.cell = cell;
  order.status = 'storage';
  saveDB();

  resultBox.className = 'result ok';
  resultBox.textContent = `✅ ${order.id} принят. Ячейка: ${cell}`;
  speak(`Заказ принят. Ячейка ${cell.split('-').join(' ')}`);

  input.value = '';
  input.focus();

  renderReceiveLog();
  renderIssueList();
}

function assignCell() {
  const used = new Set(
    DB.orders.filter(o => o.pvz === currentPointId && o.cell).map(o => o.cell)
  );
  const zones = ['A','B','C','D'];
  for (const z of zones) {
    for (let n = 1; n <= 30; n++) {
      const cell = z + '-' + String(n).padStart(2,'0');
      if (!used.has(cell)) return cell;
    }
  }
  return 'A-99';
}

function simulateReceiveScan() {
  // Берём первый заказ в статусе waiting на этом ПВЗ
  const candidate = DB.orders.find(o => o.pvz === currentPointId && o.status === 'waiting');
  if (!candidate) {
    const rb = $('#receive-result');
    rb.className = 'result err';
    rb.textContent = '❌ Нет заказов, ожидающих приёмки';
    return;
  }
  $('#receive-qr').value = candidate.qr;
  receiveSubmit();
}

/* ---- ВЫДАЧА ---- */
function renderIssueList() {
  const list = DB.orders
    .filter(o => o.pvz === currentPointId && o.status === 'storage')
    .sort((a,b) => (a.cell || '').localeCompare(b.cell || ''));

  const box = $('#issue-list');
  if (!list.length) {
    box.innerHTML = '<p style="color:#888">Нет посылок на складе.</p>';
    return;
  }
  box.innerHTML = list.map(o => `
    <div class="order-card">
      <div class="order-info">
        <h4>${escapeHtml(o.title)}</h4>
        <p>${o.id} · QR: <b>${o.qr}</b></p>
        <span class="cell">Ячейка ${o.cell || '—'}</span>
      </div>
      <span class="order-status status-storage">На складе</span>
    </div>
  `).join('');
}

function issueSubmit() {
  const input = $('#issue-qr');
  const qr = input.value.replace(/\D/g, '').slice(0,5);
  const resultBox = $('#issue-result');

  if (qr.length !== 5) {
    resultBox.className = 'result err';
    resultBox.textContent = '❌ QR должен содержать ровно 5 цифр';
    return;
  }

  const order = DB.orders.find(o => o.qr === qr && o.pvz === currentPointId);

  if (!order) {
    resultBox.className = 'result err';
    resultBox.textContent = '❌ Заказ с таким QR не найден на этом пункте';
    return;
  }
  if (order.status === 'issued') {
    resultBox.className = 'result err';
    resultBox.textContent = '⚠️ Заказ уже выдан';
    return;
  }
  if (order.status !== 'storage') {
    resultBox.className = 'result err';
    resultBox.textContent = '⚠️ Заказ ещё не принят на склад';
    return;
  }

  order.status = 'issued';
  saveDB();

  const cell = order.cell || '—';
  resultBox.className = 'result ok';
  resultBox.textContent = `✅ ${order.id} выдан. Ячейка ${cell} (${order.title})`;
  speak(`Возьмите посылку из ячейки ${cell.split('-').join(' ')}`);

  input.value = '';
  input.focus();

  renderIssueList();
  renderReceiveLog();
}

function simulateIssueScan() {
  const candidates = DB.orders.filter(o => o.pvz === currentPointId && o.status === 'storage');
  if (!candidates.length) {
    const rb = $('#issue-result');
    rb.className = 'result err';
    rb.textContent = '❌ Нет посылок на складе';
    return;
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  $('#issue-qr').value = pick.qr;
  issueSubmit();
}

/* ================= БЕЗОПАСНОСТЬ ================= */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* ================= ВЫХОД ================= */
function logout() {
  localStorage.removeItem(SESSION_KEY);
  $('#form-client').reset();
  $('#form-admin').reset();
  $('#form-pvz').reset();
  showScreen('screen-login');
}

/* ================= ВОССТАНОВЛЕНИЕ СЕССИИ ================= */
(function init() {
  fillPvzSelects();
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    if (s.role === 'client') { renderClient(s.phone); showScreen('screen-client'); }
    if (s.role === 'admin')  { renderAdmin();        showScreen('screen-admin'); }
    if (s.role === 'pvz')    { renderPvz(s.pointId); setPvzMode('receive'); showScreen('screen-pvz'); }
  } catch(e) {
    localStorage.removeItem(SESSION_KEY);
  }
})();

/* ================= ГЛОБАЛЬНЫЕ ХОТКЕИ ================= */
document.addEventListener('keydown', e => {
  // Enter в поле сканирования = отправить
  if (e.key === 'Enter') {
    if (e.target.id === 'receive-qr') { e.preventDefault(); receiveSubmit(); }
    if (e.target.id === 'issue-qr')   { e.preventDefault(); issueSubmit(); }
  }
});
