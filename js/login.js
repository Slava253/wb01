import { auth, db, doc, setDoc, signInWithPhoneNumber, RecaptchaVerifier, signInWithEmailAndPassword, getDoc } from "./firebase.js";

const err = document.querySelector("#authError");
const tabs = document.querySelectorAll(".tab");

tabs.forEach(t => t.onclick = () => {
  tabs.forEach(x => x.classList.remove("active"));
  t.classList.add("active");
  document.querySelector("#phoneTab").classList.toggle("hidden", t.dataset.tab !== "phone");
  document.querySelector("#staffTab").classList.toggle("hidden", t.dataset.tab !== "staff");
  err.textContent = "";
});

let confirmation = null;

window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "normal" });

document.querySelector("#sendCode").onclick = async () => {
  err.textContent = "";
  try {
    const phone = document.querySelector("#phone").value.trim();
    if (!phone) throw new Error("Введите номер телефона");
    confirmation = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
    document.querySelector("#codeBox").classList.remove("hidden");
  } catch (e) {
    err.textContent = e.message;
    if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
  }
};

document.querySelector("#verifyCode").onclick = async () => {
  err.textContent = "";
  try {
    const result = await confirmation.confirm(document.querySelector("#smsCode").value.trim());
    await setDoc(doc(db, "users", result.user.uid), {
      phone: result.user.phoneNumber,
      role: "client",
      createdAt: new Date()
    }, { merge: true });
    location.href = "client.html";
  } catch (e) {
    err.textContent = e.message;
  }
};

document.querySelector("#staffSignIn").onclick = async () => {
  err.textContent = "";
  try {
    const login = document.querySelector("#staffLogin").value.trim();
    const password = document.querySelector("#staffPassword").value;
    if (!login || !password) throw new Error("Введите логин и пароль");

    const email = login.includes("@") ? login : `${login}@marketpoint.local`;
    const result = await signInWithEmailAndPassword(auth, email, password);

    const s = await getDoc(doc(db, "users", result.user.uid));
    if (!s.exists() || !["employee", "admin"].includes(s.data().role)) {
      throw new Error("Эта учётная запись не является сотрудником или администратором.");
    }

    location.href = s.data().role === "admin" ? "admin.html" : "employee.html";
  } catch (e) {
    err.textContent = e.message;
  }
};
