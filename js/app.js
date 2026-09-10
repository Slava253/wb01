/* ================= ДАННЫЕ ================= */
const STORAGE_KEY = 'pvz_db_v2';
const SESSION_KEY = 'pvz_session_v2';

const DEFAULT_DB = {
  pvz: [
    { id:'pvz-001', name:'ПВЗ №001', addr:'ул. Ленина, 10', active:true },
    { id:'pvz-002', name:'ПВЗ №002', addr:'пр. Мира, 25', active:true },
    { id:'pvz-003', name:'ПВЗ №003', addr:'ул. Гагарина, 7', active:false }
  ],
  // Заказы: { id, qr (5 цифр), title, client, pvz, cell, status }
  // status: 'waiting' | 'storage' | 'ready' | 'issued'
  orders: [
    { id:'ORD-1001', qr:'11111', title:'Кроссовки Nike, 42', client:'+7 (900) 111-22-33', pvz:'pvz-001', cell:'A-12', status:'ready' },
    { id:'ORD-1002', qr:'22222', title:'Футболка белая, L',   client:'+7 (900) 111-22-33', pvz:'pvz-001', cell:null, status:'waiting' },
    { id:'ORD-1003', qr:'33333', title:'Рюкзак 20л',          client:'+7 (900) 444-55-66', pvz:'pvz-002', cell:'B-04', status:'ready' },
    { id:'ORD-1004', qr:'44444', title:'Наушники TWS',        client:'+7 (900) 777-88-99', pvz:'pvz-001', cell:'A-03', status:'issued' }
  ]
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

/** Озвучка через Web Speech API */
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch(e) { console.warn('Озвучка недоступна', e); }
}

/** Генерация следующего ID заказа */
function nextOrderId() {
  const nums = DB.orders
    .map(o => parseInt((o.id.match(/\d+$/) || ['0'])[0], 10))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return 'ORD-' + (max + 1);
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

/* ================= ВХОД: КЛИЕНТ ================= */
// Маска телефона — мягкая, не мешает вводу
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
  // ДОСТАТОЧНО 10-11 цифр — не блокируем пользователя
  if (raw.length < 10) {
    return showError('Введите номер телефона полностью');
  }
  // Нормализуем к виду +7XXXXXXXXXX
  const normalized = '+7' + (raw.length === 11 ? raw.slice(1) : raw);
  const session = { role:'client', phone: normalized };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  renderClient(normalized);
  showScreen('screen-client');
});

/* ================= ВХОД: АДМИН ================= */
$('#form-admin').addEventListener('submit', e => {
  e.preventDefault();
  const login = $('#admin-login').value.trim();
  const pass  = $('#admin-pass').value.trim();
  if (!login || !pass) return showError('Заполните все поля');
  localStorage.setItem(SESSION_KEY, JSON.stringify({ role:'admin', login }));
  renderAdmin();
  showScreen('screen-admin');
});

/* ================= ВХОД: ПВЗ ================= */
$('#form-pvz').addEventListener('submit', e => {
  e.preventDefault();
  const pointId = $('#pvz-point').value;
  const code    = $('#pvz-code').value.trim();
  if (!code) return showError('Введите код сотрудника');
  const point = DB.pvz.find(p => p.id === pointId);
  const session = { role:'pvz', pointId, pointName: point.name };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  renderPvz(pointId);
  showScreen('screen-pvz');
});

/* ================= КАБИНЕТ КЛИЕНТА ================= */
function renderClient(phone) {
  $('#client-phone-display').textContent = phone;
  const orders = DB.orders.filter(o => o.client === phone);
  const box = $('#client-orders');

  if (!orders.length) {
    box.innerHTML = '<p style="color:#888">У вас пока нет заказов.</p>';
    return;
  }

  const LABELS = {
    waiting:'Ожидает поступления',
    storage:'На складе',
    ready:'Готов к выдаче',
    issued:'Выдан'
  };
  const CLS = {
    waiting:'status-waiting',
    storage:'status-storage',
    ready:'status-ready',
    issued:'status-issued'
  };

  box.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-info">
        <h4>${o.title}</h4>
        <p>${o.id} · QR: <b>${o.qr}</b> · ПВЗ: ${DB.pvz.find(p=>p.id===o.pvz)?.name || '—'}</p>
        ${o.cell ? `<span class="cell">Ячейка ${o.cell}</span>` : ''}
      </div>
      <span class="order-status ${CLS[o.status]}">${LABELS[o.status]}</span>
    </div>
  `).join('');
}

/* ================= КАБИНЕТ АДМИНА ================= */
function renderAdmin() {
  const total   = DB.orders.length;
  const ready   = DB.orders.filter(o => o.status === 'ready').length;
  const storage = DB.orders.filter(o => o.status === 'storage').length;
  const issued  = DB.orders.filter(o => o.status === 'issued').length;

  $('#admin-stats').innerHTML = `
    <div class="stat-card"><div class="num">${total}</div><div class="label">Всего заказов</div></div>
    <div class="stat-card"><div class="num">${ready}</div><div class="label">Готовы к выдаче</div></div>
    <div class="stat-card"><div class="num">${storage}</div><div class="label">На складе</div></div>
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

/* ================= КАБИНЕТ ПВЗ ================= */
let currentPointId = null;
let currentMode = 'receive';

function setPvzMode(mode) {
  currentMode = mode;
  $('#btn-mode-receive').classList.toggle('active', mode === 'receive');
  $('#btn-mode-issue').classList.toggle('active', mode === 'issue');
  $('#panel-receive').classList.toggle('active', mode === 'receive');
  $('#panel-issue').classList.toggle('active', mode === 'issue');

  // автофокус на нужное поле
  if (mode === 'receive') $('#receive-qr').focus();
  else $('#issue-qr').focus();
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
    .filter(o => o.pvz === currentPointId && (o.status === 'storage' || o.status === 'ready'))
    .sort((a,b) => b.id.localeCompare(a.id));

  const box = $('#receive-log');
  if (!list.length) {
    box.innerHTML = '<p style="color:#888">Пока ничего не принято.</p>';
    return;
  }
  box.innerHTML = list.map(o => `
    <div class="order-card">
      <div class="order-info">
        <h4>${o.title}</h4>
        <p>${o.id} · QR: <b>${o.qr}</b></p>
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

  // Ищем заказ по QR
  let order = DB.orders.find(o => o.qr === qr);

  // Если заказа нет — создаём новый (демо-режим)
  if (!order) {
    order = {
      id: nextOrderId(),
      qr,
      title: 'Новая посылка (QR ' + qr + ')',
      client: '+7 (900) 000-00-00',
      pvz: currentPointId,
      cell: null,
      status: 'waiting'
    };
    DB.orders.push(order);
  }

  // Назначаем ячейку автоматически (буква + 2 цифры)
  const cell = assignCell();
  order.cell = cell;
  order.status = 'storage';
  order.pvz = currentPointId;
  saveDB();

  resultBox.className = 'result ok';
  resultBox.textContent = `✅ Посылка ${order.id} принята. Ячейка: ${cell}`;

  speak(`Посылка принята. Ячейка ${cell.split('-').join(' ')}`);

  input.value = '';
  input.focus();

  renderReceiveLog();
  renderIssueList();
}

function assignCell() {
  // Простая схема: буква зависит от сотни номера заказа, номер — по порядку
  const used = new Set(
    DB.orders
      .filter(o => o.pvz === currentPointId && o.cell)
      .map(o => o.cell)
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
  // Генерируем случайные 5 цифр — эмулируем сканер
  const qr = String(Math.floor(10000 + Math.random() * 90000));
  $('#receive-qr').value = qr;
  receiveSubmit();
}

/* ---- ВЫДАЧА ---- */
function renderIssueList() {
  const list = DB.orders
    .filter(o => o.pvz === currentPointId && o.status === 'storage')
    .sort((a,b) => (a.cell || '').localeCompare(b.cell || ''));

  const box = $('#issue-list');
  if (!list.length) {
    box.innerHTML = '<p style="color:#888">Нет посылок, готовых к выдаче.</p>';
    return;
  }
  box.innerHTML = list.map(o => `
    <div class="order-card">
      <div class="order-info">
        <h4>${o.title}</h4>
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
    resultBox.textContent = '❌ Посылка с таким QR не найдена на этом пункте';
    return;
  }
  if (order.status === 'issued') {
    resultBox.className = 'result err';
    resultBox.textContent = '⚠️ Эта посылка уже была выдана';
    return;
  }
  if (order.status !== 'storage') {
    resultBox.className = 'result err';
    resultBox.textContent = '⚠️ Посылка ещё не принята на склад';
    return;
  }

  order.status = 'issued';
  saveDB();

  const cell = order.cell || '—';
  resultBox.className = 'result ok';
  resultBox.textContent = `✅ Выдано: ${order.id}. Возьмите из ячейки ${cell}`;

  // Озвучка номера ячейки
  speak(`Возьмите посылку из ячейки ${cell.split('-').join(' ')}`);

  input.value = '';
  input.focus();

  renderIssueList();
  renderReceiveLog();
}

function simulateIssueScan() {
  // Берём случайный QR из тех, что на складе
  const candidates = DB.orders.filter(o => o.pvz === currentPointId && o.status === 'storage');
  if (!candidates.length) {
    const rb = $('#issue-result');
    rb.className = 'result err';
    rb.textContent = '❌ Нет посылок на складе для симуляции';
    return;
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  $('#issue-qr').value = pick.qr;
  issueSubmit();
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
