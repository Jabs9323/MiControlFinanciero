// Planeación AOP vs Forecast vs Real 2027. Sin llaves secretas.
const cash=x=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(x||0);
const $=id=>document.getElementById(id);
const months=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const calendar=[
"2027-01-14","2027-01-28","2027-02-11","2027-02-25","2027-03-11","2027-03-25",
"2027-04-08","2027-04-22","2027-05-06","2027-05-20","2027-06-03","2027-06-17",
"2027-07-01","2027-07-15","2027-07-29","2027-08-12","2027-08-26","2027-09-09",
"2027-09-23","2027-10-07","2027-10-21","2027-11-04","2027-11-18","2027-12-02",
"2027-12-16","2027-12-30"];
// March 25: preliminary calendar marks nonworking day; December 30: exceptional style.
// Do not represent these dates as confirmed.
const benefitDefaults=[
{name:"Fondo de ahorro",amount:70000,date:"2027-07-21",confirmed:false},
{name:"PTU",amount:20000,date:"",confirmed:false},
{name:"Bono MIP",amount:25000,date:"",confirmed:false},
{name:"Aguinaldo",amount:30000,date:"",confirmed:false},
{name:"Caja de ahorro",amount:10000,date:"2027-12-15",confirmed:false}
];
let supabase=null,user=null,movements=[],budget=[],scenarios=[],hasMigration=true;
const yearly=b=>{let a=Number(b.amount);return ({monthly:a*12,weekly:a*52,biweekly:a*26,bimonthly:a*6,annual:a,daily:a*Number(b.days_per_week||0)*52})[b.frequency]||0};
const rd=(s,v)=>{const x=document.createElement(s);x.textContent=v;return x};
const note=s=>{$("forecastNotice").textContent=s};
const dateMonth=d=>Number(d?.slice(5,7)||0);
function baseItems(){
 const arr=[];const add=(m,k,c,a)=>{if(a>0)arr.push({month:m,kind:k,category:c,amount:a})};
 for(let m=1;m<=12;m++)add(m,"income","Vales",5000);
 for(const d of calendar)add(dateMonth(d),"income","Sueldo",8666);
 for(const b of budget){
  for(let m=1;m<=12;m++)add(m,"expense",b.category||"Otros",window.financeBudgetForMonth(b,2027,m))
 }
 // Special payments are not silently assigned to invented months.
 for(const b of benefitDefaults)if(b.date)add(dateMonth(b.date),"income",b.name,b.amount);
 return sumItems(arr);
}
function sumItems(rows){const map=new Map();for(const r of rows){const key=[r.month,r.kind,r.category].join("|");map.set(key,(map.get(key)||0)+Number(r.amount))}return [...map].map(([key,amount])=>{const [m,kind,category]=key.split("|");return {month:Number(m),kind,category,amount:Math.round(amount*100)/100}})}
function asKey(x){return [x.month,x.kind,x.category].join("|")}
function plan(scenario){
 const map=new Map(baseItems().map(x=>[asKey(x),{...x}]));
 // Explicitly stored 0 values remain valid, including removal of a projection.
 for(const x of scenarios.filter(x=>x.scenario===scenario))map.set(asKey(x),{month:x.month,kind:x.kind,category:x.category,amount:Number(x.amount)});
 return [...map.values()]
}
function real(){return sumItems(movements.filter(x=>x.occurred_on?.startsWith("2027-")).map(x=>({month:dateMonth(x.occurred_on),kind:x.kind,category:x.category,amount:Number(x.amount)})))}
function perMonth(rows){const a=Array.from({length:12},(_,i)=>({month:i+1,income:0,expense:0,net:0}));for(const r of rows){if(r.month<1||r.month>12)continue;a[r.month-1][r.kind]+=Number(r.amount)}for(const x of a)x.net=x.income-x.expense;return a}
function allTotals(a){return a.reduce((p,c)=>({income:p.income+c.income,expense:p.expense+c.expense,net:p.net+c.net}),{income:0,expense:0,net:0})}
function render(){
 const a=perMonth(plan("aop")),f=perMonth(plan("forecast")),r=perMonth(real());
 const y=allTotals(a),fy=allTotals(f),ry=allTotals(r);
 $("aopNet").textContent=cash(y.net);$("forecastNet").textContent=cash(fy.net);$("realNet").textContent=cash(ry.net);
 $("varianceNet").textContent=cash(ry.net-y.net);
 const rows=$("aopRows");rows.replaceChildren();
 for(let i=0;i<12;i++){
  const tr=document.createElement("tr");
  for(const v of [months[i],a[i].income,a[i].expense,a[i].net,f[i].net,r[i].net,r[i].net-a[i].net])tr.append(rd("td",typeof v==="number"?cash(v):v));
  rows.append(tr)
 }
 const ct=$("financeChart");if(ct)draw(ct,[a,f,r],$("chartMetric").value);
 const month=Number($("aopMonth").value)||1;const detail=plan($("scenarioChoice").value).filter(x=>x.month===month);
 const sel=$("aopCategory");const opts=[...new Set([...detail.map(x=>x.kind+":"+x.category),"income:Sueldo","income:Vales","income:PTU","income:Bono MIP","income:Aguinaldo","income:Caja de ahorro","expense:Ropa"])].sort();
 const prev=sel.value;sel.replaceChildren(...opts.map(x=>new Option(x.replace("income:","Ingreso · ").replace("expense:","Gasto · "),x)));if(opts.includes(prev))sel.value=prev;
 const current=detail.find(x=>x.kind+":"+x.category===sel.value);if(current)$("aopAmount").value=String(current.amount);
 $("forecastDetails").replaceChildren(...detail.sort((a,b)=>a.kind.localeCompare(b.kind)||a.category.localeCompare(b.category)).map(x=>{const d=rd("div","", "");d.className="record";const l=rd("div",x.category);const s=rd("small",x.kind==="income"?"Ingreso":"Gasto");l.append(s);d.append(l,rd("strong",cash(x.amount)));return d}));
}
function draw(canvas,series,metric){
 const dpr=Math.min(devicePixelRatio||1,2),width=Math.max(320,canvas.clientWidth),height=260;
 canvas.width=width*dpr;canvas.height=height*dpr;const c=canvas.getContext("2d");c.scale(dpr,dpr);
 c.clearRect(0,0,width,height);const margin={l:50,r:12,t:25,b:38},W=width-margin.l-margin.r,H=height-margin.t-margin.b;
 const vals=series.flatMap(x=>x.map(y=>y[metric]));const min=Math.min(0,...vals),max=Math.max(1,...vals),pad=(max-min)*.1;
 const bottom=min-pad,top=max+pad;const y=v=>margin.t+(top-v)/(top-bottom)*H;const x=i=>margin.l+i*W/11;
 c.strokeStyle="#e5eaf1";c.fillStyle="#738198";c.font="11px sans-serif";c.textAlign="right";
 for(let t=0;t<=4;t++){const val=bottom+(top-bottom)*t/4;const yy=y(val);c.beginPath();c.moveTo(margin.l,yy);c.lineTo(width-margin.r,yy);c.stroke();c.fillText(Math.round(val/1000)+"k",margin.l-6,yy+4)}
 const colors=["#0c244b","#13a28b","#f0a14a"];
 for(let j=0;j<3;j++){c.strokeStyle=colors[j];c.lineWidth=2.6;c.beginPath();series[j].forEach((v,i)=>i?c.lineTo(x(i),y(v[metric])):c.moveTo(x(i),y(v[metric])));c.stroke()}
 c.fillStyle="#738198";c.textAlign="center";for(let i=0;i<12;i++)c.fillText(months[i].slice(0,3),x(i),height-13)
}
async function update(){if(!supabase||!user)return;const [s,t,b]=await Promise.all([supabase.from("financial_scenarios").select("*").eq("fiscal_year",2027),supabase.from("transactions").select("*").gte("occurred_on","2027-01-01").lte("occurred_on","2027-12-31"),supabase.from("budget_items").select("*")]);if(s.error){hasMigration=false;note("Falta ejecutar forecast_2027.sql en Supabase. Puedes visualizar la simulación, pero todavía no guardar escenarios. Detalle: "+s.error.message);scenarios=[]}else{hasMigration=true;note("AOP base calculado desde el presupuesto; Forecast se puede editar y guardar en Supabase.");scenarios=s.data||[]}if(t.error||b.error){note("No se pudieron cargar todos los movimientos o presupuestos: "+(t.error||b.error).message);return}movements=t.data||[];budget=b.data||[];render()}
window.addEventListener("finance:data",e=>{supabase=e.detail.client;user=e.detail.user;movements=e.detail.transactions;budget=e.detail.budgets;update()});
window.addEventListener("finance:logout",()=>{supabase=null;user=null;movements=[];budget=[];scenarios=[]});
$("aopMonth").replaceChildren(...months.map((x,i)=>new Option(x,String(i+1))));$("aopMonth").value="1";
$("scenarioChoice").onchange=render;$("aopMonth").onchange=()=>{const period=document.getElementById("period");if(period){period.value="2027-"+String($("aopMonth").value).padStart(2,"0");period.dispatchEvent(new Event("change"))}render()};$("aopCategory").onchange=()=>{const [kind,...cat]=$("aopCategory").value.split(":");const x=plan($("scenarioChoice").value).find(x=>x.month===$("aopMonth").value*1&&x.kind===kind&&x.category===cat.join(":"));$("aopAmount").value=String(x?.amount??0)};
$("chartMetric").onchange=render;window.addEventListener("resize",()=>{if(user)render()});window.addEventListener("finance:show",()=>{if(user)render()});window.addEventListener("finance:period-change",()=>{const selected=document.getElementById("period")?.value||"";if(selected.startsWith("2027-"))$("aopMonth").value=String(Number(selected.slice(5,7)));if(user)render()});
$("aopSave").onclick=async()=>{if(!supabase||!user)return note("Inicia sesión primero");if(!hasMigration)return note("Ejecuta forecast_2027.sql primero");const [kind,...category]=$("aopCategory").value.split(":"),amount=Number($("aopAmount").value);if(!Number.isFinite(amount)||amount<0)return note("Introduce un importe válido");const scenario=$("scenarioChoice").value;const row={user_id:user.id,fiscal_year:2027,month:Number($("aopMonth").value),kind,category:category.join(":"),scenario,amount};const {error}=await supabase.from("financial_scenarios").upsert(row,{onConflict:"user_id,fiscal_year,month,kind,category,scenario"});if(error)return note("No se pudo guardar: "+error.message);note("Escenario actualizado en Supabase");await update()};
$("freezeAop").onclick=async()=>{if(!supabase||!user||!hasMigration)return note("Conecta Supabase y ejecuta la migración SQL primero.");if(scenarios.some(x=>x.scenario==="aop")&&!confirm("Ya hay partidas AOP guardadas. ¿Quieres reemplazar la base original?"))return;const rows=baseItems().map(x=>({...x,user_id:user.id,fiscal_year:2027,scenario:"aop"}));if(!rows.length)return note("Carga la plantilla de presupuesto antes de congelar AOP.");const {error}=await supabase.from("financial_scenarios").upsert(rows,{onConflict:"user_id,fiscal_year,month,kind,category,scenario"});if(error)return note("Error al guardar AOP: "+error.message);note("AOP 2027 guardado; conserva los importes originales para comparar con Forecast.");await update()};
(function calendarRender(){const el=$("calendar2027");for(let i=0;i<calendar.length;i++){const d=calendar[i];const div=document.createElement("div");div.className="record";const left=rd("div","Catorcena "+(i+1)+" · "+d);const badge=i===5?"Día inhábil: confirmar fecha":i===25?"Fecha excepcional: validar":"Preliminar ADP";left.append(rd("small",badge));div.append(left,rd("strong",cash(8666)));el.append(div)}})();
(function benefitsRender(){const el=$("special2027");for(const b of benefitDefaults){const d=document.createElement("div");d.className="record";const left=rd("div",b.name);left.append(rd("small",b.name==="Fondo de ahorro"?"21 julio (estimación proporcionada)":b.date?"Diciembre (día provisional)":"Mes de pago pendiente de confirmar"));d.append(left,rd("strong",cash(b.amount)));el.append(d)}})();
