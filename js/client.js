import {
    onAuthStateChanged,
    signOut
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
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


const userEmail =
    document.getElementById("userEmail");

const ordersList =
    document.getElementById("ordersList");


/* ВЫХОД */

document
    .getElementById("logoutButton")
    .onclick =
    async function () {

        await signOut(auth);

        location.href =
            "index.html";

    };


/* СОЗДАНИЕ ЗАКАЗА */

document
    .getElementById("createOrderForm")
    .onsubmit =
    async function (event) {

        event.preventDefault();


        const name =
            document
                .getElementById("productName")
                .value
                .trim();


        const description =
            document
                .getElementById("productDescription")
                .value
                .trim();


        if (!name) {
            return;
        }


        const orderNumber =
            "PVZ-" +
            Date.now()
                .toString()
                .slice(-8);


        try {

            await addDoc(
                collection(db, "orders"),
                {

                    orderNumber,

                    userId:
                        currentUser.uid,

                    customerEmail:
                        currentUser.email,

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
                .getElementById("createOrderForm")
                .reset();


            alert(
                "Заказ создан: "
                + orderNumber
            );

        }

        catch (error) {

            alert(
                "Ошибка: "
                + error.message
            );

        }

    };


/* АВТОРИЗАЦИЯ */

onAuthStateChanged(
    auth,
    function (user) {

        if (!user) {

            location.href =
                "index.html";

            return;

        }


        currentUser = user;


        userEmail.textContent =
            user.email;


        loadOrders();

    }
);


/* ЗАГРУЗКА ЗАКАЗОВ */

function loadOrders() {

    const q =
        query(
            collection(db, "orders"),
            where(
                "userId",
                "==",
                currentUser.uid
            )
        );


    onSnapshot(
        q,
        function (snapshot) {

            if (snapshot.empty) {

                ordersList.innerHTML =
                    "<p>Заказов пока нет.</p>";

                return;

            }


            const orders = [];


            snapshot.forEach(
                function (doc) {

                    orders.push({

                        id:
                            doc.id,

                        ...doc.data()

                    });

                }
            );


            orders.sort(
                function (a, b) {

                    return (
                        String(b.orderNumber)
                        .localeCompare(
                            String(a.orderNumber)
                        )
                    );

                }
            );


            ordersList.innerHTML =
                orders
                    .map(orderCard)
                    .join("");

        }
    );

}


function orderCard(order) {

    return `

        <div class="order-card">

            <div>

                <strong>
                    ${order.orderNumber}
                </strong>

                <div>
                    ${order.productName}
                </div>

                <span class="status-badge">
                    ${getStatus(order.status)}
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
