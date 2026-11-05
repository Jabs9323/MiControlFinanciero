import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
const $=id=>document.getElementById(id);
const peso=x=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:2}).format(Number(x)||0);
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const cfg=window.APP_CONFIG||{};
const ready=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl||"") && !!cfg.supabaseAnonKey && !cfg.supabaseAnonKey.includes("YOUR_");
const client=ready?createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const cats={expense:["Alimentación oficina","Apoyo mamá","Salidas Karim","Colegiatura","Educación","Fútbol Karim","Gasolina","Servicios","Suscripciones","Ropa","Automóvil","Comisiones","Salud","Otros"],income:["Sueldo","Vales despensa","Tickets restaurante","Fondo ahorro","Caja ahorro","PTU","Bono MIP","Aguinaldo","Otros"]};
const template=[
["Internet","Servicios",900,"monthly",null,18],
["Colegiatura Karim","Colegiatura",2100,"monthly",null,5],
["Gasolina","Gasolina",400,"weekly"],
["Luz","Servicios",900,"bimonthly"],
["Gas","Servicios",500,"monthly"],
["Comidas y extras oficina (2 días/semana)","Alimentación oficina",400,"daily",2],
["Apoyo mamá (5 días/semana)","Apoyo mamá",200,"daily",5],
["Inglés personal","Educación",1200,"monthly"],
["Inglés Karim","Educación",130,"weekly"],
["ChatGPT","Suscripciones",600,"monthly"],
["Fútbol Karim","Fútbol Karim",450,"monthly"],
["Cortes de cabello (15 por año)","Ropa",7500,"annual"],
["Spotify","Suscripciones",250,"monthly"],
["Datos teléfono","Servicios",300,"monthly"],
["Wellhub","Suscripciones",550,"monthly"],
["Salidas a comer con Karim","Salidas Karim",500,"monthly"],
["Comisión estimada de vales","Comisiones",300,"monthly"],
["Tenencia/refrendo (confirmar 2 pagos)","Automóvil",3200,"annual"],
["Servicio automóvil","Automóvil",2000,"annual"],
["Reinscripción Karim","Educación",5000,"annual"],
["Útiles y uniformes","Educación",5000,"annual"]
];
const annual=b=>{const n=Number(b.amount),f=b.frequency;return {monthly:n*12,weekly:n*52,biweekly:n*26,bimonthly:n*6,annual:n,daily:n*Number(b.days_per_week||0)*52}[f]||0};
const cadence={monthly:"Mensual",weekly:"Semanal",biweekly:"Catorcenal",bimonthly:"Bimestral",annual:"Anual",daily:"Por día"};
let account=null,transactions=[],budgets=[];
function notice(s){$("message").textContent=s}
function elem(tag,content,klass){const node=document.createElement(tag);if(content!==undefined)node.textContent=content;if(klass)node.className=klass;return node}
function record(title,subtitle,value,plus,deleteAction){const wrapper=elem("div",undefined,"record"),left=elem("div"),right=elem("div",undefined,"right");left.append(elem("strong",title),elem("small",subtitle));right.append(elem("strong",value,plus===true?"amount-plus":plus===false?"amount-minus":""));if(deleteAction){const btn=elem("button","Eliminar","delete");btn.type="button";btn.onclick=deleteAction;right.append(btn)}wrapper.append(left,right);return wrapper}
function categories(){const list=cats[$("kind").value];$("category").replaceChildren(...list.map(x=>new Option(x,x)))}
function render(){
 const period=$("period").value,monthRows=transactions.filter(t=>t.occurred_on.startsWith(period));
 const income=monthRows.filter(t=>t.kind==="income").reduce((s,t)=>s+Number(t.amount),0);
 const expense=monthRows.filter(t=>t.kind==="expense").reduce((s,t)=>s+Number(t.amount),0);
 const forecast=budgets.reduce((s,b)=>s+annual(b),0);
 $("shownPeriod").textContent=period;$("net").textContent=peso(income-expense);$("inTotal").textContent=peso(income);$("outTotal").textContent=peso(expense);
 $("planMonthly").textContent=peso(forecast/12);$("annualPlan").textContent=peso(forecast);$("monthlyPlan").textContent=peso(forecast/12);
 $("movementCount").textContent=monthRows.length+" movimientos";
 $("movements").replaceChildren(...(monthRows.length?monthRows.sort((a,b)=>b.occurred_on.localeCompare(a.occurred_on)).map(t=>record(t.description||t.category,t.occurred_on+" · "+t.category+" · "+t.payment_method,(t.kind==="income"?"+":"−")+peso(t.amount),t.kind==="income",()=>erase("transactions",t.id))):[elem("p","Aún no hay movimientos registrados en este mes.","muted")]));
 $("budgetRecords").replaceChildren(...(budgets.length?budgets.map(b=>record(b.name,(cadence[b.frequency]||b.frequency)+" · "+peso(annual(b))+"/año"+(b.due_day?" · día "+b.due_day:""),peso(b.amount),undefined,()=>erase("budget_items",b.id))):[elem("p","Todavía no hay partidas. Carga la plantilla una sola vez.","muted")]));
}
async function refresh(){if(!account)return;const [a,b]=await Promise.all([client.from("transactions").select("*").order("occurred_on",{ascending:false}),client.from("budget_items").select("*").order("created_at",{ascending:true})]);if(a.error||b.error){notice("Error al cargar: "+(a.error||b.error).message);return}transactions=a.data||[];budgets=b.data||[];render();window.dispatchEvent(new CustomEvent("finance:data",{detail:{client,user:account,transactions,budgets}}))}
async function erase(table,id){if(!confirm("¿Eliminar este registro de forma permanente?"))return;const {error}=await client.from(table).delete().eq("id",id);if(error)notice("No se pudo eliminar: "+error.message);else await refresh()}
function showAuth(){const logged=!!account;$("setup").hidden=ready;$("auth").hidden=!ready||logged;$("app").hidden=!logged;$("logout").hidden=!logged}
$("kind").onchange=categories;categories();$("date").value=today();$("period").value=today().slice(0,7);$("period").onchange=render;
$("loginForm").onsubmit=async ev=>{ev.preventDefault();if(!client)return;const {error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});notice(error?error.message:"Sesión iniciada")};
$("logout").onclick=()=>client?.auth.signOut();

$("moveForm").onsubmit=async ev=>{ev.preventDefault();if(!account)return;const amount=Number($("amount").value);if(!Number.isFinite(amount)||amount<=0)return notice("Introduce un importe válido");const {error}=await client.from("transactions").insert({user_id:account.id,occurred_on:$("date").value,kind:$("kind").value,amount,category:$("category").value,description:$("description").value.trim(),payment_method:$("payment").value});if(error)return notice("Error al guardar: "+error.message);$("amount").value="";$("description").value="";notice("Movimiento guardado");await refresh()};
$("budgetForm").onsubmit=async ev=>{ev.preventDefault();if(!account)return;const frequency=$("bFrequency").value,amount=Number($("bAmount").value);if(!Number.isFinite(amount)||amount<0)return notice("Importe inválido");const {error}=await client.from("budget_items").insert({user_id:account.id,name:$("bName").value.trim(),category:$("bCategory").value.trim(),amount,frequency,days_per_week:frequency==="daily"?Number($("bDays").value):null,due_day:$("bDue").value?Number($("bDue").value):null});if(error)return notice("Error al guardar: "+error.message);$("budgetForm").reset();notice("Partida creada");await refresh()};
$("loadTemplate").onclick=async()=>{if(!account)return;if(budgets.length)return notice("La plantilla solo se carga cuando no hay partidas, para evitar duplicados.");const rows=template.map(([name,category,amount,frequency,days_per_week,due_day])=>({user_id:account.id,name,category,amount,frequency,days_per_week:days_per_week??null,due_day:due_day??null}));const {error}=await client.from("budget_items").insert(rows);if(error)return notice("Error cargando plantilla: "+error.message);notice("Plantilla 2027 importada");await refresh()};
for(const button of document.querySelectorAll("[data-tab]"))button.onclick=()=>{document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b===button));document.querySelectorAll(".page").forEach(s=>s.hidden=s.id!==button.dataset.tab);if(button.dataset.tab==="forecast")window.dispatchEvent(new Event("finance:show"));if(button.dataset.tab==="personal")window.dispatchEvent(new Event("personal:show"))};
function download(filename,content,mime){const u=URL.createObjectURL(new Blob([content],{type:mime})),a=document.createElement("a");a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
const csvCell=v=>'"'+String(v??"").replaceAll('"','""')+'"';
$("downloadCSV").onclick=()=>{const rows=[["fecha","tipo","categoria","descripcion","importe","metodo"],...transactions.map(t=>[t.occurred_on,t.kind,t.category,t.description,t.amount,t.payment_method])];download("mis-movimientos.csv","\ufeff"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n"),"text/csv;charset=utf-8")};
$("downloadJSON").onclick=()=>{const safeTx=transactions.map(t=>({fecha:t.occurred_on,tipo:t.kind,categoria:t.category,descripcion:t.description,importe:t.amount,metodo:t.payment_method})),safeBudgets=budgets.map(b=>({concepto:b.name,categoria:b.category,importe:b.amount,frecuencia:b.frequency,dias_semana:b.days_per_week,dia_vencimiento:b.due_day}));download("reporte-chatgpt.json",JSON.stringify({exportado:today(),movimientos:safeTx,presupuestos:safeBudgets},null,2),"application/json")};
(function payroll(){let anchor=new Date(2026,10,5,12),dates=[];for(let i=0;i<40;i++){const d=new Date(anchor);d.setDate(d.getDate()+14*i);if(d.getFullYear()===2027)dates.push(d)}$("paychecks").replaceChildren(...dates.map((d,i)=>record("Catorcena "+(i+1)+" · "+d.toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"}),"Sueldo neto estimado; vales en depósito aparte",peso(8666))));$("bonuses").replaceChildren(...[["Fondo de ahorro","$70,000"],["PTU","$20,000"],["Bono MIP","$25,000"],["Aguinaldo","$30,000"],["Caja de ahorro (diciembre)","$10,000"]].map(([name,value])=>record(name,"Fecha por confirmar",value)))})();
if(!ready){showAuth();notice("Configura Supabase en config.js para entrar.");}else{client.auth.onAuthStateChange((_event,session)=>{const old=account?.id;account=session?.user||null;showAuth();if(account&&account.id!==old)refresh();if(!account){transactions=[];budgets=[];window.dispatchEvent(new Event("finance:logout"));}});client.auth.getSession().then(({data,error})=>{if(error)return notice(error.message);account=data.session?.user||null;showAuth();if(account)refresh()})}
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
