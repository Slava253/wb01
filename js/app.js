import { auth, db, doc, getDoc } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

onAuthStateChanged(auth, async u => {
  if (!u) { location.href = "login.html"; return; }
  const s = await getDoc(doc(db, "users", u.uid));
  const p = s.exists() ? s.data() : null;
  if (p?.role === "admin") location.href = "admin.html";
  else if (p?.role === "employee") location.href = "employee.html";
  else location.href = "client.html";
});
