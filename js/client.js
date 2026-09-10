import { auth, db, collection, getDocs, addDoc, doc, updateDoc, query, where, serverTimestamp, money, esc } from "./firebase.js";
import { guard, logout } from "./auth.js";

let user, profile, products = [], cart = JSON.parse(localStorage.getItem("mp_cart") || "[]"), pvzs = [];
const view = document.querySelector("#clientView");

const saveCart = () => {
  localStorage.setItem("mp_cart", JSON.stringify(cart));
  document.querySelector("#cartCount").textContent = cart.reduce((a, x) => a + x.qty, 0);
};

document.querySelector("#logout").onclick = logout;
document.querySelectorAll(".navbtn[data-view]").forEach(b => b.onclick = () => render(b.dataset.view));

async function load() {
  products = (await getDocs(query(collection(db, "products"), where("active", "==", true)))).docs.map(d => ({ id: d.id, ...d.data() }));
  pvzs = (await getDocs(query(collection(db, "pvz"), where("active", "==", true)))).docs.map(d => ({ id: d.id, ...d.data() }));
  saveCart();
  render("catalog");
}

function render(type) {
  if (type === "catalog") view.innerHTML = `<section class="hero"><p class="eyebrow">MARKETPLACE</p><h1>Товары рядом с вами</h1><p>Заказывайте онлайн и забирайте в удобном ПВЗ.</p><input class="search" id="search" placeholder="Поиск товара..."></section><div id="products" class="products"></div>`;
  if (type === "cart") renderCart();
  if (type === "orders") renderOrders();
  if (type === "catalog") drawProducts(products);
}

function drawProducts(list) {
  const el = document.querySelector("#products");
  if (!el) return;
  el.innerHTML = list.length ? list.map(p => `<article class="product">
    <img class="product-img" src="${esc(p.image || "https://placehold.co/600x600?text=No+image")}">
    <div class="product-body">
      <h3>${esc(p.name)}</h3>
      <p class="muted">${esc(p.description || "")}</p>
      <div class="price">${money(p.price)}</div>
      <div class="card-actions">
        <button class="btn secondary" data-open="${p.id}">Подробнее</button>
        <button class="btn primary" data-add="${p.id}">В корзину</button>
      </div>
    </div>
  </article>`).join("") : "<div class='panel'>Товаров пока нет.</div>";

  el.querySelectorAll("[data-add]").forEach(b => b.onclick = () => {
    let p = products.find(x => x.id === b.dataset.add);
    let x = cart.find(x => x.id === p.id);
    x ? x.qty++ : cart.push({ id: p.id, qty: 1 });
    saveCart();
    alert("Товар добавлен в корзину");
  });
  el.querySelectorAll("[data-open]").forEach(b => b.onclick = () => openProduct(products.find(x => x.id === b.dataset.open)));

  document.querySelector("#search")?.addEventListener("input", e => drawProducts(products.filter(p => p.name.toLowerCase().includes(e.target.value.toLowerCase()))));
}

function openProduct(p) {
  document.querySelector("#productModal").classList.remove("hidden");
  document.querySelector("#productDetails").innerHTML = `
    <img class="product-img" src="${esc(p.image || "https://placehold.co/600x600?text=No+image")}">
    <h2>${esc(p.name)}</h2>
    <p>${esc(p.description || "")}</p>
    <p class="price">${money(p.price)}</p>
    <button class="btn primary full" id="modalAdd">Добавить в корзину</button>`;
  document.querySelector("#modalAdd").onclick = () => {
    let x = cart.find(x => x.id === p.id);
    x ? x.qty++ : cart.push({ id: p.id, qty: 1 });
    saveCart();
    document.querySelector("#productModal").classList.add("hidden");
  };
}
document.querySelector("#closeModal").onclick = () => document.querySelector("#productModal").classList.add("hidden");

function renderCart() {
  let total = cart.reduce((sum, x) => {
    let p = products.find(p => p.id === x.id);
    return sum + (p?.price || 0) * x.qty;
  }, 0);
  view.innerHTML = `
    <div class="toolbar"><h1>Корзина</h1></div>
    ${cart.length ? `<section class="panel">
      ${cart.map(x => {
        let p = products.find(p => p.id === x.id);
        return p ? `<div class="cart-row">
          <img src="${esc(p.image || "https://placehold.co/100")}">
          <div><b>${esc(p.name)}</b><div>${money(p.price)} × ${x.qty}</div></div>
          <button class="btn danger" data-del="${p.id}">Удалить</button>
        </div>` : "";
      }).join("")}
      <h2>Итого: ${money(total)}</h2>
      <label>Пункт выдачи</label>
      <select id="pvzSelect">${pvzs.map(p => `<option value="${p.id}">${esc(p.name)} — ${esc(p.address || "")}</option>`).join("")}</select>
      <button id="checkout" class="btn primary full">Оформить заказ</button>
    </section>` : "<section class='panel'>Корзина пуста.</section>"}`;
  view.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    cart = cart.filter(x => x.id !== b.dataset.del);
    saveCart();
    renderCart();
  });
  view.querySelector("#checkout")?.addEventListener("click", checkout);
}

async function checkout() {
  const pvz = document.querySelector("#pvzSelect").value;
  if (!pvz) return alert("Выберите ПВЗ");
  const items = cart.map(x => {
    let p = products.find(p => p.id === x.id);
    return { productId: p.id, name: p.name, price: Number(p.price), qty: x.qty };
  });
  const total = items.reduce((a, x) => a + x.price * x.qty, 0);
  const ref = await addDoc(collection(db, "orders"), {
    userId: user.uid,
    pvzId: pvz,
    items,
    total,
    status: "ready_for_pickup",
    createdAt: serverTimestamp()
  });
  cart = [];
  saveCart();
  alert("Заказ оформлен. Номер: " + ref.id);
  renderOrders();
}

async function renderOrders() {
  const snaps = await getDocs(query(collection(db, "orders"), where("userId", "==", user.uid)));
  const arr = snaps.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  view.innerHTML = `<h1>Мои заказы</h1>${arr.length ? arr.map(o => `<section class="order">
    <div class="order-head">
      <b>Заказ ${esc(o.id.slice(-8).toUpperCase())}</b>
      <span class="badge ${o.status === "picked_up" ? "success" : o.status === "returned" ? "return" : "warn"}">${statusRu(o.status)}</span>
    </div>
    <p>${o.items?.map(i => `${esc(i.name)} × ${i.qty}`).join("<br>")}</p>
    <b>${money(o.total)}</b>
    ${o.status === "ready_for_pickup" ? `<div class="qr-box"><canvas id="qr-${o.id}"></canvas><p class="small muted">Покажите QR сотруднику ПВЗ</p></div>` : ""}
  </section>`).join("") : "<section class='panel'>Заказов пока нет.</section>"}`;
  if (window.QRCode) arr.filter(o => o.status === "ready_for_pickup").forEach(o => QRCode.toCanvas(document.querySelector("#qr-" + o.id), o.id, { width: 230 }));
}

function statusRu(s) {
  return ({ created: "Создан", ready_for_pickup: "Готов к выдаче", picked_up: "Выдан", return_requested: "Возврат запрошен", returned: "Возвращён" })[s] || s;
}

guard("client", (u, p) => { user = u; profile = p; load(); });
