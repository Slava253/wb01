// ===== ГЕНЕРАЦИЯ QR-КОДА =====
export function generateQR(container, data) {
    container.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
        new QRCode(container, {
            text: JSON.stringify(data),
            width: 200,
            height: 200,
            colorDark: "#0f3b5f",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        return true;
    } else {
        container.innerHTML = '<p style="color:#94a3b8;">Загрузка QR-библиотеки...</p>';
        return false;
    }
}

// ===== ПАРСИНГ QR-ДАННЫХ =====
export function parseQRData(text) {
    try {
        return JSON.parse(text);
    } catch(e) {
        return null;
    }
}

// ===== СОЗДАНИЕ QR-ДАННЫХ ДЛЯ ЗАКАЗА =====
export function createQRData(order) {
    return {
        orderId: order.id,
        userId: order.userId,
        items: order.items.map(i => ({ name: i.name, price: i.price })),
        total: order.total
    };
}