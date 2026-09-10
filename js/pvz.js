import {
    doc,
    getDoc,
    setDoc
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
}
from "./firebase.js";


/* =================================
   ПРОВЕРКА
================================= */

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
        "Нет входа."
    );

}


if (
    currentUser.role !==
    "pvz"
) {

    location.href =
        "index.html";

    throw new Error(
        "Нет доступа."
    );

}


/* =================================
   ЭЛЕМЕНТЫ
================================= */

const pvzName =
    document.getElementById(
        "pvzName"
    );


const mainButtons =
    document.getElementById(
        "mainButtons"
    );


const workPanel =
    document.getElementById(
        "workPanel"
    );


const workTitle =
    document.getElementById(
        "workTitle"
    );


const reader =
    document.getElementById(
        "reader"
    );


const scanResult =
    document.getElementById(
        "scanResult"
    );


const cellNumber =
    document.getElementById(
        "cellNumber"
    );


const backButton =
    document.getElementById(
        "backButton"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


let scanner = null;

let mode = null;


/* =================================
   НАЗВАНИЕ ПВЗ
================================= */

pvzName.textContent =
    currentUser.pvzName ||
    "Пункт выдачи";


/* =================================
   ВЫХОД
================================= */

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


/* =================================
   ПРИЁМКА
================================= */

document
    .getElementById(
        "acceptButton"
    )
    .addEventListener(
        "click",
        function() {

            startWork(
                "accept"
            );

        }
    );


/* =================================
   ВЫДАЧА
================================= */

document
    .getElementById(
        "issueButton"
    )
    .addEventListener(
        "click",
        function() {

            startWork(
                "issue"
            );

        }
    );


/* =================================
   НАЧАЛО РАБОТЫ
================================= */

async function startWork(
    selectedMode
) {

    mode =
        selectedMode;


    mainButtons.classList.add(
        "hidden"
    );


    workPanel.classList.remove(
        "hidden"
    );


    cellNumber.textContent =
        "";


    scanResult.textContent =
        "";


    if (
        selectedMode ===
        "accept"
    ) {

        workTitle.textContent =
            "Приёмка — сканируйте QR";

    } else {

        workTitle.textContent =
            "Выдача — сканируйте QR";

    }


    await startScanner();

}


/* =================================
   СКАНЕР
================================= */

async function startScanner() {

    scanner =
        new Html5Qrcode(
            "reader"
        );


    try {

        const cameras =
            await Html5Qrcode
                .getCameras();


        if (
            !cameras ||
            cameras.length === 0
        ) {

            scanResult.textContent =
                "Камера не найдена.";

            return;

        }


        /*
         * Предпочитаем заднюю камеру.
         */

        let cameraId =
            cameras[0].id;


        for (
            const camera of cameras
        ) {

            const label =
                (
                    camera.label ||
                    ""
                ).toLowerCase();


            if (
                label.includes(
                    "back"
                ) ||
                label.includes(
                    "rear"
                ) ||
                label.includes(
                    "environment"
                )
            ) {

                cameraId =
                    camera.id;

                break;

            }

        }


        await scanner.start(

            cameraId,

            {
                fps: 10,

                qrbox: {
                    width: 250,
                    height: 250
                }

            },

            function(decodedText) {

                handleQr(
                    decodedText
                );

            },

            function() {

                /*
                 * Ошибки отдельных кадров
                 * здесь игнорируем.
                 */

            }

        );


    } catch (error) {

        console.error(error);


        scanResult.textContent =
            "Не удалось запустить камеру.";

    }

}


/* =================================
   QR
================================= */

async function handleQr(
    value
) {

    /*
     * Из QR разрешаем только 5 цифр.
     */

    const code =
        String(value)
            .trim();


    if (
        !/^\d{5}$/.test(code)
    ) {

        scanResult.textContent =
            "Ошибка: QR должен содержать ровно 5 цифр.";

        return;

    }


    /*
     * Останавливаем камеру.
     */

    await stopScanner();


    scanResult.textContent =
        "QR: " + code;


    if (
        mode === "accept"
    ) {

        await acceptPackage(
            code
        );

    } else {

        await issuePackage(
            code
        );

    }

}


/* =================================
   ПРИЁМКА
================================= */

async function acceptPackage(
    code
) {

    try {

        const packageReference =
            doc(
                db,
                "packages",
                code
            );


        const existing =
            await getDoc(
                packageReference
            );


        if (
            existing.exists()
        ) {

            const data =
                existing.data();


            if (
                data.pvzId ===
                currentUser.pvzId
            ) {

                cellNumber.textContent =
                    "Ячейка " +
                    data.cell;

                scanResult.textContent =
                    "Эта упаковка уже принята.";

                return;

            }

        }


        /*
         * Ищем свободную ячейку.
         */

        const cell =
            await findFreeCell();


        await setDoc(
            packageReference,
            {

                code:
                    code,

                pvzId:
                    currentUser.pvzId,

                pvzName:
                    currentUser.pvzName,

                cell:
                    cell,

                status:
                    "stored",

                acceptedBy:
                    currentUser.login,

                acceptedAt:
                    new Date()
                    .toISOString()

            }
        );


        cellNumber.textContent =
            "Ячейка " +
            cell;


        scanResult.textContent =
            "Упаковка принята. Поставьте её в указанную ячейку.";

    } catch (error) {

        console.error(error);


        scanResult.textContent =
            "Ошибка приёмки: " +
            error.message;

    }

}


/* =================================
   ПОИСК СВОБОДНОЙ ЯЧЕЙКИ
================================= */

async function findFreeCell() {

    /*
     * 100 ячеек:
     *
     * 001–100
     *
     * При необходимости можно
     * увеличить количество.
     */

    for (
        let number = 1;
        number <= 100;
        number++
    ) {

        const cell =
            String(
                number
            ).padStart(
                3,
                "0"
            );


        const cellReference =
            doc(
                db,
                "cells",
                currentUser.pvzId +
                "_" +
                cell
            );


        const snapshot =
            await getDoc(
                cellReference
            );


        if (
            !snapshot.exists()
        ) {

            return cell;

        }


        const data =
            snapshot.data();


        if (
            data.occupied !== true
        ) {

            return cell;

        }

    }


    throw new Error(
        "Свободных ячеек нет."
    );

}


/* =================================
   ВЫДАЧА
================================= */

async function issuePackage(
    code
) {

    try {

        const packageReference =
            doc(
                db,
                "packages",
                code
            );


        const snapshot =
            await getDoc(
                packageReference
            );


        if (
            !snapshot.exists()
        ) {

            cellNumber.textContent =
                "";

            scanResult.textContent =
                "Упаковка с таким QR не найдена.";

            return;

        }


        const data =
            snapshot.data();


        if (
            data.pvzId !==
            currentUser.pvzId
        ) {

            cellNumber.textContent =
                "";

            scanResult.textContent =
                "Эта упаковка находится в другом ПВЗ.";

            return;

        }


        if (
            data.status !==
            "stored"
        ) {

            cellNumber.textContent =
                "";

            scanResult.textContent =
                "Эта упаковка уже выдана или недоступна.";

            return;

        }


        /*
         * Показываем сотруднику,
         * где лежит упаковка.
         */

        cellNumber.textContent =
            "Ячейка " +
            data.cell;


        scanResult.textContent =
            "Найдена упаковка. Заберите её из указанной ячейки.";

    } catch (error) {

        console.error(error);


        scanResult.textContent =
            "Ошибка выдачи: " +
            error.message;

    }

}


/* =================================
   НАЗАД
================================= */

backButton.addEventListener(
    "click",
    async function() {

        await stopScanner();


        mode = null;


        workPanel.classList.add(
            "hidden"
        );


        mainButtons.classList.remove(
            "hidden"
        );


        scanResult.textContent =
            "";

        cellNumber.textContent =
            "";

    }
);


/* =================================
   ОСТАНОВКА КАМЕРЫ
================================= */

async function stopScanner() {

    if (!scanner) {
        return;
    }


    try {

        await scanner.stop();

    } catch (error) {

        console.error(error);

    }


    try {

        scanner.clear();

    } catch (error) {

        console.error(error);

    }


    scanner = null;

}
