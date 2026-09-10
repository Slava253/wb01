import { db, collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp, money, esc } from "./firebase.js";
import { guard, logout } from "./auth.js";

let user, profile, pvzs = [], employees = [], products = [], orders = [];

document.querySelector("#logout").onclick = logout;
document.querySelectorAll("[data-admin-view]").forEach(b => b.onclick = () => render(b.dataset.adminView));

function modal(html) {
  document.querySelector("#adminModalContent").innerHTML = html;
  document.querySelector("#adminModal").classList.remove("hidden");
}
document.querySelector("#closeAdminModal").onclick = () => document.querySelector("#adminModal").classList.add("hidden");

async function load() {
  await Promise.all([loadPvz(), loadEmployees(), loadProducts(), loadOrders()]);
  render("dashboard");
}

async function loadPvz() {
  pvzs = (await getDocs(collection(db, "pvz"))).docs.map(d => ({ id: d.id, ...d.data() }));
}
async function loadEmployees() {
  employees = (await getDocs(query(collection(db, "users"), where("role", "==", "employee")))).docs.map(d => ({ id: d.id, ...d.data() }));
}
async function loadProducts() {
  products = (await getDocs(collection(db, "products"))).docs.map(d => ({ id: d.id, ...d.data() }));
}
async function loadOrders() {
  try {
    orders = (await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(200)))).docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    // Если нет индекса по createdAt — читаем без сортировки
    orders = (await getDocs(query(collection(db, "orders"), limit(200)))).docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

function render(t) {
  if (t === "dashboard") renderDashboard();
  if (t === "pvz") renderPvz();
  if (t === "employees") renderEmployees();
  if (t === "products") renderProducts();
  if (t === "orders") renderOrders();
}

function renderDashboard() {
  document.querySelector("#adminView").innerHTML = `
    <h1>Администратор</h1>
    <div class="stat-grid">
      <div class="stat"><span>ПВЗ</span><br><b>${pvzs.length}</b></div>
      <div class="stat"><span>Сотрудники</span><br><b>${employees.length}</b></div>
      <div class="stat"><span>Товары</span><br><b>${products.length}</b></div>
      <div class="stat"><span>Заказы</span><br><b>${orders.length}</b></div>
    </div>`;
}

function renderPvz() {
  document.querySelector("#adminView").innerHTML = `
    <div class="toolbar"><h1>Пункты выдачи</h1><button id="addPvz" class="btn primary">+ Создать ПВЗ</button></div>
    <section class="panel table-wrap"><table class="table">
      <tr><th>Название</th><th>Адрес</th><th>Статус</th><th></th></tr>
      ${pvzs.map(p => `<tr>
        <td>${esc(p.name)}</td>
        <td>${esc(p.address || "")}</td>
        <td>${p.active !== false ? "Активен" : "Выключен"}</td>
        <td><button class="btn secondary" data-pvz="${p.id}">Изменить</button></td>
      </tr>`).join("")}
    </table></section>`;
  document.querySelector("#addPvz").onclick = () => pvzForm();
  document.querySelectorAll("[data-pvz]").forEach(b => b.onclick = () => pvzForm(pvzs.find(x => x.id === b.dataset.pvz)));
}

function pvzForm(p = {}) {
  modal(`
    <h2>${p.id ? "Изменить" : "Создать"} ПВЗ</h2>
    <label>Название</label><input id="fName" value="${esc(p.name || "")}">
    <label>Адрес</label><input id="fAddress" value="${esc(p.address || "")}">
    <label>Активен</label>
    <select id="fActive">
      <option value="true" ${p.active !== false ? "selected" : ""}>Да</option>
      <option value="false" ${p.active === false ? "selected" : ""}>Нет</option>
    </select>
    <button id="save" class="btn primary full">Сохранить</button>
    <p id="pvzError" class="error"></p>`);
  document.querySelector("#save").onclick = async () => {
    const err = document.querySelector("#pvzError");
    try {
      const data = {
        name: document.querySelector("#fName").value.trim(),
        address: document.querySelector("#fAddress").value.trim(),
        active: document.querySelector("#fActive").value === "true",
        updatedAt: serverTimestamp()
      };
      if (!data.name) throw new Error("Введите название ПВЗ");
      if (p.id) await updateDoc(doc(db, "pvz", p.id), data);
      else await addDoc(collection(db, "pvz"), { ...data, createdAt: serverTimestamp() });
      document.querySelector("#adminModal").classList.add("hidden");
      await loadPvz();
      renderPvz();
    } catch (e) { err.textContent = e.message; }
  };
}

function renderEmployees() {
  document.querySelector("#adminView").innerHTML = `
    <div class="toolbar"><h1>Сотрудники</h1><button id="addEmp" class="btn primary">+ Добавить сотрудника</button></div>
    <section class="panel table-wrap"><table class="table">
      <tr><th>Логин</th><th>Имя</th><th>ПВЗ</th><th>Статус</th></tr>
      ${employees.map(e => `<tr>
        <td>${esc(e.login || "")}</td>
        <td>${esc(e.name || "")}</td>
        <td>${esc(pvzs.find(p => p.id === e.pvzId)?.name || "—")}</td>
        <td>${e.active !== false ? "Активен" : "Заблокирован"}</td>
      </tr>`).join("")}
    </table></section>`;
  document.querySelector("#addEmp").onclick = employeeForm;
}

async function employeeForm() {
  modal(`
    <h2>Новый сотрудник</h2>
    <p class="muted small">Логин станет email <b>логин@marketpoint.local</b>. Пароль сообщите сотруднику.</p>
    <label>Логин</label><input id="eLogin" placeholder="pvz001">
    <label>Пароль</label><input id="ePass" type="password" placeholder="Минимум 6 символов">
    <label>Имя сотрудника</label><input id="eName">
    <label>ПВЗ</label>
    <select id="ePvz">${pvzs.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>
    <button id="saveEmp" class="btn primary full">Создать</button>
    <p id="empError" class="error"></p>`);

  document.querySelector("#saveEmp").onclick = async () => {
    const err = document.querySelector("#empError");
    err.textContent = "";
    try {
      const login = document.querySelector("#eLogin").value.trim().toLowerCase();
      const pass = document.querySelector("#ePass").value;
      const name = document.querySelector("#eName").value.trim();
      const pvzId = document.querySelector("#ePvz").value;
      if (!login || !pass || !name) throw new Error("Заполните все поля");
      if (pass.length < 6) throw new Error("Пароль минимум 6 символов");

      // ВНИМАНИЕ: Firebase клиентский SDK не может создавать других пользователей,
      // не выходя из аккаунта админа. Поэтому здесь мы показываем инструкцию.
      err.innerHTML = `Создайте пользователя в Firebase Console вручную:<br>
        1. Authentication → Users → Add user<br>
        2. Email: <b>${login}@marketpoint.local</b><br>
        3. Пароль: тот, что вы ввели<br>
        4. Скопируйте UID<br>
        5. Firestore → users → создайте документ с ID = UID и полями:<br>
        <code>{"role":"employee","login":"${login}","name":"${name}","pvzId":"${pvzId}","active":true}</code>`;
    } catch (e) { err.textContent = e.message; }
  };
}

function renderProducts() {
  document.querySelector("#adminView").innerHTML = `
    <div class="toolbar"><h1>Товары</h1><button id="addProduct" class="btn primary">+ Добавить товар</button></div>
    <section class="panel table-wrap"><table class="table">
      <tr><th>Товар</th><th>Цена</th><th>Остаток</th><th>Активен</th><th></th></tr>
      ${products.map(p => `<tr>
        <td>${esc(p.name)}</td>
        <td>${money(p.price)}</td>
        <td>${p.stock ?? 0}</td>
        <td>${p.active !== false ? "Да" : "Нет"}</td>
        <td><button class="btn secondary" data-prod="${p.id}">Изменить</button></td>
      </tr>`).join("")}
    </table></section>`;
  document.querySelector("#addProduct").onclick = () => productForm();
  document.querySelectorAll("[data-prod]").forEach(b => b.onclick = () => productForm(products.find(x => x.id === b.dataset.prod)));
}

function productForm(p = {}) {
  modal(`
    <h2>${p.id ? "Изменить" : "Добавить"} товар</h2>
    <label>Название</label><input id="pName" value="${esc(p.name || "")}">
    <label>Цена, ₽</label><input id="pPrice" type="number" value="${p.price || 0}">
    <label>Остаток</label><input id="pStock" type="number" value="${p.stock ?? 0}">
    <label>URL изображения</label><input id="pImage" value="${esc(p.image || "")}">
    <label>Описание</label><textarea id="pDesc">${esc(p.description || "")}</textarea>
    <label>Активен</label>
    <select id="pActive">
      <option value="true" ${p.active !== false ? "selected" : ""}>Да</option>
      <option value="false" ${p.active === false ? "selected" : ""}>Нет</option>
    </select>
    <button id="saveProd" class="btn primary full">Сохранить</button>
    <p id="prodError" class="error"></p>`);
  document.querySelector("#saveProd").onclick = async () => {
    const err = document.querySelector("#prodError");
    try {
      const d = {
        name: document.querySelector("#pName").value.trim(),
        price: Number(document.querySelector("#pPrice").value) || 0,
        stock: Number(document.querySelector("#pStock").value) || 0,
        image: document.querySelector("#pImage").value.trim(),
        description: document.querySelector("#pDesc").value.trim(),
        active: document.querySelector("#pActive").value === "true",
        updatedAt: serverTimestamp()
      };
      if (!d.name) throw new Error("Введите название товара");
      if (p.id) await updateDoc(doc(db, "products", p.id), d);
      else await addDoc(collection(db, "products"), { ...d, createdAt: serverTimestamp() });
      document.querySelector("#adminModal").classList.add("hidden");
      await loadProducts();
      renderProducts();
    } catch (e) { err.textContent = e.message; }
  };
}

function renderOrders() {
  document.querySelector("#adminView").innerHTML = `
    <h1>Все заказы</h1>
    <section class="panel table-wrap"><table class="table">
      <tr><th>Заказ</th><th>ПВЗ</th><th>Сумма</th><th>Статус</th></tr>
      ${orders.map(o => `<tr>
        <td>${esc(o.id.slice(-10).toUpperCase())}</td>
        <td>${esc(pvzs.find(p => p.id === o.pvzId)?.name || "—")}</td>
        <td>${money(o.total)}</td>
        <td>${statusRu(o.status)}</td>
      </tr>`).join("")}
    </table></section>`;
}

function statusRu(s) {
  return ({ ready_for_pickup: "Готов к выдаче", picked_up: "Выдан", returned: "Возвращён", return_requested: "Возврат запрошен", created: "Создан" })[s] || s;
}

guard("admin", (u, p) => { user = u; profile = p; load(); });
