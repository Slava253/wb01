import {
    onAuthStateChanged,
    signOut
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
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


document
    .getElementById("logoutButton")
    .onclick =
    async function () {

        await signOut(auth);

        location.href =
            "index.html";

    };


onAuthStateChanged(
    auth,
    function (user) {

        if (!user) {

            location.href =
                "index.html";

            return;

        }


        loadOrders();

    }
);


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
        function (snapshot) {

            allOrders = [];


            snapshot.forEach(
                function (doc) {

                    allOrders.push({

                        id:
                            doc.id,

                        ...doc.data()

                    });

                }
            );


            render();

        }
    );

}


function render() {

    const search =
        document
            .getElementById("search")
            .value
            .toLowerCase()
            .trim();


    const filtered =
        allOrders.filter(
            function (order) {

                return (

                    String(
                        order.orderNumber
                    )
                    .toLowerCase()
                    .includes(search)

                    ||

                    String(
                        order.customerEmail
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
        .getElementById("allCount")
        .textContent =
        allOrders.length;


    document
        .getElementById("arrivedCount")
        .textContent =
        count("arrived");


    document
        .getElementById("readyCount")
        .textContent =
        count("ready");


    document
        .getElementById("issuedCount")
        .textContent =
        count("issued");


    const list =
        document.getElementById(
            "ordersList"
        );


    if (!filtered.length) {

        list.innerHTML =
            "<p>Заказы не найдены.</p>";

        return;

    }


    list.innerHTML =
        filtered
            .map(
                function (order) {

                    return `

                    <div class="order-card">

                        <div>

                            <strong>
                                ${order.orderNumber}
                            </strong>

                            <div>
                                ${order.productName}
                            </div>

                            <small>
                                ${order.customerEmail}
                            </small>

                            <br>

                            <span class="status-badge">
                                ${getStatus(order.status)}
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


function count(status) {

    return allOrders.filter(
        function (order) {

            return order.status === status;

        }
    ).length;

}


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


    return statuses[status] ||
        status;

}


document
    .getElementById("search")
    .addEventListener(
        "input",
        render
    );
