import {
    collection,
    addDoc,
    getDocs,
    doc,
    setDoc,
    query,
    where,
    updateDoc
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
}
from "./firebase.js";


/* =========================================
   ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ
========================================= */

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
        "Пользователь не авторизован."
    );

}


if (
    currentUser.role !== "admin" &&
    currentUser.role !== "pvz"
) {

    location.href =
        "index.html";

    throw new Error(
        "Нет доступа."
    );

}


/* =========================================
   ОБЩИЕ ЭЛЕМЕНТЫ
========================================= */

const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const userEmail =
    document.getElementById(
        "userEmail"
    );


/* =========================================
   ВЫХОД
========================================= */

if (logoutButton) {

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

}


/* =========================================
   ПОКАЗ ИМЕНИ
========================================= */

if (userEmail) {

    if (
        currentUser.role ===
        "admin"
    ) {

        userEmail.textContent =
            "Администратор";

    } else {

        userEmail.textContent =
            currentUser.name ||
            currentUser.login ||
            "Сотрудник ПВЗ";

    }

}


/* =========================================
   ЕСЛИ АДМИН
========================================= */

if (
    currentUser.role ===
    "admin"
) {

    const adminPanel =
        document.getElementById(
            "adminPanel"
        );


    if (adminPanel) {

        adminPanel.classList.remove(
            "hidden"
        );

    }


    loadAdminStatistics();

    loadPvzList();

    loadEmployees();

    setupCreatePvz();

    setupCreateEmployee();

}


/* =========================================
   ЕСЛИ ПВЗ
========================================= */

if (
    currentUser.role ===
    "pvz"
) {

    const pvzPanel =
        document.getElementById(
            "pvzPanel"
        );


    if (pvzPanel) {

        pvzPanel.classList.remove(
            "hidden"
        );

    }


    const pvzName =
        document.getElementById(
            "currentPvzName"
        );


    if (pvzName) {

        pvzName.textContent =
            currentUser.pvzName ||
            "ПВЗ";

    }


    loadPvzOrders();

}


/* =========================================
   АДМИН: СТАТИСТИКА
========================================= */

async function loadAdminStatistics() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "orders"
                )
            );


        let all = 0;

        let arrived = 0;

        let ready = 0;

        let issued = 0;


        snapshot.forEach(
            function(item) {

                const data =
                    item.data();


                all++;


                if (
                    data.status ===
                    "arrived"
                ) {

                    arrived++;

                }


                if (
                    data.status ===
                    "ready"
                ) {

                    ready++;

                }


                if (
                    data.status ===
                    "issued"
                ) {

                    issued++;

                }

            }
        );


        const adminPanel =
            document.getElementById(
                "adminPanel"
            );


        if (!adminPanel) {
            return;
        }


        const numbers =
            adminPanel
                .querySelectorAll(
                    ".stat-number"
                );


        if (numbers[0]) {
            numbers[0].textContent =
                all;
        }


        if (numbers[1]) {
            numbers[1].textContent =
                arrived;
        }


        if (numbers[2]) {
            numbers[2].textContent =
                ready;
        }


        if (numbers[3]) {
            numbers[3].textContent =
                issued;
        }


    } catch (error) {

        console.error(
            "Ошибка статистики:",
            error
        );

    }

}


/* =========================================
   АДМИН: ДОБАВЛЕНИЕ ПВЗ
========================================= */

function setupCreatePvz() {

    const button =
        document.getElementById(
            "createPvzButton"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async function() {

            const name =
                document
                    .getElementById(
                        "pvzName"
                    )
                    .value
                    .trim();


            const address =
                document
                    .getElementById(
                        "pvzAddress"
                    )
                    .value
                    .trim();


            const message =
                document.getElementById(
                    "pvzMessage"
                );


            if (!name) {

                message.textContent =
                    "Введите название ПВЗ.";

                return;

            }


            if (!address) {

                message.textContent =
                    "Введите адрес ПВЗ.";

                return;

            }


            try {

                message.textContent =
                    "Создание...";


                const pvzReference =
                    await addDoc(
                        collection(
                            db,
                            "pvz"
                        ),
                        {

                            name:
                                name,

                            address:
                                address,

                            active:
                                true,

                            createdAt:
                                new Date()
                                .toISOString()

                        }
                    );


                message.textContent =
                    "ПВЗ создан.";


                document
                    .getElementById(
                        "pvzName"
                    )
                    .value = "";


                document
                    .getElementById(
                        "pvzAddress"
                    )
                    .value = "";


                await loadPvzList();

            } catch (error) {

                console.error(error);


                message.textContent =
                    "Ошибка: " +
                    error.message;

            }

        }
    );

}


/* =========================================
   АДМИН: СПИСОК ПВЗ
========================================= */

async function loadPvzList() {

    const list =
        document.getElementById(
            "pvzList"
        );


    const select =
        document.getElementById(
            "employeePvz"
        );


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "pvz"
                )
            );


        if (select) {

            select.innerHTML =
                `
                <option value="">
                    Выберите ПВЗ
                </option>
                `;

        }


        if (
            snapshot.empty
        ) {

            list.innerHTML =
                "<p>ПВЗ пока нет.</p>";

            return;

        }


        let html = "";


        snapshot.forEach(
            function(item) {

                const pvz =
                    item.data();


                html += `

                    <div class="pvz-card">

                        <strong>
                            ${escapeHtml(
                                pvz.name
                            )}
                        </strong>

                        <br>

                        <span>
                            ${escapeHtml(
                                pvz.address
                            )}
                        </span>

                    </div>

                `;


                if (select) {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        item.id;


                    option.textContent =
                        pvz.name;


                    select.appendChild(
                        option
                    );

                }

            }
        );


        list.innerHTML =
            html;


    } catch (error) {

        console.error(error);


        list.innerHTML =
            "<p>Ошибка загрузки ПВЗ.</p>";

    }

}


/* =========================================
   АДМИН: СОЗДАНИЕ СОТРУДНИКА
========================================= */

function setupCreateEmployee() {

    const button =
        document.getElementById(
            "createEmployeeButton"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async function() {

            const name =
                document
                    .getElementById(
                        "employeeName"
                    )
                    .value
                    .trim();


            const login =
                document
                    .getElementById(
                        "employeeLogin"
                    )
                    .value
                    .trim();


            const password =
                document
                    .getElementById(
                        "employeePassword"
                    )
                    .value;


            const pvzId =
                document
                    .getElementById(
                        "employeePvz"
                    )
                    .value;


            const message =
                document.getElementById(
                    "employeeMessage"
                );


            if (!name) {

                message.textContent =
                    "Введите имя сотрудника.";

                return;

            }


            if (!login) {

                message.textContent =
                    "Введите логин.";

                return;

            }


            if (!password) {

                message.textContent =
                    "Введите пароль.";

                return;

            }


            if (!pvzId) {

                message.textContent =
                    "Выберите ПВЗ.";

                return;

            }


            try {

                message.textContent =
                    "Создание сотрудника...";


                /*
                 * Проверяем, существует ли
                 * такой логин.
                 */

                const employeeReference =
                    doc(
                        db,
                        "pvzEmployees",
                        login
                    );


                const existing =
                    await getDocs(
                        query(
                            collection(
                                db,
                                "pvzEmployees"
                            ),
                            where(
                                "login",
                                "==",
                                login
                            )
                        )
                    );


                if (
                    !existing.empty
                ) {

                    message.textContent =
                        "Такой логин уже существует.";

                    return;

                }


                /*
                 * Получаем данные ПВЗ.
                 */

                const pvzReference =
                    doc(
                        db,
                        "pvz",
                        pvzId
                    );


                const pvzSnapshot =
                    await getDocs(
                        query(
                            collection(
                                db,
                                "pvz"
                            ),
                            where(
                                "__name__",
                                "==",
                                pvzId
                            )
                        )
                    );


                let pvzName =
                    "ПВЗ";


                if (
                    !pvzSnapshot.empty
                ) {

                    pvzName =
                        pvzSnapshot
                            .docs[0]
                            .data()
                            .name ||
                        "ПВЗ";

                }


                await setDoc(
                    employeeReference,
                    {

                        name:
                            name,

                        login:
                            login,

                        password:
                            password,

                        pvzId:
                            pvzId,

                        pvzName:
                            pvzName,

                        role:
                            "pvz",

                        active:
                            true,

                        createdAt:
                            new Date()
                            .toISOString()

                    }
                );


                message.textContent =
                    "Сотрудник создан.";


                document
                    .getElementById(
                        "employeeName"
                    )
                    .value = "";


                document
                    .getElementById(
                        "employeeLogin"
                    )
                    .value = "";


                document
                    .getElementById(
                        "employeePassword"
                    )
                    .value = "";


                await loadEmployees();


            } catch (error) {

                console.error(error);


                message.textContent =
                    "Ошибка: " +
                    error.message;

            }

        }
    );

}


/* =========================================
   АДМИН: СОТРУДНИКИ
========================================= */

async function loadEmployees() {

    const list =
        document.getElementById(
            "employeesList"
        );


    if (!list) {
        return;
    }


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "pvzEmployees"
                )
            );


        if (
            snapshot.empty
        ) {

            list.innerHTML =
                "<p>Сотрудников пока нет.</p>";

            return;

        }


        let html = "";


        snapshot.forEach(
            function(item) {

                const employee =
                    item.data();


                html += `

                    <div class="employee-card">

                        <strong>
                            ${escapeHtml(
                                employee.name
                            )}
                        </strong>

                        <br>

                        Логин:
                        ${escapeHtml(
                            employee.login
                        )}

                        <br>

                        ПВЗ:
                        ${escapeHtml(
                            employee.pvzName
                        )}

                    </div>

                `;

            }
        );


        list.innerHTML =
            html;


    } catch (error) {

        console.error(error);


        list.innerHTML =
            "<p>Ошибка загрузки сотрудников.</p>";

    }

}


/* =========================================
   ПВЗ: ЗАКАЗЫ
========================================= */

async function loadPvzOrders() {

    const ordersList =
        document.getElementById(
            "ordersList"
        );


    if (!ordersList) {
        return;
    }


    try {

        /*
         * Заказы должны иметь pvzId,
         * когда они будут привязаны
         * к конкретному ПВЗ.
         *
         * Пока показываем все заказы,
         * у которых нет pvzId либо
         * совпадает pvzId.
         */

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "orders"
                )
            );


        let orders = [];


        snapshot.forEach(
            function(item) {

                const data =
                    item.data();


                if (
                    !data.pvzId ||
                    data.pvzId ===
                    currentUser.pvzId
                ) {

                    orders.push({

                        id:
                            item.id,

                        ...data

                    });

                }

            }
        );


        orders.sort(
            function(a, b) {

                return String(
                    b.createdAt || ""
                ).localeCompare(
                    String(
                        a.createdAt || ""
                    )
                );

            }
        );


        renderPvzOrders(
            orders
        );


    } catch (error) {

        console.error(error);


        ordersList.innerHTML =
            "<p>" +
            "Ошибка загрузки заказов: " +
            escapeHtml(
                error.message
            ) +
            "</p>";

    }

}


/* =========================================
   ПВЗ: ОТОБРАЖЕНИЕ
========================================= */

function renderPvzOrders(
    orders
) {

    const ordersList =
        document.getElementById(
            "ordersList"
        );


    if (!orders.length) {

        ordersList.innerHTML =
            "<p>Заказов нет.</p>";

        return;

    }


    ordersList.innerHTML =
        orders
            .map(
                function(order) {

                    return `

                        <div class="order-card">

                            <h3>
                                ${escapeHtml(
                                    order.orderNumber
                                )}
                            </h3>

                            <p>
                                Товар:
                                ${escapeHtml(
                                    order.productName
                                )}
                            </p>

                            <p>
                                Телефон:
                                ${escapeHtml(
                                    order.customerPhone
                                )}
                            </p>

                            <p>
                                Статус:
                                ${escapeHtml(
                                    getStatusName(
                                        order.status
                                    )
                                )}
                            </p>

                            <button
                                class="button"
                                onclick="openOrder('${order.id}')">

                                Открыть заказ

                            </button>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =========================================
   ОТКРЫТИЕ ЗАКАЗА ПВЗ
========================================= */

window.openOrder =
    function(orderId) {

        location.href =
            "admin-order.html?id=" +
            encodeURIComponent(
                orderId
            );

    };


/* =========================================
   СТАТУС
========================================= */

function getStatusName(
    status
) {

    const names = {

        created:
            "Заказ создан",

        waiting:
            "Ожидает отправки",

        arrived:
            "Прибыл в ПВЗ",

        ready:
            "Готов к выдаче",

        issued:
            "Выдан"

    };


    return (
        names[status] ||
        status ||
        "Неизвестно"
    );

}


/* =========================================
   HTML ESCAPE
========================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}
