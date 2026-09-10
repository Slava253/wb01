import {
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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


/* -------------------------------- */
/* ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК */
/* -------------------------------- */

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
                        selected +
                        "Section"
                    )
                    .classList.add(
                        "active"
                    );


                showMessage("");

            }
        );

    }
);


/* -------------------------------- */
/* КЛИЕНТ */
/* -------------------------------- */

document
    .getElementById(
        "clientLoginButton"
    )
    .addEventListener(
        "click",
        loginClient
    );


async function loginClient() {

    const phone =
        document
            .getElementById(
                "phoneNumber"
            )
            .value
            .trim();


    if (!phone) {

        showMessage(
            "Введите номер телефона."
        );

        return;

    }


    if (phone.length < 6) {

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
         * Ищем клиента по телефону
         */

        const usersQuery =
            query(
                collection(
                    db,
                    "users"
                ),
                where(
                    "phone",
                    "==",
                    phone
                )
            );


        const result =
            await getDocs(
                usersQuery
            );


        let userId;


        if (result.empty) {

            /*
             * Новый клиент
             */

            userId =
                "client_" +
                Date.now();


            await setDoc(
                doc(
                    db,
                    "users",
                    userId
                ),
                {

                    phone: phone,

                    role: "client",

                    createdAt:
                        serverTimestamp()

                }
            );

        } else {

            const user =
                result.docs[0];


            userId =
                user.id;


            const data =
                user.data();


            if (
                data.role !==
                "client"
            ) {

                showMessage(
                    "Этот номер используется другим типом аккаунта."
                );

                return;

            }

        }


        /*
         * Сохраняем вход на этом устройстве
         */

        localStorage.setItem(
            "pvzUser",
            JSON.stringify({

                id: userId,

                phone: phone,

                role: "client"

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
            "Ошибка базы данных: " +
            error.message
        );

    }

}


/* -------------------------------- */
/* АДМИН */
/* -------------------------------- */

document
    .getElementById(
        "adminLoginButton"
    )
    .addEventListener(
        "click",
        loginAdmin
    );


async function loginAdmin() {

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


    if (!login || !password) {

        showMessage(
            "Введите логин и пароль."
        );

        return;

    }


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

            id: "admin",

            login: ADMIN_LOGIN,

            role: "admin"

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

}


/* -------------------------------- */
/* ПВЗ */
/* -------------------------------- */

document
    .getElementById(
        "pvzLoginButton"
    )
    .addEventListener(
        "click",
        loginPvz
    );


async function loginPvz() {

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


        const pvzQuery =
            query(
                collection(
                    db,
                    "pvz"
                ),
                where(
                    "login",
                    "==",
                    login
                )
            );


        const result =
            await getDocs(
                pvzQuery
            );


        if (result.empty) {

            showMessage(
                "ПВЗ с таким логином не найден."
            );

            return;

        }


        const pvz =
            result.docs[0];


        const data =
            pvz.data();


        if (
            data.password !==
            password
        ) {

            showMessage(
                "Неверный пароль."
            );

            return;

        }


        localStorage.setItem(
            "pvzUser",
            JSON.stringify({

                id: pvz.id,

                login: data.login,

                name: data.name || "ПВЗ",

                role: "pvz"

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
            "Ошибка базы данных: " +
            error.message
        );

    }

}
