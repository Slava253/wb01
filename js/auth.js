import { auth, db, doc, getDoc, signOut } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

export async function profile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() ? snap.data() : null;
}

export function guard(role, callback) {
  return onAuthStateChanged(auth, async user => {
    if (!user) { location.href = "login.html"; return; }
    const p = await profile(user);
    if (!p || (role && p.role !== role)) {
      alert("Нет доступа");
      location.href = "index.html";
      return;
    }
    callback(user, p);
  });
}

export async function logout() {
  await signOut(auth);
  location.href = "login.html";
}
