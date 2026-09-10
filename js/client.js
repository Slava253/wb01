import {
    collection,
    addDoc,
    query,
    where,
    getDocs
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
}
from "./firebase.js";


/* =========================================
   ПРОВЕРКА КЛИЕНТА
========================================= */

const currentUser =
    JSON.parse(
        localStorage.getItem(
            "pvzUser"
        )
    );


if (!currentUser) {

    location.href =
        "index.html";

    throw new Error(
        "Пользователь не авторизован."
    );

}


if (
    currentUser.role !==
    "client"
) {

    location.href =
        "index.html";

    throw new Error(
        "Нет доступа."
    );

}


/* =========================================
   ЭЛЕМЕНТЫ
========================================= */

const userPhone =
    document.getElementById(
        "userEmail"
    );


const ordersList =
    document.getElementById(
        "ordersList"
    );


const createOrderForm =
    document.getElementById(
        "createOrderForm"
    );


const productName =
    document.getElementById(
        "productName"
    );


const productDescription =
    document.getElementById(
        "productDescription"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


/* =========================================
   ТЕЛЕФОН
========================================= */

if (userPhone) {

    userPhone.textContent =
        currentUser.phone;

}


/* =========================================
   СТАТУСЫ
========================================= */

const statuses = {

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


/* =========================================
   ЭКРАНИРОВАНИЕ
========================================= */

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


/* =========================================
   НОМЕР ЗАКАЗА
========================================= */

function generateOrderNumber() {

    const random =
        Math.floor(
            100000 +
            Math.random() * 900000
        );


    return (
        "PVZ-" +
        Date.now() +
        "-" +
        random
    );

}


/* =========================================
   СОЗДАНИЕ ЗАКАЗА
========================================= */

createOrderForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const name =
            productName.value.trim();


        const description =
            productDescription
                .value
                .trim();


        if (!name) {

            alert(
                "Введите название товара."
            );

            return;

        }


        try {

            const orderNumber =
                generateOrderNumber();


            const order =
                {

                    orderNumber:
                        orderNumber,

                    userId:
                        currentUser.id,

                    customerPhone:
                        currentUser.phone,

                    productName:
                        name,

                    description:
                        description,

                    status:
                        "created",

                    createdAt:
                        new Date()
                        .toISOString(),

                    updatedAt:
                        new Date()
                        .toISOString()

                };


            const result =
                await addDoc(
                    collection(
                        db,
                        "orders"
                    ),
                    order
                );


            productName.value =
                "";


            productDescription.value =
                "";


            alert(
                "Заказ создан."
            );


            location.href =
                "order.html?id=" +
                encodeURIComponent(
                    result.id
                );

        } catch (error) {

            console.error(error);


            alert(
                "Ошибка создания заказа: " +
                error.message
            );

        }

    }
);


/* =========================================
   ЗАГРУЗКА ЗАКАЗОВ
========================================= */

async function loadOrders() {

    ordersList.innerHTML =
        "<p>Загрузка заказов...</p>";


    try {

        const ordersQuery =
            query(
                collection(
                    db,
                    "orders"
                ),
                where(
                    "userId",
                    "==",
                    currentUser.id
                )
            );


        const snapshot =
            await getDocs(
                ordersQuery
            );


        const orders =
            snapshot.docs.map(
                function(item) {

                    return {

                        id:
                            item.id,

                        ...item.data()

                    };

                }
            );


        orders.sort(
            function(a, b) {

                return String(
                    b.createdAt || ""
                ).localeCompare(
                    String(
                        a.createdAt || ""
                    )
                );

            }
        );


        if (
            orders.length === 0
        ) {

            ordersList.innerHTML =
                "<p class='muted'>" +
                "У вас пока нет заказов." +
                "</p>";

            return;

        }


        ordersList.innerHTML =
            orders
                .map(
                    createOrderCard
                )
                .join("");


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


/* =========================================
   КАРТОЧКА ЗАКАЗА
========================================= */

function createOrderCard(order) {

    const status =
        statuses[
            order.status
        ] ||
        "Неизвестный статус";


    return `

        <div class="order-card">

            <h3>
                ${escapeHtml(
                    order.orderNumber
                )}
            </h3>


            <p>

                <strong>
                    Товар:
                </strong>

                ${escapeHtml(
                    order.productName
                )}

            </p>


            <p>

                <strong>
                    Статус:
                </strong>

                ${escapeHtml(
                    status
                )}

            </p>


            ${
                order.description
                    ? `
                        <p>
                            <strong>
                                Описание:
                            </strong>

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


/* =========================================
   ОТКРЫТИЕ ЗАКАЗА
========================================= */

window.openOrder =
    function(id) {

        location.href =
            "order.html?id=" +
            encodeURIComponent(
                id
            );

    };


/* =========================================
   ВЫХОД
========================================= */

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


/* =========================================
   ЗАПУСК
========================================= */

loadOrders();
