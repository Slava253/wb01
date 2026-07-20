import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, set, get } from "firebase/database";
import { firebaseConfig } from "./firebase-config.js";

// ===== ИНИЦИАЛИЗАЦИЯ =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ===== ПЕРЕМЕННЫЕ =====
let currentUser = null;
let currentUserData = null;

// ===== УВЕДОМЛЕНИЯ =====
export function showNotif(text, isError = false) {
    const el = document.getElementById('notif') || (() => {
        const d = document.createElement('div');
        d.id = 'notif';
        d.className = 'notification';
        document.body.appendChild(d);
        return d;
    })();
    el.textContent = text;
    el.className = 'notification show ' + (isError ? 'error' : 'success');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

// ===== ВХОД =====
export async function login(email, password) {
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: cred.user };
    } catch(e) {
        return { success: false, error: e.message };
    }
}

// ===== РЕГИСТРАЦИЯ =====
export async function register(email, password, name, role = 'client') {
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await set(ref(db, 'users/' + cred.user.uid), { role: role, name: name });
        return { success: true, user: cred.user };
    } catch(e) {
        return { success: false, error: e.message };
    }
}

// ===== ВЫХОД =====
export async function logout() {
    try {
        await signOut(auth);
        return { success: true };
    } catch(e) {
        return { success: false, error: e.message };
    }
}

// ===== ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ =====
export function getCurrentUser() {
    return currentUser;
}

export function getCurrentUserData() {
    return currentUserData;
}

// ===== ПРОВЕРКА АВТОРИЗАЦИИ =====
export function onAuth(callback) {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            const snap = await get(ref(db, 'users/' + user.uid));
            if (snap.exists()) {
                currentUserData = snap.val();
            } else {
                currentUserData = null;
            }
        } else {
            currentUserData = null;
        }
        callback(user, currentUserData);
    });
}

// ===== ПРОВЕРКА РОЛИ =====
export function checkRole(requiredRole) {
    if (!currentUser) return false;
    if (!currentUserData) return false;
    return currentUserData.role === requiredRole;
}

// ===== ПЕРЕНАПРАВЛЕНИЕ ПО РОЛИ =====
export function redirectToRole(role) {
    const pages = {
        'client': 'client.html',
        'seller': 'seller.html',
        'pvz': 'pvz.html',
        'admin': 'admin.html'
    };
    const page = pages[role];
    if (page) {
        localStorage.setItem('userRole', role);
        window.location.href = page;
    }
}

export { auth, db };