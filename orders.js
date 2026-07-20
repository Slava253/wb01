import { db } from "./auth.js";
import { ref, set, get, child, push, onValue, update } from "firebase/database";

// ===== СОЗДАНИЕ ЗАКАЗА =====
export async function createOrder(userId, userName, items) {
    if (!items || items.length === 0) {
        return { success: false, error: 'Корзина пуста' };
    }
    try {
        const order = {
            userId: userId,
            userName: userName || 'Клиент',
            items: items.map(item => ({ id: item.id, name: item.name, price: item.price })),
            total: items.reduce((sum, i) => sum + parseInt(i.price), 0),
            status: 'pending',
            createdAt: Date.now(),
            qrData: {
                userId: userId,
                items: items.map(item => ({ name: item.name, price: item.price }))
            }
        };
        const newRef = push(ref(db, 'orders'));
        await set(newRef, order);
        return { success: true, id: newRef.key };
    } catch(e) {
        return { success: false, error: e.message };
    }
}

// ===== ПОЛУЧЕНИЕ ЗАКАЗОВ =====
export function getOrders(callback) {
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snap) => {
        const orders = [];
        if (snap.exists()) {
            const data = snap.val();
            for (const key in data) {
                orders.push({ id: key, ...data[key] });
            }
        }
        callback(orders);
    });
}

// ===== ПОЛУЧЕНИЕ ЗАКАЗОВ ПОЛЬЗОВАТЕЛЯ =====
export function getUserOrders(userId, callback) {
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snap) => {
        const orders = [];
        if (snap.exists()) {
            const data = snap.val();
            for (const key in data) {
                if (data[key].userId === userId) {
                    orders.push({ id: key, ...data[key] });
                }
            }
        }
        callback(orders);
    });
}

// ===== ВЫДАЧА ЗАКАЗА (ПВЗ) =====
export async function receiveOrder(orderId) {
    try {
        await update(ref(db, 'orders/' + orderId), { status: 'received' });
        return { success: true };
    } catch(e) {
        return { success: false, error: e.message };
    }
}

// ===== ПОЛУЧЕНИЕ ЗАКАЗА ПО ID =====
export async function getOrderById(orderId) {
    try {
        const snap = await get(ref(db, 'orders/' + orderId));
        if (snap.exists()) {
            return { success: true, order: { id: orderId, ...snap.val() } };
        }
        return { success: false, error: 'Заказ не найден' };
    } catch(e) {
        return { success: false, error: e.message };
    }
}