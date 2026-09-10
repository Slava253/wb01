import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const firebaseConfig = {

    apiKey: "AIzaSyBYFjKU5odBSUHLhieXdc0dr06EhLM_3r0",

    authDomain: "marketpoint-9be60.firebaseapp.com",

    projectId: "marketpoint-9be60",

    storageBucket: "marketpoint-9be60.firebasestorage.app",

    messagingSenderId: "159645831524",

    appId: "1:159645831524:web:252097b1aa1f3495836a71",

    measurementId: "G-14LM5KL3J0"

};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
