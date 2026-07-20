// ===== КОРЗИНА В LOCALSTORAGE =====
const CART_KEY = 'marketplace_cart';

// ===== ПОЛУЧЕНИЕ КОРЗИНЫ =====
export function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch(e) {
        return [];
    }
}

// ===== СОХРАНЕНИЕ КОРЗИНЫ =====
export function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// ===== ДОБАВЛЕНИЕ В КОРЗИНУ =====
export function addToCart(product) {
    const cart = getCart();
    const existing = cart.findIndex(item => item.id === product.id);
    if (existing > -1) {
        cart.splice(existing, 1);
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, sellerId: product.sellerId });
    }
    saveCart(cart);
    return cart;
}

// ===== УДАЛЕНИЕ ИЗ КОРЗИНЫ =====
export function removeFromCart(productId) {
    const cart = getCart();
    const idx = cart.findIndex(item => item.id === productId);
    if (idx > -1) {
        cart.splice(idx, 1);
        saveCart(cart);
    }
    return cart;
}

// ===== ОЧИСТКА КОРЗИНЫ =====
export function clearCart() {
    saveCart([]);
}

// ===== ПОДСЧЁТ ТОВАРОВ =====
export function getCartCount() {
    return getCart().length;
}

// ===== ИТОГО В КОРЗИНЕ =====
export function getCartTotal() {
    const cart = getCart();
    return cart.reduce((sum, i) => sum + parseInt(i.price), 0);
}