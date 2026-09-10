import {
    onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    onSnapshot,
    updateDoc,
    serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
}
from "./firebase.js";


const params =
    new URLSearchParams(
        location.search
    );


const orderId =
    params.get("id");


onAuthStateChanged(
    auth,
    function (user) {

        if (!user) {

            location.href =
                "index.html";

            return;

        }


        if (!orderId) {

            location.href =
                "admin.html";

            return;

        }


        loadOrder();

    }
);


function loadOrder() {

    const reference =
        doc(
            db,
            "orders",
            orderId
        );


    onSnapshot(
        reference,
        function (snapshot) {

            if (!snapshot.exists()) {

                document
                    .getElementById(
                        "message"
                    )
                    .textContent =
                    "Заказ не найден.";

                return;

            }


            const order =
                snapshot.data();


            document
                .getElementById(
                    "orderNumber"
                )
                .textContent =
                order.orderNumber;


            document
                .getElementById(
                    "productName"
                )
                .textContent =
                order.productName;


            document
                .getElementById(
                    "description"
                )
                .textContent =
                order.description ||
                "—";


            document
                .getElementById(
                    "customer"
                )
                .textContent =
                order.customerEmail;


            document
                .getElementById(
                    "currentStatus"
                )
                .textContent =
                getStatus(order.status);


            document
                .getElementById(
                    "statusSelect"
                )
                .value =
                order.status;

        }
    );

}


/* СОХРАНЕНИЕ СТАТУСА */

document
    .getElementById("saveStatus")
    .onclick =
    async function () {

        const status =
            document
                .getElementById(
                    "statusSelect"
                )
                .value;


        try {

            await updateDoc(

                doc(
                    db,
                    "orders",
                    orderId
                ),

                {

                    status,

                    updatedAt:
                        serverTimestamp()

                }

            );


            document
                .getElementById(
                    "message"
                )
                .textContent =
                "Статус успешно изменён.";

        }

        catch (error) {

            document
                .getElementById(
                    "message"
                )
                .textContent =
                "Ошибка: "
                + error.message;

        }

    };


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
