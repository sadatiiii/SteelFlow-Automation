(() => {
  const $ = (id) => document.getElementById(id);
  const state = { tab: document.body.dataset.defaultTab || "overview", leads: [], orders: [], emails: [], editingOrder: null, editingEmail: null };
  const titles = { overview:"نمای کلی", leads:"مشتری‌ها و سرنخ‌ها", orders:"مدیریت سفارش‌ها", emails:"مرکز ایمیل‌ها", activity:"تاریخچه فعالیت‌ها" };
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const date = (v) => { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? esc(v) : d.toLocaleString("fa-IR",{dateStyle:"medium",timeStyle:"short"}); };
  const toast = (message, bad=false) => { const el=$("toast"); el.textContent=message; el.style.background=bad?"#3b2527":"#20342d"; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),3200); };
  async function api(path, options={}) {
    const response = await fetch("/api/admin/"+path, { credentials:"same-origin", ...options, headers:{ "Content-Type":"application/json", ...(options.headers||{}) } });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || data.detail || ("HTTP "+response.status));
    return data;
  }
  const payload = (form) => Object.fromEntries(new FormData(form).entries());
  function showAuth() { $("authScreen").hidden=false; $("appContent").hidden=true; $("logoutBtn").hidden=true; }
  function showApp(user) { $("authScreen").hidden=true; $("appContent").hidden=false; $("logoutBtn").hidden=false; $("adminUser").textContent=user?.username||"مدیر"; activateTab(state.tab); loadOverview().catch(e=>toast(e.message,true)); }
  function activateTab(tab) {
    state.tab=tab;
    document.querySelectorAll(".side-link").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
    document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+tab));
    $("pageTitle").textContent=titles[tab]||"مرکز مدیریت";
    if(tab==="leads") loadLeads();
    if(tab==="orders") loadOrders();
    if(tab==="emails") loadEmails();
    if(tab==="activity") loadActivity();
  }
  async function loadOverview() {
    const d=await api("overview");
    $("statLeads").textContent=d.stats.leads;
    $("statOrders").textContent=d.stats.orders;
    $("statDrafts").textContent=d.stats.drafts;
    $("statSent").textContent=d.stats.sent;
    $("recentActivity").innerHTML=d.recent.length?d.recent.map(a=>activityHtml(a)).join(""):'<div class="empty-state">هنوز فعالیتی ثبت نشده است.</div>';
  }
  function activityHtml(a) {
    return '<div class="activity-row"><span class="activity-date">'+date(a.activity_date)+'</span><div><b>'+esc(a.activity_type)+'</b><p>'+esc(a.message_summary||"—")+(a.outcome?" · "+esc(a.outcome):"")+'</p></div><span class="status-chip">'+esc(a.contact_channel||"ثبت سیستمی")+'</span></div>';
  }
  async function loadLeads() {
    const q=encodeURIComponent($("leadSearch").value.trim());
    const d=await api("leads?q="+q); state.leads=d.leads||[];
    $("leadsTable").innerHTML=state.leads.length?state.leads.map(l=>'<tr><td><b>'+esc(l.company_name)+'</b><br><small>'+esc(l.city||l.country||"")+'</small></td><td>'+esc(l.contact_name||"—")+'</td><td>'+esc(l.contact_email||"—")+'</td><td><span class="status-chip">'+esc(l.lead_status)+'</span></td><td>'+esc(l.order_count)+'</td><td>'+date(l.updated_at)+'</td><td><button class="table-action" data-lead="'+esc(l.lead_id)+'">جزئیات ←</button></td></tr>').join(""):'<tr><td colspan="7" class="empty-state">مشتری‌ای مطابق جستجو پیدا نشد.</td></tr>';
    $("leadsTable").querySelectorAll("[data-lead]").forEach(b=>b.addEventListener("click",()=>loadLeadDetail(b.dataset.lead)));
    fillLeadSelects();
  }
  async function loadLeadDetail(id) {
    try {
      const d=await api("leads/"+encodeURIComponent(id)), l=d.lead;
      $("leadDetail").hidden=false;
      $("leadDetail").innerHTML='<div class="panel-heading"><div><span class="eyebrow">CUSTOMER PROFILE</span><h3>'+esc(l.company_name)+'</h3></div><div><button class="table-action" id="editLeadBtn">ویرایش مشتری</button> <button class="icon-close" id="closeLeadDetail">×</button></div></div><div class="detail-grid">'+[
        ["نام مخاطب",l.contact_name],["ایمیل",l.contact_email],["تلفن",l.phone],["وب‌سایت",l.website],["موقعیت",(l.city||"")+" "+(l.country||"")],["وضعیت",l.lead_status],["اولویت",l.priority],["یادداشت",l.notes]
      ].map(([k,v])=>'<div class="detail-item"><small>'+esc(k)+'</small><b>'+esc(v||"—")+'</b></div>').join("")+'</div><h3>سفارش‌های مشتری</h3>'+((d.orders||[]).map(o=>'<p>'+esc(o.order_id)+' · '+esc(o.shipping_status)+' · '+esc(o.product||"")+'</p>').join("")||'<p class="muted">سفارشی ثبت نشده است.</p>')+'<h3>تاریخچه ارتباطات</h3>'+((d.activities||[]).map(activityHtml).join("")||'<p class="muted">فعالیتی ثبت نشده است.</p>')+'<h3>ایمیل‌ها</h3>'+((d.emails||[]).map(e=>'<p>'+esc(e.email_subject)+' · '+esc(e.send_status)+' · '+date(e.created_at)+'</p>').join("")||'<p class="muted">ایمیلی ثبت نشده است.</p>');
      $("closeLeadDetail").onclick=()=>{$("leadDetail").hidden=true;};
      $("editLeadBtn").onclick=()=>{
        const fields=[["company_name","نام شرکت"],["contact_name","نام مخاطب"],["contact_email","ایمیل"],["phone","تلفن"],["website","وب‌سایت"],["country","کشور"],["city","شهر"],["lead_status","وضعیت"],["priority","اولویت"],["notes","یادداشت"]];
        const form=document.createElement("form");form.className="form-grid";form.id="leadEditForm";
        form.innerHTML=fields.map(([k,label])=>'<label>'+label+'<input name="'+k+'" value="'+esc(l[k]||"")+'"></label>').join("")+'<div class="form-actions wide"><button class="btn-primary" type="submit">ذخیره تغییرات</button></div>';
        $("leadDetail").append(form);
        form.onsubmit=async ev=>{ev.preventDefault();try{await api("leads/"+encodeURIComponent(l.lead_id),{method:"PATCH",body:JSON.stringify(payload(form))});toast("اطلاعات مشتری به‌روزرسانی شد.");await loadLeads();await loadLeadDetail(l.lead_id);}catch(err){toast(err.message,true);}};
      };
    } catch(e){toast(e.message,true);}
  }
  async function loadOrders() {
    const q=encodeURIComponent($("orderSearch").value.trim());
    const d=await api("orders?q="+q); state.orders=d.orders||[];
    $("ordersTable").innerHTML=state.orders.length?state.orders.map(o=>'<tr><td><b>'+esc(o.order_id)+'</b></td><td>'+esc(o.customer_name)+'</td><td>'+esc(o.product||"—")+'</td><td><span class="status-chip">'+esc(o.order_status)+'</span></td><td><span class="status-chip '+(o.shipping_status==="Delivered"?"good":o.shipping_status==="In Transit"?"warn":"")+'">'+esc(o.shipping_status)+'</span></td><td>'+esc(o.tracking_number||"—")+'</td><td>'+date(o.updated_at)+'</td><td><button class="table-action" data-edit-order="'+esc(o.order_id)+'">ویرایش</button> · <button class="table-action" data-archive-order="'+esc(o.order_id)+'">بایگانی</button></td></tr>').join(""):'<tr><td colspan="8" class="empty-state">هنوز سفارشی ثبت نشده است.</td></tr>';
    $("ordersTable").querySelectorAll("[data-edit-order]").forEach(b=>b.onclick=()=>editOrder(b.dataset.editOrder));
    $("ordersTable").querySelectorAll("[data-archive-order]").forEach(b=>b.onclick=()=>archiveOrder(b.dataset.archiveOrder));
    fillLeadSelects();
  }
  function fillLeadSelects() {
    ["orderLead","emailLead","activityLead"].forEach(id=>{const el=$(id);if(!el)return;const old=el.value;const first=id==="orderLead"?"<option value=''>بدون اتصال</option>":id==="activityLead"?"<option value=''>انتخاب مشتری (اختیاری)</option>":"<option value=''>انتخاب مشتری</option>";el.innerHTML=first+state.leads.map(l=>'<option value="'+esc(l.lead_id)+'">'+esc(l.company_name)+' — '+esc(l.contact_name||l.contact_email||"")+'</option>').join("");if(old)el.value=old;});
  }
  function openOrderEditor(order) {
    state.editingOrder=order?.order_id||null;
    const form=$("orderForm"); form.reset();
    $("orderFormTitle").textContent=order?"ویرایش سفارش "+order.order_id:"ثبت سفارش جدید";
    if(order) Object.entries(order).forEach(([k,v])=>{if(form.elements[k])form.elements[k].value=v??"";});
    $("orderEditor").hidden=false; $("orderEditor").scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function editOrder(id) { const order=state.orders.find(o=>o.order_id===id); if(order)openOrderEditor(order); }
  async function archiveOrder(id) {
    if(!confirm("این سفارش بایگانی شود؟ سوابق آن حذف نخواهد شد."))return;
    try{await api("orders/"+encodeURIComponent(id),{method:"DELETE"});toast("سفارش بایگانی شد.");await loadOrders();await loadOverview();}catch(e){toast(e.message,true);}
  }
  async function loadEmails() {
    const d=await api("emails");state.emails=d.emails||[];
    $("emailsTable").innerHTML=state.emails.length?state.emails.map(e=>'<tr><td>'+esc(e.company_name||e.contact_name||e.lead_id)+'</td><td>'+esc(e.recipient_email)+'</td><td>'+esc(e.email_subject||"(بدون موضوع)")+'</td><td>'+esc(e.email_number)+'</td><td><span class="status-chip '+(e.send_status==="Sent"?"good":"warn")+'">'+esc(e.send_status)+'</span></td><td>'+date(e.created_at)+'</td><td><button class="table-action" data-edit-email="'+esc(e.email_id)+'" '+(e.send_status!=="Draft"?"disabled":"")+'>'+ (e.send_status==="Draft"?"ویرایش":"مشاهده")+'</button></td></tr>').join(""):'<tr><td colspan="7" class="empty-state">هنوز ایمیلی ثبت نشده است.</td></tr>';
    $("emailsTable").querySelectorAll("[data-edit-email]").forEach(b=>b.onclick=()=>editEmail(b.dataset.editEmail));
    fillLeadSelects();
  }
  function openEmailEditor(email) {
    state.editingEmail=email?.email_id||null;
    const f=$("emailForm");f.reset();
    if(email){f.elements.lead_id.value=email.lead_id;f.elements.email_subject.value=email.email_subject||"";f.elements.email_body.value=email.email_body||"";}
    $("emailRecipient").value=email?.recipient_email||"";
    $("emailEditor").hidden=false;$("emailEditor").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function editEmail(id){const email=state.emails.find(e=>e.email_id===id);if(email)openEmailEditor(email);}
  async function loadActivity(){
    const d=await api("activity");
    $("allActivity").innerHTML=(d.activities||[]).map(activityHtml).join("")||'<div class="empty-state">فعالیتی ثبت نشده است.</div>';
  }
  async function loadLeadOptions(){if(!state.leads.length){const d=await api("leads");state.leads=d.leads||[];}fillLeadSelects();}
  document.querySelectorAll(".side-link").forEach(b=>b.onclick=()=>activateTab(b.dataset.tab));
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>activateTab(b.dataset.go));
  $("leadSearch").addEventListener("input",()=>loadLeads().catch(e=>toast(e.message,true)));
  $("orderSearch").addEventListener("input",()=>loadOrders().catch(e=>toast(e.message,true)));
  $("newOrderBtn").onclick=async()=>{try{await loadLeadOptions();openOrderEditor(null);}catch(e){toast(e.message,true);}};
  $("closeOrderEditor").onclick=$("cancelOrder").onclick=()=>{$("orderEditor").hidden=true;};
  $("orderForm").onsubmit=async e=>{e.preventDefault();const data=payload(e.currentTarget);try{const path=state.editingOrder?"orders/"+encodeURIComponent(state.editingOrder):"orders";await api(path,{method:state.editingOrder?"PATCH":"POST",body:JSON.stringify(data)});toast("اطلاعات سفارش در D1 ذخیره شد.");$("orderEditor").hidden=true;await loadOrders();await loadOverview();}catch(err){$("orderStatus").textContent=err.message;toast(err.message,true);}};
  $("newEmailBtn").onclick=async()=>{try{await loadLeadOptions();openEmailEditor(null);}catch(e){toast(e.message,true);}};
  $("closeEmailEditor").onclick=$("cancelEmail").onclick=()=>{$("emailEditor").hidden=true;};
  $("emailLead").onchange=()=>{const l=state.leads.find(x=>x.lead_id===$("emailLead").value);$("emailRecipient").value=l?.contact_email||"";};
  $("emailForm").onsubmit=async e=>{e.preventDefault();const data=payload(e.currentTarget);try{if(state.editingEmail)await api("emails/"+encodeURIComponent(state.editingEmail),{method:"PATCH",body:JSON.stringify(data)});else await api("emails",{method:"POST",body:JSON.stringify(data)});toast("پیش‌نویس در D1 ذخیره شد.");$("emailEditor").hidden=true;await loadEmails();await loadOverview();}catch(err){toast(err.message,true);}};
  $("newActivityBtn").onclick=async()=>{await loadLeadOptions();$("activityFormPanel").hidden=!$("activityFormPanel").hidden;};
  $("activityForm").onsubmit=async e=>{e.preventDefault();try{await api("activity",{method:"POST",body:JSON.stringify(payload(e.currentTarget))});e.currentTarget.reset();$("activityFormPanel").hidden=true;toast("فعالیت ثبت شد.");await loadActivity();await loadOverview();}catch(err){toast(err.message,true);}};
  $("loginForm").onsubmit=async e=>{e.preventDefault();$("authError").textContent="";try{const d=await api("login",{method:"POST",body:JSON.stringify(payload(e.currentTarget))});showApp(d.user);}catch(err){$("authError").textContent=err.message;}};
  $("setupForm").onsubmit=async e=>{e.preventDefault();$("authError").textContent="";try{await api("setup",{method:"POST",body:JSON.stringify(payload(e.currentTarget))});toast("حساب مدیر ساخته شد. حالا وارد شوید.");$("setupBox").hidden=true;$("loginForm").elements.username.value=e.currentTarget.elements.username.value;}catch(err){$("authError").textContent=err.message;}};
  $("logoutBtn").onclick=async()=>{try{await api("logout",{method:"POST"});}finally{showAuth();}};
  $("showSetup").onclick=()=>$("setupBox").hidden=!$("setupBox").hidden;

  async function init(){
    try{const d=await api("session");showApp(d.user);}
    catch(e){showAuth();}
  }
  init();
})();