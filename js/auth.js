import {
    signInWithEmailAndPassword,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
}
from "./firebase.js";


let confirmationResult = null;

let recaptchaVerifier = null;


/* ================================================= */
/* ЭЛЕМЕНТЫ */
/* ================================================= */

const message =
    document.getElementById(
        "authMessage"
    );


/* ================================================= */
/* СООБЩЕНИЕ */
/* ================================================= */

function showMessage(text) {

    message.textContent = text;

}


/* ================================================= */
/* ПЕРЕКЛЮЧЕНИЕ КЛИЕНТ / АДМИН / ПВЗ */
/* ================================================= */

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


/* ================================================= */
/* RECAPTCHA */
/* ================================================= */

function createRecaptcha() {

    if (recaptchaVerifier) {

        return recaptchaVerifier;

    }


    recaptchaVerifier =
        new RecaptchaVerifier(
            auth,
            "recaptcha-container",
            {

                size: "normal",

                callback:
                    function() {

                        showMessage(
                            "Проверка пройдена."
                        );

                    },

                "expired-callback":
                    function() {

                        showMessage(
                            "Проверка истекла. Пройдите её снова."
                        );

                    }

            }
        );


    return recaptchaVerifier;

}


/* ================================================= */
/* ОТПРАВКА SMS */
/* ================================================= */

document
    .getElementById(
        "sendCodeButton"
    )
    .addEventListener(
        "click",
        async function() {

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


            /*
             * Firebase ожидает номер
             * в международном формате.
             *
             * Например:
             * +491234567890
             */

            if (!phone.startsWith("+")) {

                showMessage(
                    "Введите номер в международном формате, например +491234567890."
                );

                return;

            }


            try {

                showMessage(
                    "Подготавливаем отправку SMS..."
                );


                const verifier =
                    createRecaptcha();


                confirmationResult =
                    await signInWithPhoneNumber(
                        auth,
                        phone,
                        verifier
                    );


                document
                    .getElementById(
                        "codeSection"
                    )
                    .classList.remove(
                        "hidden"
                    );


                showMessage(
                    "SMS-код отправлен на ваш телефон."
                );

            }

            catch (error) {

                console.error(error);


                showMessage(
                    getFirebaseError(
                        error
                    )
                );


                resetRecaptcha();

            }

        }
    );


/* ================================================= */
/* ПРОВЕРКА SMS-КОДА */
/* ================================================= */

document
    .getElementById(
        "verifyCodeButton"
    )
    .addEventListener(
        "click",
        async function() {

            const code =
                document
                    .getElementById(
                        "phoneCode"
                    )
                    .value
                    .trim();


            if (!confirmationResult) {

                showMessage(
                    "Сначала запросите SMS-код."
                );

                return;

            }


            if (
                code.length !== 6
            ) {

                showMessage(
                    "Введите 6-значный код из SMS."
                );

                return;

            }


            try {

                showMessage(
                    "Проверяем код..."
                );


                const result =
                    await confirmationResult.confirm(
                        code
                    );


                const user =
                    result.user;


                /*
                 * Создаём профиль клиента,
                 * если его ещё нет.
                 */

                const userReference =
                    doc(
                        db,
                        "users",
                        user.uid
                    );


                const userSnapshot =
                    await getDoc(
                        userReference
                    );


                if (
                    !userSnapshot.exists()
                ) {

                    await setDoc(
                        userReference,
                        {

                            phone:
                                user.phoneNumber,

                            role:
                                "client",

                            createdAt:
                                serverTimestamp()

                        }
                    );

                }


                showMessage(
                    "Вход выполнен."
                );


                setTimeout(
                    function() {

                        location.href =
                            "client.html";

                    },
                    500
                );

            }

            catch (error) {

                console.error(error);


                showMessage(
                    getFirebaseError(
                        error
                    )
                );

            }

        }
    );


/* ================================================= */
/* АДМИН */
/* ================================================= */

document
    .getElementById(
        "adminLoginButton"
    )
    .addEventListener(
        "click",
        async function() {

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


            await loginByPassword(
                login,
                password,
                "admin"
            );

        }
    );


/* ================================================= */
/* ПВЗ */
/* ================================================= */

document
    .getElementById(
        "pvzLoginButton"
    )
    .addEventListener(
        "click",
        async function() {

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


            await loginByPassword(
                login,
                password,
                "pvz"
            );

        }
    );


/* ================================================= */
/* ВХОД ПО ЛОГИНУ / ПАРОЛЮ */
/* ================================================= */

async function loginByPassword(
    login,
    password,
    expectedRole
) {

    try {

        showMessage(
            "Выполняется вход..."
        );


        const result =
            await signInWithEmailAndPassword(
                auth,
                login,
                password
            );


        const user =
            result.user;


        const userReference =
            doc(
                db,
                "users",
                user.uid
            );


        const userSnapshot =
            await getDoc(
                userReference
            );


        if (
            !userSnapshot.exists()
        ) {

            showMessage(
                "Для этого аккаунта не настроена роль."
            );

            return;

        }


        const profile =
            userSnapshot.data();


        if (
            profile.role !== expectedRole
        ) {

            showMessage(
                "У этого аккаунта другая роль."
            );

            return;

        }


        if (
            profile.role === "admin"
        ) {

            location.href =
                "admin.html";

            return;

        }


        if (
            profile.role === "pvz"
        ) {

            location.href =
                "admin.html";

            return;

        }


        showMessage(
            "Неизвестная роль."
        );

    }

    catch (error) {

        console.error(error);


        showMessage(
            getFirebaseError(
                error
            )
        );

    }

}


/* ================================================= */
/* АВТОМАТИЧЕСКАЯ ПРОВЕРКА УЖЕ ВОШЕДШЕГО */
/* ================================================= */

onAuthStateChanged(
    auth,
    async function(user) {

        if (!user) {

            return;

        }


        /*
         * Если пользователь уже вошёл,
         * определяем его роль.
         */

        try {

            const reference =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const snapshot =
                await getDoc(
                    reference
                );


            if (!snapshot.exists()) {

                return;

            }


            const profile =
                snapshot.data();


            if (
                profile.role ===
                "client"
            ) {

                /*
                 * Мы не перенаправляем
                 * автоматически, если человек
                 * ещё находится на странице входа.
                 */

                return;

            }


            if (
                profile.role ===
                "admin"
                ||
                profile.role ===
                "pvz"
            ) {

                return;

            }

        }

        catch (error) {

            console.error(error);

        }

    }
);


/* ================================================= */
/* RECAPTCHA RESET */
/* ================================================= */

function resetRecaptcha() {

    if (!recaptchaVerifier) {

        return;

    }


    try {

        recaptchaVerifier.clear();

    }

    catch (error) {

        console.error(error);

    }


    recaptchaVerifier = null;

}


/* ================================================= */
/* ОШИБКИ FIREBASE */
/* ================================================= */

function getFirebaseError(error) {

    switch (error.code) {

        case "auth/invalid-phone-number":

            return "Неверный номер телефона.";

        case "auth/too-many-requests":

            return "Слишком много попыток. Попробуйте позже.";

        case "auth/invalid-verification-code":

            return "Неверный SMS-код.";

        case "auth/code-expired":

            return "Срок действия SMS-кода истёк.";

        case "auth/invalid-credential":

            return "Неверный логин или пароль.";

        case "auth/user-not-found":

            return "Пользователь не найден.";

        case "auth/wrong-password":

            return "Неверный пароль.";

        case "auth/operation-not-allowed":

            return "Этот способ входа не включён в Firebase.";

        case "auth/quota-exceeded":

            return "Превышен лимит SMS.";

        case "auth/captcha-check-failed":

            return "Не пройдена проверка reCAPTCHA.";

        default:

            return (
                "Ошибка Firebase: "
                + error.message
            );

    }

}
