import {
    onAuthStateChanged,
    signOut
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    onSnapshot
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


        if (!orderId) {

            alert(
                "Заказ не указан."
            );

            location.href =
                "client.html";

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

                alert(
                    "Заказ не найден."
                );

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
                "Описание отсутствует";


            document
                .getElementById(
                    "status"
                )
                .textContent =
                getStatus(order.status);


            createQR(
                order.orderNumber
            );

        }
    );

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


function createQR(value) {

    const qr =
        document.getElementById(
            "qrcode"
        );


    qr.innerHTML = "";


    const img =
        document.createElement(
            "img"
        );


    img.alt =
        "QR заказа";


    img.src =
        "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data="
        + encodeURIComponent(value);


    qr.appendChild(img);

}
