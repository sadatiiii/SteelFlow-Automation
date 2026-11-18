(() => {
  const copy = {
    fa: {home:"خانه",back:"بازگشت به سایت",eyebrow:"شروع یک همکاری",title:"فرم درخواست همکاری",intro:"برای بررسی درخواست شما، اطلاعات زیر را تکمیل کنید. همکاران ما پس از بررسی با شما ارتباط می‌گیرند.",fullName:"نام و نام خانوادگی *",company:"نام شرکت *",email:"آدرس ایمیل *",phone:"شماره تماس",country:"کشور",city:"شهر",website:"وب‌سایت شرکت",note:"توضیحات / نیاز پروژه",submit:"ارسال درخواست ↗",foot:"اطلاعات شما فقط برای بررسی و پیگیری درخواست همکاری استفاده می‌شود.",privacy:"حریم خصوصی",sending:"در حال ثبت درخواست…",success:"درخواست شما با موفقیت ثبت شد. سپاس از اینکه با TABCO تماس گرفتید.",error:"ثبت درخواست انجام نشد. لطفاً کمی بعد دوباره تلاش کنید."},
    en: {home:"Home",back:"Back to website",eyebrow:"LET'S WORK TOGETHER",title:"Collaboration Request",intro:"Please complete the details below. Our team will review your request and get in touch.",fullName:"Full name *",company:"Company name *",email:"Email address *",phone:"Phone number",country:"Country",city:"City",website:"Company website",note:"Notes / project requirements",submit:"Submit request ↗",foot:"Your information is used only to review and follow up on this inquiry.",privacy:"Privacy",sending:"Submitting your request…",success:"Your request has been submitted. Thank you for contacting TABCO.",error:"We could not submit your request. Please try again shortly."}
  };
  const root = document.documentElement;
  const form = document.getElementById("inquiryForm");
  const status = document.getElementById("formStatus");
  const button = document.getElementById("submitButton");
  let lang = localStorage.getItem("tabco_lang") || "fa";
  const applyLang = () => {
    root.lang = lang; root.dir = lang === "fa" ? "rtl" : "ltr";
    document.querySelectorAll("[data-t]").forEach(el => { const key=el.dataset.t; if(copy[lang][key]) el.textContent=copy[lang][key]; });
    document.getElementById("langToggle").textContent = lang === "fa" ? "EN" : "FA";
    document.title = lang === "fa" ? "فرم درخواست همکاری | TABCO" : "Collaboration Request | TABCO";
  };
  const applyTheme = () => {
    const saved=localStorage.getItem("tabco_theme") || "dark";
    root.dataset.theme=saved;
    document.getElementById("themeToggle").textContent=saved === "dark" ? "☼" : "☾";
  };
  document.getElementById("langToggle").addEventListener("click",()=>{lang=lang==="fa"?"en":"fa";localStorage.setItem("tabco_lang",lang);applyLang();});
  document.getElementById("themeToggle").addEventListener("click",()=>{localStorage.setItem("tabco_theme",root.dataset.theme==="dark"?"light":"dark");applyTheme();});
  document.getElementById("year").textContent=new Date().getFullYear();
  applyLang(); applyTheme();

  form.addEventListener("submit", async event => {
    event.preventDefault();
    status.classList.remove("error");
    status.textContent=copy[lang].sending;
    button.disabled=true;
    const data=Object.fromEntries(new FormData(form).entries());
    try {
      const response=await fetch("/api/inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(result.detail || result.error || "Request failed");
      form.reset(); status.textContent=copy[lang].success;
    } catch(error) {
      status.classList.add("error");
      status.textContent=copy[lang].error;
      console.error("TABCO inquiry:",error);
    } finally {button.disabled=false;}
  });
})();
