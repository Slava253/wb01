// Вставь сюда конфигурацию своего Firebase Web App.
// Firebase Console -> Project settings -> Your apps -> Web app.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword,
  collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, limit, serverTimestamp,
  ref, uploadBytes, getDownloadURL, initializeApp };

export function secondaryApp() {
  const name="employee-creation";
  const existing=getApps().find(a=>a.name===name);
  return existing || initializeApp(firebaseConfig,name);
}
export function money(v){return new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:0}).format(Number(v)||0)}
export function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
