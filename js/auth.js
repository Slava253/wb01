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


const ADMIN_LOGIN = "2347";

const ADMIN_PASSWORD = "2203";


const message =
    document.getElementById(
        "authMessage"
    );


function showMessage(text) {

    message.textContent = text;

}


/* =========================================
   ВКЛАДКИ
========================================= */

const tabs =
    document.querySelectorAll(
        ".login-tab"
    );


tabs.forEach(
    function(tab) {

        tab.addEventListener(
            "click",
            function() {

                const selected =
                    tab.dataset.tab;


                tabs.forEach(
                    function(item) {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                tab.classList.add(
                    "active"
                );


                document
                    .querySelectorAll(
                        ".login-section"
                    )
                    .forEach(
                        function(section) {

                            section.classList.remove(
                                "active"
                            );

                        }
                    );


                document
                    .getElementById(
                        selected + "Section"
                    )
                    .classList.add(
                        "active"
                    );


                showMessage("");

            }
        );

    }
);


/* =========================================
   КЛИЕНТ
========================================= */

document
    .getElementById(
        "clientLoginButton"
    )
    .addEventListener(
        "click",
        clientLogin
    );


async function clientLogin() {

    const input =
        document.getElementById(
            "phoneNumber"
        );


    const phone =
        input.value.trim();


    if (!phone) {

        showMessage(
            "Введите номер телефона."
        );

        return;

    }


    /*
     * Оставляем только цифры и +
     */

    const normalizedPhone =
        phone.replace(
            /[^\d+]/g,
            ""
        );


    if (
        normalizedPhone.length < 6
    ) {

        showMessage(
            "Введите корректный номер телефона."
        );

        return;

    }


    try {

        showMessage(
            "Выполняется вход..."
        );


        /*
         * Номер телефона используется
         * как ID клиента.
         */

        const clientId =
            "phone_" +
            normalizedPhone
                .replace(
                    /\+/g,
                    ""
                );


        const clientReference =
            doc(
                db,
                "users",
                clientId
            );


        const clientSnapshot =
            await getDoc(
                clientReference
            );


        if (
            clientSnapshot.exists()
        ) {

            const data =
                clientSnapshot.data();


            if (
                data.role !==
                "client"
            ) {

                showMessage(
                    "Этот номер занят другим типом аккаунта."
                );

                return;

            }

        } else {

            /*
             * Первый вход клиента.
             */

            await setDoc(
                clientReference,
                {

                    phone:
                        normalizedPhone,

                    role:
                        "client",

                    createdAt:
                        new Date()
                        .toISOString()

                }
            );

        }


        /*
         * Сохраняем текущего клиента
         * на устройстве.
         */

        localStorage.setItem(
            "pvzUser",
            JSON.stringify({

                id:
                    clientId,

                phone:
                    normalizedPhone,

                role:
                    "client"

            })
        );


        showMessage(
            "Вход выполнен."
        );


        setTimeout(
            function() {

                location.href =
                    "client.html";

            },
            300
        );


    } catch (error) {

        console.error(error);


        showMessage(
            "Ошибка входа: " +
            error.message
        );

    }

}


/* =========================================
   АДМИН
========================================= */

document
    .getElementById(
        "adminLoginButton"
    )
    .addEventListener(
        "click",
        adminLogin
    );


function adminLogin() {

    const login =
        document
            .getElementById(
                "adminLogin"
            )
            .value
            .trim();


    const password =
        document
            .getElementById(
                "adminPassword"
            )
            .value;


    if (
        login === ADMIN_LOGIN &&
        password === ADMIN_PASSWORD
    ) {

        localStorage.setItem(
            "pvzUser",
            JSON.stringify({

                id:
                    "admin",

                login:
                    ADMIN_LOGIN,

                role:
                    "admin"

            })
        );


        showMessage(
            "Вход выполнен."
        );


        setTimeout(
            function() {

                location.href =
                    "admin.html";

            },
            300
        );


        return;

    }


    showMessage(
        "Неверный логин или пароль."
    );

}


/* =========================================
   ПВЗ
========================================= */

document
    .getElementById(
        "pvzLoginButton"
    )
    .addEventListener(
        "click",
        pvzLogin
    );


async function pvzLogin() {

    const login =
        document
            .getElementById(
                "pvzLogin"
            )
            .value
            .trim();


    const password =
        document
            .getElementById(
                "pvzPassword"
            )
            .value;


    if (!login || !password) {

        showMessage(
            "Введите логин и пароль."
        );

        return;

    }


    try {

        showMessage(
            "Проверяем данные..."
        );


        /*
         * Сотрудники хранятся
         * в коллекции pvzEmployees.
         *
         * Документ имеет ID = login.
         */

        const employeeReference =
            doc(
                db,
                "pvzEmployees",
                login
            );


        const employeeSnapshot =
            await getDoc(
                employeeReference
            );


        if (
            !employeeSnapshot.exists()
        ) {

            showMessage(
                "Сотрудник с таким логином не найден."
            );

            return;

        }


        const employee =
            employeeSnapshot.data();


        if (
            employee.password !==
            password
        ) {

            showMessage(
                "Неверный пароль."
            );

            return;

        }


        if (
            employee.active === false
        ) {

            showMessage(
                "Этот сотрудник отключён."
            );

            return;

        }


        localStorage.setItem(
            "pvzUser",
            JSON.stringify({

                id:
                    employeeSnapshot.id,

                login:
                    employee.login,

                name:
                    employee.name,

                pvzId:
                    employee.pvzId,

                pvzName:
                    employee.pvzName,

                role:
                    "pvz"

            })
        );


        showMessage(
            "Вход выполнен."
        );


        setTimeout(
            function() {

                location.href =
                    "admin.html";

            },
            300
        );


    } catch (error) {

        console.error(error);


        showMessage(
            "Ошибка входа: " +
            error.message
        );

    }

}
