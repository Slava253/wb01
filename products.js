import { db } from "./auth.js";
import { ref, set, get, child, push, onValue, remove } from "firebase/database";

// ===== ПОЛУЧЕНИЕ ВСЕХ ТОВАРОВ =====
export function getProducts(callback) {
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snap) => {
        const products = [];
        if (snap.exists()) {
            const data = snap.val();
            for (const key in data) {
                products.push({ id: key, ...data[key] });
            }
        }
        callback(products);
    });
}

// ===== ДОБАВЛЕНИЕ ТОВАРА =====
export async function addProduct(name, price, desc, sellerId, sellerName) {
    if (!name || !price) {
        return { success: false, error: 'Заполните название и цену' };
    }
    try {
        const newProduct = {
            name,
            price: String(price),
            desc: desc || '',
            sellerId: sellerId,
            sellerName: sellerName || 'Продавец',
            createdAt: Date.now()
        };
        const newRef = push(ref(db, 'products'));
        await set(newRef, newProduct);
        return { success: true, id: newRef.key };
    } catch(e) {
        return { success: false, error: e.message };
    }
}

// ===== УДАЛЕНИЕ ТОВАРА =====
export async function deleteProduct(productId) {
    try {
        await remove(ref(db, 'products/' + productId));
        return { success: true };
    } catch(e) {
        return { success: false, error: e.message };
    }
}

// ===== ПОЛУЧЕНИЕ ТОВАРОВ ПРОДАВЦА =====
export function getSellerProducts(sellerId, callback) {
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snap) => {
        const products = [];
        if (snap.exists()) {
            const data = snap.val();
            for (const key in data) {
                if (data[key].sellerId === sellerId) {
                    products.push({ id: key, ...data[key] });
                }
            }
        }
        callback(products);
    });
}