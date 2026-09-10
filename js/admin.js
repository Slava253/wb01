import {
    collection,
    getDocs,
    query,
    where
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
}
from "./firebase.js";


/* ==========================================
   ПРОВЕРКА ВХОДА
========================================== */

const currentUser =
    JSON.parse(
        localStorage.getItem("pvzUser")
    );


if (!currentUser) {

    location.href = "index.html";

    throw new Error(
        "Пользователь не авторизован."
    );

}


if (
    currentUser.role !== "admin" &&
    currentUser.role !== "pvz"
) {

    location.href = "index.html";

    throw new Error(
        "Нет доступа."
    );

}


/* ==========================================
   ЭЛЕМЕНТЫ
========================================== */

const ordersList =
    document.getElementById(
        "ordersList"
    );


const searchInput =
    document.getElementById(
        "search"
    );


const allCount =
    document.getElementById(
        "allCount"
    );


const arrivedCount =
    document.getElementById(
        "arrivedCount"
    );


const readyCount =
    document.getElementById(
        "readyCount"
    );


const issuedCount =
    document.getElementById(
        "issuedCount"
    );


/* ==========================================
   СТАТУСЫ
========================================== */

const statusNames = {

    created:
        "Заказ создан",

    waiting:
        "Ожидает отправки",

    arrived:
        "Прибыл в ПВЗ",

    ready:
        "Готов к выдаче",

    issued:
        "Выдан"

};


/* ==========================================
   ВСЕ ЗАКАЗЫ
========================================== */

let allOrders = [];


/* ==========================================
   ПОКАЗ ПОЛЬЗОВАТЕЛЯ
========================================== */

const userElement =
    document.getElementById(
        "userEmail"
    );


if (userElement) {

    if (
        currentUser.role ===
        "admin"
    ) {

        userElement.textContent =
            "Администратор";

    } else {

        userElement.textContent =
            currentUser.name ||
            currentUser.login ||
            "ПВЗ";

    }

}


/* ==========================================
   ЭКРАНИРОВАНИЕ HTML
========================================== */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* ==========================================
   ЗАГРУЗКА ЗАКАЗОВ
========================================== */

async function loadOrders() {

    if (!ordersList) {
        return;
    }


    ordersList.innerHTML =
        "<p>Загрузка заказов...</p>";


    try {

        const ordersQuery =
            query(
                collection(
                    db,
                    "orders"
                )
            );


        const snapshot =
            await getDocs(
                ordersQuery
            );


        allOrders =
            snapshot.docs.map(
                function(document) {

                    return {

                        id:
                            document.id,

                        ...document.data()

                    };

                }
            );


        /*
         * Сначала новые заказы.
         */

        allOrders.sort(
            function(a, b) {

                const aTime =
                    a.createdAt &&
                    a.createdAt.toMillis
                        ? a.createdAt.toMillis()
                        : 0;


                const bTime =
                    b.createdAt &&
                    b.createdAt.toMillis
                        ? b.createdAt.toMillis()
                        : 0;


                return bTime - aTime;

            }
        );


        updateStatistics();


        renderOrders(
            allOrders
        );


    } catch (error) {

        console.error(error);


        ordersList.innerHTML =
            "<p>" +
            "Ошибка загрузки заказов: " +
            escapeHtml(
                error.message
            ) +
            "</p>";

    }

}


/* ==========================================
   СТАТИСТИКА
========================================== */

function updateStatistics() {

    if (allCount) {

        allCount.textContent =
            allOrders.length;

    }


    if (arrivedCount) {

        arrivedCount.textContent =
            allOrders.filter(
                function(order) {

                    return (
                        order.status ===
                        "arrived"
                    );

                }
            ).length;

    }


    if (readyCount) {

        readyCount.textContent =
            allOrders.filter(
                function(order) {

                    return (
                        order.status ===
                        "ready"
                    );

                }
            ).length;

    }


    if (issuedCount) {

        issuedCount.textContent =
            allOrders.filter(
                function(order) {

                    return (
                        order.status ===
                        "issued"
                    );

                }
            ).length;

    }

}


/* ==========================================
   ОТОБРАЖЕНИЕ ЗАКАЗОВ
========================================== */

function renderOrders(
    orders
) {

    if (!ordersList) {
        return;
    }


    if (orders.length === 0) {

        ordersList.innerHTML =
            "<p class='muted'>" +
            "Заказы не найдены." +
            "</p>";

        return;

    }


    ordersList.innerHTML =
        orders
            .map(
                createOrderCard
            )
            .join("");

}


/* ==========================================
   КАРТОЧКА
========================================== */

function createOrderCard(
    order
) {

    const status =
        statusNames[
            order.status
        ] ||
        order.status ||
        "Неизвестно";


    const phone =
        order.customerPhone ||
        "Не указан";


    return `

        <div class="order-card">

            <h3>
                ${escapeHtml(
                    order.orderNumber
                )}
            </h3>


            <p>
                <strong>Товар:</strong>
                ${escapeHtml(
                    order.productName
                )}
            </p>


            <p>
                <strong>Телефон клиента:</strong>
                ${escapeHtml(
                    phone
                )}
            </p>


            <p>
                <strong>Статус:</strong>
                ${escapeHtml(
                    status
                )}
            </p>


            ${
                order.description
                    ? `
                    <p>
                        <strong>Описание:</strong>
                        ${escapeHtml(
                            order.description
                        )}
                    </p>
                    `
                    : ""
            }


            <button
                class="button"
                onclick="openOrder('${order.id}')">

                Открыть заказ

            </button>

        </div>

    `;

}


/* ==========================================
   ПОИСК
========================================== */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function() {

            const search =
                searchInput.value
                    .trim()
                    .toLowerCase();


            if (!search) {

                renderOrders(
                    allOrders
                );

                return;

            }


            const filtered =
                allOrders.filter(
                    function(order) {

                        const orderNumber =
                            String(
                                order.orderNumber ||
                                ""
                            ).toLowerCase();


                        const phone =
                            String(
                                order.customerPhone ||
                                ""
                            ).toLowerCase();


                        const product =
                            String(
                                order.productName ||
                                ""
                            ).toLowerCase();


                        const description =
                            String(
                                order.description ||
                                ""
                            ).toLowerCase();


                        return (
                            orderNumber.includes(
                                search
                            ) ||

                            phone.includes(
                                search
                            ) ||

                            product.includes(
                                search
                            ) ||

                            description.includes(
                                search
                            )
                        );

                    }
                );


            renderOrders(
                filtered
            );

        }
    );

}


/* ==========================================
   ОТКРЫТЬ ЗАКАЗ
========================================== */

window.openOrder =
    function(orderId) {

        location.href =
            "admin-order.html?id=" +
            encodeURIComponent(
                orderId
            );

    };


/* ==========================================
   ВЫХОД
========================================== */

const logoutButton =
    document.getElementById(
        "logoutButton"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function() {

            localStorage.removeItem(
                "pvzUser"
            );


            location.href =
                "index.html";

        }
    );

}


/* ==========================================
   ЗАПУСК
========================================== */

loadOrders();
