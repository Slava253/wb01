import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
}
from "./firebase.js";


/* ==========================================
   ПОЛЬЗОВАТЕЛЬ
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


if (currentUser.role !== "client") {

    location.href = "index.html";

    throw new Error(
        "Доступ разрешён только клиенту."
    );

}


/* ==========================================
   ЭЛЕМЕНТЫ СТРАНИЦЫ
========================================== */

const userPhoneElement =
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


const productNameInput =
    document.getElementById(
        "productName"
    );


const productDescriptionInput =
    document.getElementById(
        "productDescription"
    );


/* ==========================================
   ПОКАЗЫВАЕМ ТЕЛЕФОН
========================================== */

if (userPhoneElement) {

    userPhoneElement.textContent =
        currentUser.phone || "";

}


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
   ЭКРАНИРОВАНИЕ HTML
========================================== */

function escapeHtml(value) {

    if (value === null ||
        value === undefined) {

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
   СООБЩЕНИЯ
========================================== */

function showMessage(
    text,
    type = ""
) {

    let element =
        document.getElementById(
            "clientMessage"
        );


    if (!element) {

        element =
            document.createElement(
                "div"
            );

        element.id =
            "clientMessage";

        element.className =
            "message";


        if (createOrderForm) {

            createOrderForm
                .parentNode
                .insertBefore(
                    element,
                    createOrderForm
                );

        }

    }


    element.textContent =
        text;


    element.className =
        "message " + type;

}


/* ==========================================
   СОЗДАНИЕ НОМЕРА ЗАКАЗА
========================================== */

function generateOrderNumber() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    const random =
        Math.floor(
            100000 +
            Math.random() * 900000
        );


    return (
        "PVZ-" +
        year +
        month +
        day +
        "-" +
        random
    );

}


/* ==========================================
   СОЗДАНИЕ ЗАКАЗА
========================================== */

if (createOrderForm) {

    createOrderForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const productName =
                productNameInput
                    ? productNameInput.value.trim()
                    : "";


            const description =
                productDescriptionInput
                    ? productDescriptionInput.value.trim()
                    : "";


            if (!productName) {

                showMessage(
                    "Введите название товара."
                );

                return;

            }


            try {

                showMessage(
                    "Создаём заказ..."
                );


                const orderNumber =
                    generateOrderNumber();


                const orderData = {

                    orderNumber:
                        orderNumber,

                    userId:
                        currentUser.id,

                    customerPhone:
                        currentUser.phone,

                    productName:
                        productName,

                    description:
                        description,

                    status:
                        "created",

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                };


                const orderReference =
                    await addDoc(
                        collection(
                            db,
                            "orders"
                        ),
                        orderData
                    );


                showMessage(
                    "Заказ успешно создан."
                );


                if (productNameInput) {

                    productNameInput.value =
                        "";

                }


                if (productDescriptionInput) {

                    productDescriptionInput.value =
                        "";

                }


                await loadOrders();


                /*
                 * Переходим на страницу
                 * созданного заказа
                 */

                setTimeout(
                    function() {

                        location.href =
                            "order.html?id=" +
                            encodeURIComponent(
                                orderReference.id
                            );

                    },
                    500
                );


            } catch (error) {

                console.error(error);


                showMessage(
                    "Не удалось создать заказ: " +
                    error.message
                );

            }

        }
    );

}


/* ==========================================
   ЗАГРУЗКА ЗАКАЗОВ КЛИЕНТА
========================================== */

async function loadOrders() {

    if (!ordersList) {
        return;
    }


    ordersList.innerHTML =
        "<p>Загрузка заказов...</p>";


    try {

        /*
         * Получаем заказы только
         * текущего клиента.
         */

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
                function(document) {

                    return {

                        id:
                            document.id,

                        ...document.data()

                    };

                }
            );


        /*
         * Сортировка на стороне сайта.
         * Так не требуется индекс Firestore.
         */

        orders.sort(
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


        if (orders.length === 0) {

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


/* ==========================================
   КАРТОЧКА ЗАКАЗА
========================================== */

function createOrderCard(order) {

    const status =
        statusNames[
            order.status
        ] ||
        order.status ||
        "Неизвестно";


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
   ОТКРЫТИЕ ЗАКАЗА
========================================== */

window.openOrder =
    function(orderId) {

        location.href =
            "order.html?id=" +
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
