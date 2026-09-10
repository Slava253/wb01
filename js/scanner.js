import {
    doc,
    getDocs,
    collection,
    query,
    where,
    updateDoc,
    serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
}
from "./firebase.js";


let scanner = null;

let running = false;


const message =
    document.getElementById(
        "scannerMessage"
    );


const result =
    document.getElementById(
        "scanResult"
    );


async function startScanner() {

    if (
        typeof Html5Qrcode ===
        "undefined"
    ) {

        message.textContent =
            "Библиотека сканера ещё загружается.";

        return;

    }


    if (running) {
        return;
    }


    scanner =
        new Html5Qrcode(
            "reader"
        );


    try {

        const cameras =
            await Html5Qrcode.getCameras();


        if (!cameras.length) {

            throw new Error(
                "Камера не найдена."
            );

        }


        await scanner.start(

            cameras[0].id,

            {

                fps: 10,

                qrbox: {
                    width: 250,
                    height: 250
                }

            },

            handleCode,

            function () {}

        );


        running = true;


        document
            .getElementById(
                "startScanner"
            )
            .disabled =
            true;


        document
            .getElementById(
                "stopScanner"
            )
            .disabled =
            false;


        message.textContent =
            "Наведите камеру на QR-код.";

    }

    catch (error) {

        message.textContent =
            "Ошибка камеры: "
            + error.message;

    }

}


async function stopScanner() {

    if (!scanner) {
        return;
    }


    try {

        await scanner.stop();

        await scanner.clear();

    }

    catch (error) {

        console.log(error);

    }


    scanner = null;

    running = false;


    document
        .getElementById(
            "startScanner"
        )
        .disabled =
        false;


    document
        .getElementById(
            "stopScanner"
        )
        .disabled =
        true;

}


async function handleCode(code) {

    result.textContent =
        code;


    message.textContent =
        "Ищем заказ...";


    try {

        const q =
            query(

                collection(
                    db,
                    "orders"
                ),

                where(
                    "orderNumber",
                    "==",
                    code
                )

            );


        const snapshot =
            await getDocs(q);


        if (snapshot.empty) {

            message.textContent =
                "Заказ с таким номером не найден.";

            return;

        }


        const order =
            snapshot.docs[0];


        const orderData =
            order.data();


        /*
         * Если заказ прибыл,
         * переводим его в готовый.
         */

        if (
            orderData.status ===
            "arrived"
        ) {

            await updateDoc(

                doc(
                    db,
                    "orders",
                    order.id
                ),

                {

                    status:
                        "ready",

                    updatedAt:
                        serverTimestamp()

                }

            );


            message.textContent =
                "Заказ найден. Статус: «Готов к выдаче».";

        }

        else {

            message.textContent =
                "Заказ найден. Статус: "
                + getStatus(
                    orderData.status
                );

        }


        /*
         * Переходим к заказу администратора.
         */

        setTimeout(
            function () {

                location.href =
                    "admin-order.html?id="
                    + order.id;

            },
            1000
        );

    }

    catch (error) {

        message.textContent =
            "Ошибка: "
            + error.message;

    }

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
    .getElementById(
        "startScanner"
    )
    .onclick =
    startScanner;


document
    .getElementById(
        "stopScanner"
    )
    .onclick =
    stopScanner;
