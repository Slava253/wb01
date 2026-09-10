import {
    doc,
    getDoc
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


/* ===============================
   ВКЛАДКИ
=============================== */

document
    .querySelectorAll(".login-tab")
    .forEach(function(tab) {

        tab.addEventListener(
            "click",
            function() {

                document
                    .querySelectorAll(
                        ".login-tab"
                    )
                    .forEach(function(item) {

                        item.classList.remove(
                            "active"
                        );

                    });


                tab.classList.add(
                    "active"
                );


                document
                    .querySelectorAll(
                        ".login-section"
                    )
                    .forEach(function(section) {

                        section.classList.remove(
                            "active"
                        );

                    });


                document
                    .getElementById(
                        tab.dataset.tab +
                        "Section"
                    )
                    .classList.add(
                        "active"
                    );


                showMessage("");

            }
        );

    });


/* ===============================
   КЛИЕНТ
=============================== */

document
    .getElementById(
        "clientLoginButton"
    )
    .addEventListener(
        "click",
        function() {

            const phone =
                document
                    .getElementById(
                        "phoneNumber"
                    )
                    .value
                    .trim();


            const normalized =
                phone.replace(
                    /[^\d+]/g,
                    ""
                );


            if (
                normalized.length < 6
            ) {

                showMessage(
                    "Введите корректный номер телефона."
                );

                return;

            }


            /*
             * Вход клиента полностью
             * локальный и мгновенный.
             */

            const userId =
                "client_" +
                normalized.replace(
                    "+",
                    ""
                );


            localStorage.setItem(
                "pvzUser",
                JSON.stringify({

                    id:
                        userId,

                    phone:
                        normalized,

                    role:
                        "client"

                })
            );


            location.href =
                "client.html";

        }
    );


/* ===============================
   АДМИН
=============================== */

document
    .getElementById(
        "adminLoginButton"
    )
    .addEventListener(
        "click",
        function() {

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
                login !== ADMIN_LOGIN ||
                password !== ADMIN_PASSWORD
            ) {

                showMessage(
                    "Неверный логин или пароль."
                );

                return;

            }


            localStorage.setItem(
                "pvzUser",
                JSON.stringify({

                    id:
                        "admin",

                    role:
                        "admin",

                    login:
                        ADMIN_LOGIN

                })
            );


            location.href =
                "admin.html";

        }
    );


/* ===============================
   ПВЗ
=============================== */

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


    showMessage(
        "Проверяем..."
    );


    try {

        /*
         * Теперь только один запрос
         * Firestore.
         */

        const reference =
            doc(
                db,
                "pvzEmployees",
                login
            );


        const snapshot =
            await getDoc(
                reference
            );


        if (!snapshot.exists()) {

            showMessage(
                "Сотрудник не найден."
            );

            return;

        }


        const employee =
            snapshot.data();


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
                "Сотрудник отключён."
            );

            return;

        }


        localStorage.setItem(
            "pvzUser",
            JSON.stringify({

                id:
                    snapshot.id,

                role:
                    "pvz",

                login:
                    employee.login,

                name:
                    employee.name,

                pvzId:
                    employee.pvzId,

                pvzName:
                    employee.pvzName

            })
        );


        location.href =
            "pvz.html";


    } catch (error) {

        console.error(error);

        showMessage(
            "Ошибка подключения к базе."
        );

    }

}
