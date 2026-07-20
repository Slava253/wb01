// ========== FIREBASE ==========
const firebaseConfig = {
    apiKey: "AIzaSyBoj5xaDZRyLkf7r0Ui6Xku3-f6jnCdFvU",
    authDomain: "school-a90e4.firebaseapp.com",
    projectId: "school-a90e4",
    storageBucket: "school-a90e4.firebasestorage.app",
    messagingSenderId: "106891336718",
    appId: "1:106891336718:web:19a3425219138192aa305f"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

// ... весь остальной JS код