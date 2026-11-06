// Dashboard and payroll checklist. Manual balances are deliberately not changed by transactions.
const H=id=>document.getElementById(id);
const mx=n=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(Number(n)||0);
const anchor=new Date(2026,10,5,12);
let api=null,me=null,budgets=[],payrollChecks=[],monthChecks=[],accounts=[],enabled=false;
const payDates=()=>Array.from({length:31},(_,i)=>{const d=new Date(anchor);d.setDate(d.getDate()+14*i);return d}).filter(d=>d.getFullYear()===2026||d.getFullYear()===2027);
const localISO=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const selected=()=>H("period").value||"2026-11";
async function reloadAll(){
 if(!api||!me)return;
 const results=await Promise.all([
 api.from("money_accounts").select("*"),
 api.from("payment_checks").select("*"),
 api.from("payroll_checks").select("*"),
 api.from("budget_items").select("*")
 ]);
 accounts=results[0].data||[];monthChecks=results[1].data||[];payrollChecks=results[2].data||[];budgets=results[3].data||[];
 const missing=results.filter(x=>x.error).map(x=>x.error.message);
 enabled=!results[2].error;
 H("payrollChecksStatus").textContent=results[2].error?"Ejecuta payroll_checks.sql en Supabase para activar el control de nóminas.":"Marcar una nómina como recibida no añade ingresos; registra el depósito una sola vez en Movimientos.";
 H("homeStatus").textContent=missing.length?"Hay módulos sin configurar: "+missing[0]:"Los saldos provienen de tus cuentas registradas; las obligaciones se marcan manualmente como cubiertas.";
 paint();
}
function scheduled(b,year,month){
 if(year!==2027&&b.frequency==="annual")return 0;
 return Number(window.financeBudgetForMonth?.(b,year,month)||0);
}
function paint(){
 const [year,month]=selected().split("-").map(Number);
 const bank=accounts.filter(a=>a.account_type==="bank").reduce((n,a)=>n+Number(a.balance),0);
 const cash=accounts.filter(a=>a.account_type==="cash").reduce((n,a)=>n+Number(a.balance),0);
 const debt=accounts.filter(a=>a.account_type==="credit").reduce((n,a)=>n+Number(a.balance),0);
 const todos=budgets.filter(b=>scheduled(b,year,month)>0);
 const pending=todos.reduce((sum,b)=>sum+(monthChecks.some(c=>c.budget_id===b.id&&c.fiscal_year===year&&c.month===month&&c.is_paid)?0:scheduled(b,year,month)),0);
 const free=bank+cash-pending;
 H("homeAvailable").textContent=mx(bank+cash);H("homePending").textContent=mx(pending);H("homeAfter").textContent=mx(free);H("homeDebt").textContent=mx(debt);
 H("homeAfter").style.color=free<0?"#ba3b46":"";
 H("checkPendingValue").textContent=mx(pending);
 H("cashflowHome").hidden=!me;
 if(!budgets.length)H("homeStatus").textContent="Sin partidas guardadas. Abre Presupuesto → Actualizar mis partidas 2027 para cargar tu planeación.";
 showPaychecks(year,month);
}
function showPaychecks(year,month){
 const list=payDates().filter(d=>d.getFullYear()===year);
 const parent=H("paychecks");parent.replaceChildren();
 let count=0;
 for(const [i,d] of list.entries()){
  const day=localISO(d),checked=payrollChecks.some(x=>x.pay_date===day&&x.received);
  if(checked)count++;
  const row=document.createElement("label");row.className="check-row payroll-check";
  const cb=document.createElement("input");cb.type="checkbox";cb.checked=checked;cb.disabled=!enabled;
  cb.onchange=async()=>{
   const received=cb.checked;
   const payload={user_id:me.id,pay_date:day,received,confirmed_at:received?new Date().toISOString():null};
   const {error}=await api.from("payroll_checks").upsert(payload,{onConflict:"user_id,pay_date"});
   if(error){cb.checked=!received;H("payrollChecksStatus").textContent="No se pudo guardar: "+error.message;return}
   await reloadAll()
  };
  const info=document.createElement("span"),title=document.createElement("strong"),details=document.createElement("small");
  title.textContent="Catorcena "+(i+1)+" · "+d.toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"});
  details.textContent=(checked?"Recibida":"Pendiente de confirmar")+" · sueldo previsto "+mx(8666)+(day==="2027-03-25"?" · fecha preliminar por validar":"");
  info.append(title,details);row.append(cb,info);parent.append(row);
 }
 H("payrollProgress").textContent=count+" / "+list.length+" cobradas";
}
window.addEventListener("finance:data",e=>{api=e.detail.client;me=e.detail.user;reloadAll()});
window.addEventListener("finance:logout",()=>{api=null;me=null;accounts=[];monthChecks=[];payrollChecks=[];budgets=[];H("cashflowHome").hidden=true});
window.addEventListener("personal:period-change",paint);
window.addEventListener("personal:show",()=>{if(me)reloadAll()});
window.addEventListener("cashflow:refresh",()=>{if(me)reloadAll()});
H("homeGoChecklist").onclick=()=>document.querySelector('[data-tab="personal"]').click();
H("homeGoPayroll").onclick=()=>document.querySelector('[data-tab="payroll"]').click();
