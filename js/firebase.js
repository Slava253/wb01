import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const firebaseConfig = {

    apiKey: "ВСТАВЬ_СВОЙ_API_KEY",

    authDomain:
        "marketpoint-9be60.firebaseapp.com",

    projectId:
        "marketpoint-9be60",

    storageBucket:
        "ВСТАВЬ_СВОЁ_STORAGE_BUCKET",

    messagingSenderId:
        "ВСТАВЬ_SENDER_ID",

    appId:
        "ВСТАВЬ_APP_ID"

};


const app =
    initializeApp(firebaseConfig);


export const auth =
    getAuth(app);


export const db =
    getFirestore(app);
