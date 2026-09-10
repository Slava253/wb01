import {
    onAuthStateChanged,
    signOut
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
}
from "./firebase.js";


let currentUser = null;


/* ================================================= */
/* АВТОРИЗАЦИЯ */
/* ================================================= */

onAuthStateChanged(
    auth,
    async function(user) {

        if (!user) {

            location.href =
                "index.html";

            return;

        }


        currentUser = user;


        try {

            const reference =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const snapshot =
                await getDoc(
                    reference
                );


            if (!snapshot.exists()) {

                await signOut(auth);

                location.href =
                    "index.html";

                return;

            }


            const profile =
                snapshot.data();


            if (
                profile.role !==
                "client"
            ) {

                /*
                 * Админ или ПВЗ
                 * не должны находиться
                 * в кабинете клиента.
                 */

                if (
                    profile.role ===
                    "admin"
                    ||
                    profile.role ===
                    "pvz"
                ) {

                    location.href =
                        "admin.html";

                    return;

                }


                await signOut(auth);

                location.href =
                    "index.html";

                return;

            }


            document
                .getElementById(
                    "userEmail"
                )
                .textContent =
                user.phoneNumber ||
                "Клиент";


            loadOrders();

        }

        catch (error) {

            console.error(error);

        }

    }
);


/* ================================================= */
/* ВЫХОД */
/* ================================================= */

document
    .getElementById(
        "logoutButton"
    )
    .onclick =
    async function() {

        await signOut(auth);

        location.href =
            "index.html";

    };


/* ================================================= */
/* СОЗДАНИЕ ЗАКАЗА */
/* ================================================= */

document
    .getElementById(
        "createOrderForm"
    )
    .onsubmit =
    async function(event) {

        event.preventDefault();


        const name =
            document
                .getElementById(
                    "productName"
                )
                .value
                .trim();


        const description =
            document
                .getElementById(
                    "productDescription"
                )
                .value
                .trim();


        if (!name) {

            alert(
                "Введите название товара."
            );

            return;

        }


        const orderNumber =
            "PVZ-"
            +
            Date.now()
                .toString()
                .slice(-8);


        try {

            await addDoc(
                collection(
                    db,
                    "orders"
                ),
                {

                    orderNumber,

                    userId:
                        currentUser.uid,

                    customerPhone:
                        currentUser.phoneNumber,

                    productName:
                        name,

                    description,

                    status:
                        "created",

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                }
            );


            document
                .getElementById(
                    "createOrderForm"
                )
                .reset();


            alert(
                "Заказ создан: "
                + orderNumber
            );

        }

        catch (error) {

            alert(
                "Ошибка создания заказа: "
                + error.message
            );

        }

    };


/* ================================================= */
/* ЗАГРУЗКА ЗАКАЗОВ */
/* ================================================= */

function loadOrders() {

    const q =
        query(

            collection(
                db,
                "orders"
            ),

            where(
                "userId",
                "==",
                currentUser.uid
            )

        );


    onSnapshot(
        q,
        function(snapshot) {

            const orders = [];


            snapshot.forEach(
                function(orderDoc) {

                    orders.push({

                        id:
                            orderDoc.id,

                        ...orderDoc.data()

                    });

                }
            );


            const container =
                document.getElementById(
                    "ordersList"
                );


            if (!orders.length) {

                container.innerHTML =
                    "<p>Заказов пока нет.</p>";

                return;

            }


            container.innerHTML =
                orders
                    .map(
                        orderCard
                    )
                    .join("");

        }
    );

}


/* ================================================= */
/* КАРТОЧКА ЗАКАЗА */
/* ================================================= */

function orderCard(order) {

    return `

        <div class="order-card">

            <div>

                <strong>
                    ${order.orderNumber}
                </strong>

                <div>
                    ${escapeHtml(
                        order.productName
                    )}
                </div>

                <span class="status-badge">

                    ${getStatus(
                        order.status
                    )}

                </span>

            </div>


            <a
                class="button secondary"
                href="order.html?id=${order.id}">

                Открыть

            </a>

        </div>

    `;

}


/* ================================================= */
/* СТАТУС */
/* ================================================= */

function getStatus(status) {

    const statuses = {

        created:
            "Создан",

        waiting:
            "Ожидает поступления",

        arrived:
            "Прибыл в ПВЗ",

        ready:
            "Готов к выдаче",

        issued:
            "Выдан"

    };


    return (
        statuses[status]
        ||
        status
    );

}


/* ================================================= */
/* БЕЗОПАСНЫЙ ТЕКСТ */
/* ================================================= */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
