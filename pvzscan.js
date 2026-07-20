import { db } from "./auth.js";
import { ref, get, update } from "firebase/database";

// ===== ПОИСК ПВЗ =====
export async function findPvz(login, password) {
    try {
        const snap = await get(ref(db, 'pvz'));
        if (snap.exists()) {
            const data = snap.val();
            for (const key in data) {
                if (data[key].login === login && data[key].password === password) {
                    return { success: true, pvz: { id: key, ...data[key] } };
                }
            }
        }
        return { success: false, error: 'ПВЗ не найден' };
    } catch(e) {
        return { success: false, error: e.message };
    }
}

// ===== ПРОВЕРКА QR-КОДА =====
export function processQRData(qrData, allOrders) {
    const orderId = qrData.orderId;
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
        return { success: false, error: 'Заказ не найден' };
    }
    if (order.status === 'received') {
        return { success: false, error: 'Заказ уже выдан' };
    }
    return { success: true, order: order };
}