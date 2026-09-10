import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    setDoc
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
}
from "./firebase.js";


const email =
    document.getElementById("email");

const password =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const registerButton =
    document.getElementById("registerButton");

const message =
    document.getElementById("authMessage");


function showMessage(text) {

    message.textContent = text;

}


loginButton.onclick =
    async function () {

        try {

            showMessage("Выполняется вход...");

            await signInWithEmailAndPassword(
                auth,
                email.value.trim(),
                password.value
            );

            location.href =
                "client.html";

        }

        catch (error) {

            showMessage(
                "Ошибка входа: "
                + error.message
            );

        }

    };


registerButton.onclick =
    async function () {

        try {

            showMessage(
                "Создание аккаунта..."
            );

            const result =
                await createUserWithEmailAndPassword(
                    auth,
                    email.value.trim(),
                    password.value
                );


            await setDoc(
                doc(
                    db,
                    "users",
                    result.user.uid
                ),
                {

                    email:
                        result.user.email,

                    role:
                        "client",

                    createdAt:
                        new Date().toISOString()

                }
            );


            location.href =
                "client.html";

        }

        catch (error) {

            showMessage(
                "Ошибка регистрации: "
                + error.message
            );

        }

    };


onAuthStateChanged(
    auth,
    function (user) {

        if (user) {

            console.log(
                "Пользователь:",
                user.email
            );

        }

    }
);
