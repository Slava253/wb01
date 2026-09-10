import {auth,db,doc,setDoc,signInWithPhoneNumber,RecaptchaVerifier,signInWithEmailAndPassword} from "./firebase.js";

const err=document.querySelector("#authError");
const tabs=document.querySelectorAll(".tab");
tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.remove("active"));t.classList.add("active");document.querySelector("#phoneTab").classList.toggle("hidden",t.dataset.tab!=="phone");document.querySelector("#staffTab").classList.toggle("hidden",t.dataset.tab!=="staff");err.textContent=""});

let confirmation=null;
window.recaptchaVerifier=new RecaptchaVerifier(auth,"recaptcha-container",{size:"normal"});
document.querySelector("#sendCode").onclick=async()=>{
 try{
  const phone=document.querySelector("#phone").value.trim();
  confirmation=await signInWithPhoneNumber(auth,phone,window.recaptchaVerifier);
  document.querySelector("#codeBox").classList.remove("hidden");
 }catch(e){err.textContent=e.message}
};
document.querySelector("#verifyCode").onclick=async()=>{
 try{
  const result=await confirmation.confirm(document.querySelector("#smsCode").value.trim());
  await setDoc(doc(db,"users",result.user.uid),{phone:result.user.phoneNumber,role:"client",createdAt:new Date()},{merge:true});
  location.href="client.html";
 }catch(e){err.textContent=e.message}
};
document.querySelector("#staffSignIn").onclick=async()=>{
 try{
  const login=document.querySelector("#staffLogin").value.trim();
  const password=document.querySelector("#staffPassword").value;
  // В этом MVP логин сотрудника хранится как email вида login@marketpoint.local
  const result=await signInWithEmailAndPassword(auth,login.includes("@")?login:`${login}@marketpoint.local`,password);
  const s=await (await import("./firebase.js")).getDoc(doc(db,"users",result.user.uid));
  if(!s.exists() || !["employee","admin"].includes(s.data().role)) throw new Error("Эта учётная запись не является сотрудником или администратором.");
  location.href=s.data().role==="admin"?"admin.html":"employee.html";
 }catch(e){err.textContent=e.message}
};