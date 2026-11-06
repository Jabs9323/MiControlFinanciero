// Personal monthly dashboard: real movement reporting, payment checklists, manually reconciled balances.
const el=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(Number(n)||0);
const monthNames=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
let client=null,owner=null,movements=[],items=[],accounts=[],checks=[],available=false;
const annual=b=>({monthly:12,weekly:52,biweekly:26,bimonthly:6,annual:1,daily:52*Number(b.days_per_week||0)})[b.frequency]*Number(b.amount||0);
const monthly=b=>annual(b)/12;
function displayStatus(msg){el("personalStatus").textContent=msg}
function item(name,description,value){const div=document.createElement("div");div.className="record";const left=document.createElement("div");const strong=document.createElement("strong");strong.textContent=name;left.append(strong);const small=document.createElement("small");small.textContent=description;left.append(small);const right=document.createElement("strong");right.textContent=value;div.append(left,right);return div}
async function reload(){
 if(!owner||!client)return;
 const a=await Promise.all([
 client.from("money_accounts").select("*").order("name",{ascending:true}),
 client.from("payment_checks").select("*")
 ]);
 if(a[0].error||a[1].error){available=false;displayStatus("Falta ejecutar personal_dashboard.sql en Supabase. "+(a[0].error||a[1].error).message);render();return}
 available=true;accounts=a[0].data||[];checks=a[1].data||[];displayStatus("Saldos editables y checklist guardados de forma privada en Supabase.");render();window.dispatchEvent(new Event("cashflow:refresh"))
}
function render(){
 const period=el("period").value||"2027-01",year=Number(period.slice(0,4)),month=Number(period.slice(5,7)),prefix=period;
 const expenses=movements.filter(x=>x.kind==="expense"&&x.occurred_on?.startsWith(prefix));
 const income=movements.filter(x=>x.kind==="income"&&x.occurred_on?.startsWith(prefix));
 const exp=expenses.reduce((a,x)=>a+Number(x.amount),0),inc=income.reduce((a,x)=>a+Number(x.amount),0);
 const plan=items.reduce((a,b)=>a+window.financeBudgetForMonth(b,year,month),0);
 el("monthPlan").textContent=money(plan);el("monthSpent").textContent=money(exp);el("monthRemain").textContent=money(plan-exp);
 el("monthIncome").textContent=money(inc);
 const bank=accounts.filter(a=>a.account_type==="bank").reduce((n,a)=>n+Number(a.balance),0),cash=accounts.filter(a=>a.account_type==="cash").reduce((n,a)=>n+Number(a.balance),0),credit=accounts.filter(a=>a.account_type==="credit").reduce((n,a)=>n+Number(a.balance),0);
 el("bankValue").textContent=money(bank);el("cashValue").textContent=money(cash);el("creditValue").textContent=money(credit);
 el("liquidValue").textContent=money(bank+cash);el("netWorth").textContent=money(bank+cash-credit);
 const acc=el("accountRows");acc.replaceChildren(...accounts.map(x=>{const e=item(x.name,(x.account_type==="bank"?"Banco":x.account_type==="cash"?"Efectivo":"Crédito · deuda actual"),money(x.balance));const b=document.createElement("button");b.className="secondary tiny";b.textContent="Editar saldo";b.onclick=()=>{el("accountEditId").value=x.id;el("accountName").value=x.name;el("accountType").value=x.account_type;el("accountBalance").value=x.balance;el("accountSubmit").textContent="Guardar saldo"};e.append(b);return e}));
 if(!accounts.length)acc.append(item("Sin cuentas registradas","Agrega banco, efectivo y tarjeta de crédito","—"));
 const scheduled=items.filter(x=>window.financeBudgetForMonth(x,year,month)>0);
 const checkRows=el("checkRows");checkRows.replaceChildren();
 let done=0;
 for(const b of scheduled){const status=checks.find(x=>x.month===month&&x.fiscal_year===year&&x.budget_id===b.id);if(status?.is_paid)done++;
  const row=document.createElement("label");row.className="check-row";
  const input=document.createElement("input");input.type="checkbox";input.checked=!!status?.is_paid;input.disabled=!available;
  input.onchange=async()=>{const prior=input.checked;const {error}=await client.from("payment_checks").upsert({user_id:owner.id,budget_id:b.id,fiscal_year:year,month,is_paid:prior,paid_at:prior?new Date().toISOString():null,updated_at:new Date().toISOString()},{onConflict:"user_id,budget_id,fiscal_year,month"});if(error){input.checked=!prior;displayStatus("No se pudo actualizar: "+error.message)}else await reload()};
  const details=document.createElement("span");const title=document.createElement("strong");title.textContent=b.name;const meta=document.createElement("small");meta.textContent=(b.due_day?"Vence día "+b.due_day+" · ":"")+({monthly:"Mensual",weekly:"Semanal",biweekly:"Catorcenal",bimonthly:"Bimestral",annual:"Anual",daily:"Estimado semanal"}[b.frequency]||"")+" · "+money(window.financeBudgetForMonth(b,year,month))+"/mes previsto";details.append(title,meta);
  row.append(input,details);checkRows.append(row)
 }
 el("checksSummary").textContent=done+" / "+scheduled.length+" cubiertos";
 const grouped=new Map();for(const b of items)grouped.set(b.category,(grouped.get(b.category)||0)+window.financeBudgetForMonth(b,year,month));
 const spentMap=new Map();for(const x of expenses)spentMap.set(x.category,(spentMap.get(x.category)||0)+Number(x.amount));
 const all=[...new Set([...grouped.keys(),...spentMap.keys()])].sort((a,b)=>Math.max(grouped.get(b)||0,spentMap.get(b)||0)-Math.max(grouped.get(a)||0,spentMap.get(a)||0));
 const max=Math.max(1,...all.flatMap(c=>[grouped.get(c)||0,spentMap.get(c)||0]));
 const holder=el("categoryBars");holder.replaceChildren(...all.map(c=>{const div=document.createElement("div");div.className="category-line";const head=document.createElement("div");head.className="category-head";const left=document.createElement("strong");left.textContent=c;const right=document.createElement("small");right.textContent=money(spentMap.get(c)||0)+" / "+money(grouped.get(c)||0);head.append(left,right);div.append(head);for(const [amount,label,cls] of [[grouped.get(c)||0,"Planeado","planned"],[spentMap.get(c)||0,"Real","actual"]]){const track=document.createElement("div");track.className="category-track";track.setAttribute("aria-label",label+" "+money(amount));const bar=document.createElement("div");bar.className="category-bar "+cls;bar.style.width=Math.min(100,Math.max(0,amount/max*100))+"%";track.append(bar);div.append(track)}return div}));
}
window.addEventListener("finance:data",e=>{client=e.detail.client;owner=e.detail.user;movements=e.detail.transactions;items=e.detail.budgets;reload()});
window.addEventListener("finance:logout",()=>{owner=null;client=null;movements=[];items=[];accounts=[];checks=[];available=false});
window.addEventListener("personal:show",()=>{if(owner)reload()});
window.addEventListener("personal:period-change",()=>{if(owner)render()});
el("accountForm").onsubmit=async e=>{e.preventDefault();if(!client||!owner)return displayStatus("Inicia sesión primero");if(!available)return displayStatus("Ejecuta personal_dashboard.sql primero");
const record={user_id:owner.id,name:el("accountName").value.trim(),account_type:el("accountType").value,balance:Number(el("accountBalance").value),updated_at:new Date().toISOString()};
if(!record.name||!Number.isFinite(record.balance)||record.balance<0)return displayStatus("Revisa el nombre y el saldo (debe ser positivo o cero).");
const id=el("accountEditId").value;let query=client.from("money_accounts");const result=id?await query.update(record).eq("id",id):await query.insert(record);
if(result.error)return displayStatus("No se pudo guardar la cuenta: "+result.error.message);
el("accountForm").reset();el("accountEditId").value="";el("accountSubmit").textContent="Añadir cuenta";await reload()};
el("accountCancel").onclick=()=>{el("accountForm").reset();el("accountEditId").value="";el("accountSubmit").textContent="Añadir cuenta"};
