const SUPABASE_URL = "https://tcpxfltarcptnlsxnfec.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjcHhmbHRhcmNwdG5sc3huZmVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1OTk1NzcsImV4cCI6MjEwNDE3NTU3N30.M7QBEcUwlUyD-_x7SFr6AJkHNrwh6BsQ9wazce5sn3U";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let transactions = [];
let canEdit = sessionStorage.getItem("festival_editor") === "true";
let softName = localStorage.getItem("festival_soft_name") || "";

const $ = id => document.getElementById(id);
const money = n => "₹" + Number(n || 0).toLocaleString("en-IN",{maximumFractionDigits:2});
const today = new Date().toISOString().slice(0,10);

$("incomeDate").value = today;
$("expenseDate").value = today;

function applyRoleUI(){
  $("roleBadge").textContent = canEdit ? "Editor" : "Viewer";
  $("editorBtn").textContent = canEdit ? `Editor: ${softName || "Unlocked"}` : "Unlock editor";
  document.querySelectorAll("#incomeForm button,#expenseForm button").forEach(b=>{
    b.disabled = !canEdit;
  });
}

async function init(){
  applyRoleUI();
  await load();
}

async function load(){
  const {data,error}=await sb.from("transactions").select("*")
    .order("date",{ascending:false}).order("created_at",{ascending:false});
  if(error){
    console.error(error);
    alert("Could not load transactions. Check your Supabase URL/key and database setup.");
    return;
  }
  transactions=data||[];
  render();
}

function render(){
  const inc=transactions.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount),0);
  const exp=transactions.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount),0);
  $("totalIncome").textContent=money(inc);
  $("totalExpense").textContent=money(exp);
  $("balance").textContent=money(inc-exp);

  const type=$("typeFilter").value, q=$("search").value.toLowerCase();
  const rows=transactions.filter(x=>
    (type==="all"||x.type===type) &&
    `${x.category} ${x.party} ${x.note||""}`.toLowerCase().includes(q)
  );

  $("transactionCount").textContent=`${rows.length} transaction${rows.length===1?"":"s"}`;
  $("transactions").innerHTML=rows.length?rows.map(x=>`<tr>
    <td>${x.date}</td>
    <td>${x.type}</td>
    <td>${x.category}</td>
    <td>${esc(x.party)}</td>
    <td>${esc(x.note||"")}</td>
    <td class="${x.type}">${x.type==="income"?"+":"−"}${money(x.amount)}</td>
    <td>${canEdit?`<button class="ghost delete" data-id="${x.id}">Delete</button>`:""}</td>
  </tr>`).join(""):`<tr><td colspan="7" class="empty">No transactions yet.</td></tr>`;

  document.querySelectorAll(".delete").forEach(b=>b.onclick=()=>removeTx(b.dataset.id));
  renderReports();
}

function esc(s){
  return String(s).replace(/[&<>"']/g,m=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function renderReports(){
  const ex=transactions.filter(x=>x.type==="expense"), cats={};
  ex.forEach(x=>cats[x.category]=(cats[x.category]||0)+Number(x.amount));
  const max=Math.max(...Object.values(cats),1);

  $("categoryReport").innerHTML=Object.entries(cats)
    .sort((a,b)=>b[1]-a[1])
    .map(([k,v])=>`<div class="bar">
      <div class="bar-label">${esc(k)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div>
      <div class="bar-value">${money(v)}</div>
    </div>`)
    .join("") || `<div class="empty">No expenses yet.</div>`;

  const months={};
  transactions.forEach(x=>{
    const m=x.date.slice(0,7);
    if(!months[m]) months[m]={income:0,expense:0};
    months[m][x.type]+=Number(x.amount);
  });

  $("monthlyReport").innerHTML=Object.entries(months)
    .sort((a,b)=>b[0].localeCompare(a[0]))
    .map(([m,v])=>`<div class="bar">
      <div class="bar-label">${m}</div>
      <div class="bar-value income">+${money(v.income)}</div>
      <div class="bar-value expense">−${money(v.expense)}</div>
    </div>`)
    .join("") || `<div class="empty">No data yet.</div>`;
}

async function addTx(type){
  if(!canEdit) return alert("Viewer access only. Tap “Unlock editor” to add or delete transactions.");

  const data = type==="income" ? {
    type,
    date:$("incomeDate").value,
    category:$("incomeCategory").value,
    party:$("incomeFrom").value.trim(),
    amount:Number($("incomeAmount").value),
    note:$("incomeNote").value.trim(),
    entered_by:softName || null
  } : {
    type,
    date:$("expenseDate").value,
    category:$("expenseCategory").value,
    party:$("expenseTo").value.trim(),
    amount:Number($("expenseAmount").value),
    note:$("expenseNote").value.trim(),
    entered_by:softName || null
  };

  if(data.category==="Miscellaneous" && !data.note)
    return alert("Please add a note for Miscellaneous expense.");

  const {error}=await sb.from("transactions").insert(data);
  if(error) return alert(error.message);

  type==="income"?$("incomeForm").reset():$("expenseForm").reset();
  $("incomeDate").value=today;
  $("expenseDate").value=today;
  await load();
}

async function removeTx(id){
  if(!canEdit) return;
  if(!confirm("Delete this transaction?")) return;
  const {error}=await sb.from("transactions").delete().eq("id",id);
  if(error) alert(error.message);
  else await load();
}

$("editorBtn").onclick=()=>{
  if(canEdit){
    canEdit=false;
    sessionStorage.removeItem("festival_editor");
    applyRoleUI();
    return;
  }
  const name=prompt("Enter your name:");
  if(!name) return;
  const pin=prompt("Enter the editor PIN:");
  if(pin===EDITOR_PIN){
    softName=name.trim();
    localStorage.setItem("festival_soft_name",softName);
    sessionStorage.setItem("festival_editor","true");
    canEdit=true;
    applyRoleUI();
  } else {
    alert("Incorrect editor PIN.");
  }
};

$("incomeForm").onsubmit=e=>{e.preventDefault();addTx("income")};
$("expenseForm").onsubmit=e=>{e.preventDefault();addTx("expense")};
$("typeFilter").onchange=render;
$("search").oninput=render;

$("exportBtn").onclick=()=>{
  const header=["Date","Type","Category","Party","Note","Amount","Entered By"];
  const csv=[header,...transactions.map(x=>[
    x.date,x.type,x.category,x.party,x.note||"",x.amount,x.entered_by||""
  ])].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download="ganesh_festival_transactions.csv";
  a.click();
};

/*
  Replace this PIN before hosting.
  This is a "soft login", not strong authentication.
  Supabase still provides shared storage + RLS for authenticated sessions only;
  for a fully secure editor permission model, use Supabase Auth later.
*/
const EDITOR_PIN = "1234";

init();
