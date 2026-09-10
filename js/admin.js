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
    query,
    onSnapshot
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
}
from "./firebase.js";


let allOrders = [];

let currentRole = null;


/* ================================================= */
/* ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ */
/* ================================================= */

onAuthStateChanged(
    auth,
    async function(user) {

        if (!user) {

            location.href =
                "index.html";

            return;

        }


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


            currentRole =
                profile.role;


            if (
                currentRole !== "admin"
                &&
                currentRole !== "pvz"
            ) {

                location.href =
                    "client.html";

                return;

            }


            loadOrders();

        }

        catch (error) {

            console.error(error);

            alert(
                "Не удалось проверить роль пользователя."
            );

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
/* ЗАКАЗЫ */
/* ================================================= */

function loadOrders() {

    const q =
        query(
            collection(
                db,
                "orders"
            )
        );


    onSnapshot(
        q,
        function(snapshot) {

            allOrders = [];


            snapshot.forEach(
                function(orderDoc) {

                    allOrders.push({

                        id:
                            orderDoc.id,

                        ...orderDoc.data()

                    });

                }
            );


            render();

        }
    );

}


/* ================================================= */
/* ОТОБРАЖЕНИЕ */
/* ================================================= */

function render() {

    const search =
        document
            .getElementById(
                "search"
            )
            .value
            .toLowerCase()
            .trim();


    const filtered =
        allOrders.filter(
            function(order) {

                return (

                    String(
                        order.orderNumber
                    )
                    .toLowerCase()
                    .includes(search)

                    ||

                    String(
                        order.customerPhone
                    )
                    .toLowerCase()
                    .includes(search)

                    ||

                    String(
                        order.productName
                    )
                    .toLowerCase()
                    .includes(search)

                );

            }
        );


    document
        .getElementById(
            "allCount"
        )
        .textContent =
        allOrders.length;


    document
        .getElementById(
            "arrivedCount"
        )
        .textContent =
        count("arrived");


    document
        .getElementById(
            "readyCount"
        )
        .textContent =
        count("ready");


    document
        .getElementById(
            "issuedCount"
        )
        .textContent =
        count("issued");


    const container =
        document.getElementById(
            "ordersList"
        );


    if (!filtered.length) {

        container.innerHTML =
            "<p>Заказы не найдены.</p>";

        return;

    }


    container.innerHTML =
        filtered
            .map(
                function(order) {

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

                                <small>
                                    ${escapeHtml(
                                        order.customerPhone || ""
                                    )}
                                </small>

                                <br>

                                <span class="status-badge">

                                    ${getStatus(
                                        order.status
                                    )}

                                </span>

                            </div>


                            <a
                                class="button secondary"
                                href="admin-order.html?id=${order.id}">

                                Открыть

                            </a>

                        </div>

                    `;

                }
            )
            .join("");

}


/* ================================================= */
/* ПОИСК */
/* ================================================= */

document
    .getElementById(
        "search"
    )
    .addEventListener(
        "input",
        render
    );


/* ================================================= */
/* СТАТИСТИКА */
/* ================================================= */

function count(status) {

    return allOrders.filter(
        function(order) {

            return (
                order.status === status
            );

        }
    ).length;

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
/* HTML */
/* ================================================= */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
