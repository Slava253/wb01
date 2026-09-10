import {db,collection,getDocs,doc,getDoc,updateDoc,query,where,serverTimestamp,esc,money} from "./firebase.js";
import {guard,logout} from "./auth.js";
let user,profile,pvz,orders=[];
document.querySelector("#logout").onclick=logout;
async function load(){
 const ps=await getDoc(doc(db,"pvz",profile.pvzId));pvz=ps.data();
 document.querySelector("#pvzTitle").textContent=pvz?.name||"ПВЗ";
 document.querySelector("#pvzAddress").textContent=pvz?.address||"";
 await loadOrders(); startScanner();
}
async function loadOrders(){
 const s=await getDocs(query(collection(db,"orders"),where("pvzId","==",profile.pvzId)));
 orders=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
 document.querySelector("#employeeOrders").innerHTML=orders.slice(0,20).map(o=>`<div class="order"><div class="order-head"><b>${esc(o.id.slice(-8).toUpperCase())}</b><span class="badge">${statusRu(o.status)}</span></div><p>${o.items?.map(i=>`${esc(i.name)} × ${i.qty}`).join("<br>")}</p><b>${money(o.total)}</b></div>`).join("")||"<p class='muted'>Заказов нет.</p>";
}
function statusRu(s){return ({ready_for_pickup:"Готов к выдаче",picked_up:"Выдан",returned:"Возвращён",return_requested:"Возврат запрошен",created:"Создан"})[s]||s}
async function processOrder(id){
 const s=await getDoc(doc(db,"orders",id));if(!s.exists())return alert("Заказ не найден");
 const o=s.data();
 if(o.pvzId!==profile.pvzId)return alert("Этот заказ относится к другому ПВЗ.");
 document.querySelector("#scanResult").innerHTML=`<div class="panel"><h3>Заказ ${esc(id.slice(-8).toUpperCase())}</h3><p>${o.items?.map(i=>`${esc(i.name)} × ${i.qty}`).join("<br>")}</p><p><b>Сумма: ${money(o.total)}</b></p><p>Статус: <span class="badge">${statusRu(o.status)}</span></p>${o.status==="ready_for_pickup"?`<button id="pickup" class="btn primary">Выдать заказ</button><button id="ret" class="btn danger">Оформить возврат</button>`:""}</div>`;
 document.querySelector("#pickup")?.addEventListener("click",()=>changeStatus(id,"picked_up"));
 document.querySelector("#ret")?.addEventListener("click",()=>changeStatus(id,"returned"));
}
async function changeStatus(id,status){await updateDoc(doc(db,"orders",id),{status,processedBy:user.uid,processedAt:serverTimestamp()});alert(status==="picked_up"?"Заказ выдан":"Возврат оформлен");await loadOrders();processOrder(id)}
function startScanner(){
 const scanner=new Html5Qrcode("reader");
 scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:230,height:230}},text=>{scanner.stop().catch(()=>{});processOrder(text.trim())},()=>{}).catch(()=>{document.querySelector("#scanResult").innerHTML="<p class='muted'>Камера недоступна. Используйте ввод кода вручную.</p>"});
}
document.querySelector("#manualScan").onclick=()=>{const id=prompt("Введите ID заказа из QR:");if(id)processOrder(id.trim())};
guard("employee",(u,p)=>{user=u;profile=p;load()});