// ============================================================
// ПВЗ — Firebase версия
// ============================================================
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, collection, doc, addDoc, setDoc, deleteDoc,
  getDocs, getDoc, query, where, onSnapshot, serverTimestamp, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

/* ================= ИНИЦИАЛИЗАЦИЯ ================= */
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

/* ================= СОСТОЯНИЕ ================= */
let DB = { pvz: [], employees: [], orders: [] };
let session = null;
let unsubscribers = [];
let currentPointId = null;
let currentMode = 'receive';

/* ================= УТИЛИТЫ ================= */
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}

function showError(msg) {
  const el = $('#error-msg');
  if (!el) return;
  el.textContent = msg || '';
  if (msg) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 4000);
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU'; u.rate = 1; u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch(e) { console.warn(e); }
}

function generateQR() {
  const used = new Set(DB.orders.map(o => o.qr));
  let qr;
  let attempts = 0;
  do {
    qr = String(Math.floor(10000 + Math.random() * 90000));
    attempts++;
    if (attempts > 1000) break;
  } while (used.has(qr));
  return qr;
}

function renderQR(text) {
  if (typeof window.qrcode !== 'function') return '<div>QR недоступен</div>';
  const qr = window.qrcode(0, 'M');
  qr.addData(text, 'Numeric');
  qr.make();
  return qr.createSvgTag(6, 8);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* ================= ЗАГРУЗКА QR-ГЕНЕРАТОРА ================= */
// qrcode.min.js подключаем как обычный скрипт до модуля
(function loadQR() {
  const s = document.createElement('script');
  s.src = 'js/qrcode.min.js';
  s.onload = () => console.log('QR generator загружен');
  document.head.appendChild(s);
})();

/* ================= ПОДПИСКИ НА FIRESTORE ================= */
function subscribeAll() {
  // ПВЗ
  unsubscribers.push(onSnapshot(collection(db, 'pvz'), snap => {
    DB.pvz = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    fillPvzSelects();
    if (session?.role === 'admin') renderAdmin();
    if (session?.role === 'pvz') renderPvz(session.pointId);
    if (session?.role === 'client') renderClient(session.phone);
  }));

  // Сотрудники
  unsubscribers.push(onSnapshot(collection(db, 'employees'), snap => {
    DB.employees = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (session?.role === 'admin') renderAdmin();
  }));

  // Заказы
  unsubscribers.push(onSnapshot(collection(db, 'orders'), snap => {
    DB.orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (session?.role === 'client') renderClient(session.phone);
    if (session?.role === 'admin')  renderAdmin();
    if (session?.role === 'pvz')    renderPvz(session.pointId);
  }));
}

function unsubscribeAll() {
  unsubscribers.forEach(fn => { try { fn(); } catch(e){} });
  unsubscribers = [];
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
  const activePvz = DB.pvz.filter(p => p.active);

  // Вход сотрудника — все ПВЗ
  const el = $('#pvz-point');
  if (el) el.innerHTML = DB.pvz.map(p =>
    `<option value="${p.id}">${escapeHtml(p.name)} — ${escapeHtml(p.addr)}</option>`
  ).join('');

  // Клиент — активные
  const clientEl = $('#order-pvz');
  if (clientEl) clientEl.innerHTML = activePvz.length
    ? activePvz.map(p => `<option value="${p.id}">${escapeHtml(p.name)} — ${escapeHtml(p.addr)}</option>`).join('')
    : '<option value="">— нет активных ПВЗ —</option>';

  // Админ: сотрудники
  const empEl = $('#emp-new-pvz');
  if (empEl) empEl.innerHTML = activePvz.length
    ? activePvz.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')
    : '<option value="">— нет активных ПВЗ —</option>';
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

  session = { role: 'client', phone: normalized };
  sessionStorage.setItem('pvz_session', JSON.stringify(session));

  // Дожидаемся загрузки данных
  renderClient(normalized);
  showScreen('screen-client');
});

/* ================= ВХОД: АДМИН (Firebase Auth) ================= */
$('#form-admin').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('#admin-email').value.trim();
  const pass  = $('#admin-pass').value.trim();
  if (!email || !pass) return showError('Заполните все поля');

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    session = { role: 'admin', uid: cred.user.uid, email: cred.user.email };
    sessionStorage.setItem('pvz_session', JSON.stringify(session));
    renderAdmin();
    showScreen('screen-admin');
  } catch (err) {
    console.error(err);
    showError('Ошибка входа: ' + (err.code || err.message));
  }
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
  session = {
    role: 'pvz',
    pointId,
    pointName: point.name,
    employeeName: emp.name
  };
  sessionStorage.setItem('pvz_session', JSON.stringify(session));

  renderPvz(pointId);
  setPvzMode('receive');
  showScreen('screen-pvz');
});

/* ================= КЛИЕНТ: СОЗДАНИЕ ЗАКАЗА ================= */
async function createOrder() {
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

  const qr = generateQR();
  const order = {
    qr,
    title,
    client: session.phone,
    pvz: pvzId,
    cell: null,
    status: 'waiting',
    createdAt: Date.now(),
    createdAtServer: serverTimestamp()
  };

  try {
    const ref = await addDoc(collection(db, 'orders'), order);
    resultBox.className = 'result ok';
    resultBox.textContent = `✅ Заказ ${ref.id} создан! QR: ${qr}`;
    $('#order-title').value = '';
  } catch (err) {
    console.error(err);
    resultBox.className = 'result err';
    resultBox.textContent = '❌ Ошибка: ' + err.message;
  }
}

/* ================= КЛИЕНТ: РЕНДЕР ================= */
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

/* ================= АДМИН: ПВЗ ================= */
async function adminAddPvz() {
  const name = $('#pvz-new-name').value.trim();
  const addr = $('#pvz-new-addr').value.trim();
  const rb = $('#pvz-admin-result');

  if (!name || !addr) {
    rb.className = 'result err'; rb.textContent = '❌ Заполните название и адрес';
    return;
  }

  const nums = DB.pvz.map(p => parseInt((p.id.match(/\d+$/)||['0'])[0],10)).filter(n=>!isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  const id = 'pvz-' + String(next).padStart(3,'0');

  try {
    await setDoc(doc(db, 'pvz', id), { name, addr, active: true });
    rb.className = 'result ok'; rb.textContent = `✅ ПВЗ «${name}» добавлен`;
    $('#pvz-new-name').value = ''; $('#pvz-new-addr').value = '';
  } catch (err) {
    console.error(err);
    rb.className = 'result err'; rb.textContent = '❌ ' + err.message;
  }
}

async function adminDeletePvz(id) {
  const point = DB.pvz.find(p => p.id === id);
  if (!point) return;
  if (!confirm(`Удалить «${point.name}»? Все заказы и сотрудники этого ПВЗ будут удалены.`)) return;

  try {
    // Удаляем сотрудников
    const emps = DB.employees.filter(e => e.pvz === id);
    for (const e of emps) {
      await deleteDoc(doc(db, 'employees', e.id));
    }
    // Удаляем заказы
    const ords = DB.orders.filter(o => o.pvz === id);
    for (const o of ords) {
      await deleteDoc(doc(db, 'orders', o.id));
    }
    // Удаляем сам ПВЗ
    await deleteDoc(doc(db, 'pvz', id));
  } catch (err) {
    console.error(err);
    alert('Ошибка удаления: ' + err.message);
  }
}

/* ================= АДМИН: СОТРУДНИКИ ================= */
async function adminAddEmployee() {
  const name = $('#emp-new-name').value.trim();
  const pvzId = $('#emp-new-pvz').value;
  const code = $('#emp-new-code').value.trim();
  const rb = $('#emp-admin-result');

  if (!name || !pvzId || !code) {
    rb.className = 'result err'; rb.textContent = '❌ Заполните все поля';
    return;
  }

  if (DB.employees.some(e => e.pvz === pvzId && e.code === code)) {
    rb.className = 'result err'; rb.textContent = '❌ Такой код уже используется на этом ПВЗ';
    return;
  }

  const nums = DB.employees.map(e => parseInt((e.id.match(/\d+$/)||['0'])[0],10)).filter(n=>!isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  const id = 'emp-' + String(next).padStart(3,'0');

  try {
    await setDoc(doc(db, 'employees', id), { name, pvz: pvzId, code });
    rb.className = 'result ok'; rb.textContent = `✅ Сотрудник «${name}» добавлен`;
    $('#emp-new-name').value = ''; $('#emp-new-code').value = '';
  } catch (err) {
    console.error(err);
    rb.className = 'result err'; rb.textContent = '❌ ' + err.message;
  }
}

async function adminDeleteEmployee(id) {
  const emp = DB.employees.find(e => e.id === id);
  if (!emp) return;
  if (!confirm(`Удалить сотрудника «${emp.name}»?`)) return;
  try {
    await deleteDoc(doc(db, 'employees', id));
  } catch (err) {
    console.error(err);
    alert('Ошибка: ' + err.message);
  }
}

/* ================= ПВЗ ================= */
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

  const empName = session?.employeeName || '';
  $('#pvz-emp-display').textContent = empName ? `👤 ${empName}` : '';

  renderReceiveWaiting();
  renderReceiveLog();
  renderIssueList();
}

/* ---- ПРИЁМКА: ОЖИДАЮТ ---- */
function renderReceiveWaiting() {
  const list = DB.orders
    .filter(o => o.pvz === currentPointId && o.status === 'waiting')
    .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

  const box = $('#receive-waiting');
  if (!box) return;
  if (!list.length) {
    box.innerHTML = '<p style="color:#888">Нет посылок, ожидающих приёмки.</p>';
    return;
  }
  box.innerHTML = list.map(o => `
    <div class="order-card">
      <div class="order-info">
        <h4>${escapeHtml(o.title)}</h4>
        <p>${o.id} · QR: <b>${o.qr}</b> · ${escapeHtml(o.client)}</p>
      </div>
      <span class="order-status status-waiting">Ожидает</span>
    </div>
  `).join('');
}

/* ---- ПРИЁМКА: НА СКЛАДЕ ---- */
function renderReceiveLog() {
  const list = DB.orders
    .filter(o => o.pvz === currentPointId && o.status === 'storage')
    .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

  const box = $('#receive-log');
  if (!box) return;
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

async function receiveSubmit() {
  const input = $('#receive-qr');
  const qr = input.value.replace(/\D/g, '').slice(0,5);
  const resultBox = $('#receive-result');

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

  const cell = assignCell();

  try {
    await updateDoc(doc(db, 'orders', order.id), {
      cell,
      status: 'storage',
      receivedAt: Date.now()
    });

    resultBox.className = 'result ok';
    resultBox.textContent = `✅ ${order.id} принят. Ячейка: ${cell}`;
    speak(`Заказ принят. Ячейка ${cell.split('-').join(' ')}`);

    input.value = '';
    input.focus();
  } catch (err) {
    console.error(err);
    resultBox.className = 'result err';
    resultBox.textContent = '❌ Ошибка: ' + err.message;
  }
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
  if (!box) return;
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

async function issueSubmit() {
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

  const cell = order.cell || '—';

  try {
    await updateDoc(doc(db, 'orders', order.id), {
      status: 'issued',
      issuedAt: Date.now()
    });

    resultBox.className = 'result ok';
    resultBox.textContent = `✅ ${order.id} выдан. Ячейка ${cell} (${order.title})`;
    speak(`Возьмите посылку из ячейки ${cell.split('-').join(' ')}`);

    input.value = '';
    input.focus();
  } catch (err) {
    console.error(err);
    resultBox.className = 'result err';
    resultBox.textContent = '❌ Ошибка: ' + err.message;
  }
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

/* ================= ВЫХОД ================= */
async function logout() {
  try { await signOut(auth); } catch(e) {}
  sessionStorage.removeItem('pvz_session');
  session = null;
  unsubscribeAll();
  $('#form-client')?.reset();
  $('#form-admin')?.reset();
  $('#form-pvz')?.reset();
  showScreen('screen-login');
  // Перезапускаем подписки для логина
  setTimeout(() => { subscribeAll(); }, 100);
}

/* ================= ИНИЦИАЛИЗАЦИЯ ================= */
(async function init() {
  // Ждём загрузки QR-генератора
  await new Promise(r => setTimeout(r, 300));

  // Подписываемся на все коллекции
  subscribeAll();

  // Восстановление сессии из sessionStorage
  const raw = sessionStorage.getItem('pvz_session');
  if (raw) {
    try {
      session = JSON.parse(raw);
      if (session.role === 'client') {
        renderClient(session.phone);
        showScreen('screen-client');
        return;
      }
      if (session.role === 'admin') {
        // Проверяем что Firebase Auth тоже видит пользователя
        const user = auth.currentUser;
        if (user) {
          renderAdmin();
          showScreen('screen-admin');
          return;
        } else {
          sessionStorage.removeItem('pvz_session');
        }
      }
      if (session.role === 'pvz') {
        renderPvz(session.pointId);
        setPvzMode('receive');
        showScreen('screen-pvz');
        return;
      }
    } catch(e) { sessionStorage.removeItem('pvz_session'); }
  }

  // Даём подпискам время загрузить данные, потом показываем экран входа
  setTimeout(() => showScreen('screen-login'), 500);
})();

/* ================= ENTER ДЛЯ СКАНЕРА ================= */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (e.target.id === 'receive-qr') { e.preventDefault(); receiveSubmit(); }
    if (e.target.id === 'issue-qr')   { e.preventDefault(); issueSubmit(); }
  }
});

/* ================= ЭКСПОРТ В WINDOW (для onclick) ================= */
window.logout = logout;
window.setPvzMode = setPvzMode;
window.createOrder = createOrder;
window.receiveSubmit = receiveSubmit;
window.issueSubmit = issueSubmit;
window.simulateReceiveScan = simulateReceiveScan;
window.simulateIssueScan = simulateIssueScan;
window.adminAddPvz = adminAddPvz;
window.adminDeletePvz = adminDeletePvz;
window.adminAddEmployee = adminAddEmployee;
window.adminDeleteEmployee = adminDeleteEmployee;
