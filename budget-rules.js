// Budget planning rules: recurring cash flow versus reserve for payments without a known month.
(function(){
const daysInMonth=(y,m)=>new Date(y,m,0).getDate();
const countWeekdays=(year,month,days)=>{let count=0;for(let day=1;day<=daysInMonth(year,month);day++){const week=new Date(year,month-1,day).getDay();if(week!==0&&week!==6)count++}return count};
function monthAmount(b,year,month){
 const amt=Number(b.amount)||0, freq=b.frequency, due=b.due_month==null?null:Number(b.due_month);
 if(freq==="monthly")return amt;
 if(freq==="annual")return due===null?amt/12:month===due?amt:0;
 if(freq==="bimonthly")return due===null?amt/2:(month-due+12)%2===0?amt:0;
 if(freq==="weekly")return amt*52/12;
 if(freq==="biweekly")return amt*26/12;
 if(freq==="daily")return amt*(Number(b.days_per_week)||0)*52/12;
 return 0;
}
function expensesForMonth(items,year,month){return items.reduce((sum,b)=>sum+monthAmount(b,year,month),0)}
window.financeBudgetForMonth=monthAmount;
window.financeMonthlyExpenses=expensesForMonth;
window.financeBudgetNote="Anuales/bimestrales sin mes configurado se presentan como provisiones; no como pagos confirmados. Semanales y diarios se prorratean para planeación.";
})();