(function () {
  const page = document.body?.dataset?.page || "home";

  const N8N_FORM_URL = "https://n8n.tabcoyazd.ir/form-test/7904b9b5-4a2e-4b25-922d-0b1423843d0d";

  const i18n = {
    en: {
      tagline: "Strong Gratings, Smarter Projects",
      nav_about: "Who We Are",
      nav_products: "Products",
      nav_collab: "Collaboration",
      nav_privacy: "Privacy",
      nav_admin: "Admin",
      nav_home: "Home",
      hero_title: "Industrial Grating You Can Trust",
      hero_desc: "We design and deliver reliable grating solutions for industrial, architectural, and infrastructure projects.",
      hero_cta: "Start Collaboration",
      about_title: "Who We Are",
      about_p1: "TABCO is a grating-focused team committed to quality manufacturing, on-time delivery, and practical engineering support.",
      about_p2: "We produce grating for walkways, platforms, drainage covers, and industrial floors where durability and safety are critical.",
      usecases_title: "Where Grating Works Best",
      use_1: "Factories and production lines",
      use_2: "Power plants and petrochemical facilities",
      use_3: "Commercial ramps and service corridors",
      use_4: "Drainage and ventilation zones",
      catalog_title: "Catalog Snapshot",
      catalog_desc: "Key product information from your catalog is shown below.",
      collab_title: "Interested in Working Together?",
      collab_desc: "Fill in the collaboration form below. Submissions are handled by your n8n form workflow and can be pushed to Google Sheets.",
      n8n_note: "Important: Replace the form URL in script.js (N8N_FORM_URL) with your real n8n form link.",
      fallback_label: "If the form does not load, open it directly:",
      privacy_title: "Privacy Policy & Terms",
      privacy_h2_1: "1) Data Collection",
      privacy_p1: "We collect only the information submitted through the collaboration form (e.g., name, phone, company, and project details).",
      privacy_h2_2: "2) Purpose of Use",
      privacy_p2: "Your data is used for customer communication, quotation preparation, order follow-up, and service quality improvement.",
      privacy_h2_3: "3) Third-Party Services",
      privacy_p3: "Form processing may use n8n and Google Sheets. Their platform-level policies may also apply.",
      privacy_h2_4: "4) Data Security",
      privacy_p4: "We apply reasonable safeguards to protect your submitted information from unauthorized access.",
      privacy_h2_5: "5) Terms Updates",
      privacy_p5: "These terms may be updated from time to time. Continued use of the website indicates acceptance.",
      admin_title: "Order Tracking Admin Panel",
      admin_desc: "Manage orders, shipping stage, forwarder information, and tracking numbers.",
      admin_form_title: "Add / Update Order",
      admin_list_title: "Registered Orders",
      f_order_id: "Order ID",
      f_customer: "Customer Name",
      f_phone: "Phone",
      f_status: "Shipping Stage",
      f_forwarder: "Forwarder",
      f_tracking: "Tracking Number",
      f_note: "Notes",
      s_pending: "Pending",
      s_production: "Production",
      s_ready: "Ready to Ship",
      s_transit: "In Transit",
      s_delivered: "Delivered",
      btn_save: "Save Order",
      btn_clear_all: "Clear All",
      th_updated: "Updated",
      th_actions: "Actions",
      btn_delete: "Delete",
      empty_orders: "No orders yet.",
      confirm_clear: "Are you sure you want to clear all orders?"
    },
    fa: {
      tagline: "گریتینگ مقاوم، پروژه هوشمند",
      nav_about: "ما کی هستیم",
      nav_products: "محصولات",
      nav_collab: "همکاری",
      nav_privacy: "حریم خصوصی",
      nav_admin: "مدیریت",
      nav_home: "خانه",
      hero_title: "گریتینگ صنعتی قابل اعتماد",
      hero_desc: "ما راهکارهای گریتینگ مطمئن را برای پروژه‌های صنعتی، معماری و زیرساختی طراحی و تامین می‌کنیم.",
      hero_cta: "شروع همکاری",
      about_title: "ما کی هستیم",
      about_p1: "TABCO یک تیم تخصصی گریتینگ است که بر کیفیت تولید، تحویل به‌موقع و پشتیبانی مهندسی کاربردی تمرکز دارد.",
      about_p2: "محصولات ما برای مسیرهای عبور، سکوها، پوشش آبرو و کف‌ صنعتی طراحی شده‌اند؛ جایی که دوام و ایمنی اهمیت بالایی دارد.",
      usecases_title: "گریتینگ برای چه کاربردهایی مناسب است",
      use_1: "کارخانه‌ها و خطوط تولید",
      use_2: "نیروگاه‌ها و صنایع نفت، گاز و پتروشیمی",
      use_3: "رمپ‌های خدماتی و مسیرهای تردد",
      use_4: "نواحی زهکشی و تهویه",
      catalog_title: "نمایی از کاتالوگ",
      catalog_desc: "اطلاعات کلیدی محصول از کاتالوگ شما در تصویر زیر نمایش داده شده است.",
      collab_title: "مایل به همکاری هستید؟",
      collab_desc: "فرم همکاری زیر را تکمیل کنید. اطلاعات از طریق فرم n8n دریافت شده و می‌تواند به Google Sheets منتقل شود.",
      n8n_note: "مهم: لینک فرم واقعی n8n را در فایل script.js (متغیر N8N_FORM_URL) جایگزین کنید.",
      fallback_label: "اگر فرم لود نشد، مستقیم باز کنید:",
      privacy_title: "قوانین و حریم خصوصی",
      privacy_h2_1: "۱) جمع‌آوری اطلاعات",
      privacy_p1: "ما فقط اطلاعاتی را دریافت می‌کنیم که شما در فرم همکاری ثبت می‌کنید (مانند نام، شماره تماس، شرکت و جزئیات پروژه).",
      privacy_h2_2: "۲) هدف استفاده از اطلاعات",
      privacy_p2: "اطلاعات شما برای ارتباط با مشتری، تهیه پیشنهاد قیمت، پیگیری سفارش و بهبود کیفیت خدمات استفاده می‌شود.",
      privacy_h2_3: "۳) سرویس‌های شخص ثالث",
      privacy_p3: "پردازش فرم ممکن است از طریق n8n و Google Sheets انجام شود و قوانین این پلتفرم‌ها نیز اعمال می‌گردد.",
      privacy_h2_4: "۴) امنیت داده‌ها",
      privacy_p4: "برای محافظت از اطلاعات ثبت‌شده شما، اقدامات امنیتی منطقی در نظر گرفته می‌شود.",
      privacy_h2_5: "۵) به‌روزرسانی قوانین",
      privacy_p5: "این قوانین ممکن است در گذر زمان به‌روزرسانی شوند. استفاده مستمر از سایت به‌معنای پذیرش تغییرات است.",
      admin_title: "پنل مدیریت پیگیری سفارش‌ها",
      admin_desc: "مدیریت سفارش‌ها، مرحله ارسال، اطلاعات فورواردر و کد رهگیری.",
      admin_form_title: "افزودن / ویرایش سفارش",
      admin_list_title: "سفارش‌های ثبت‌شده",
      f_order_id: "کد سفارش",
      f_customer: "نام مشتری",
      f_phone: "شماره تماس",
      f_status: "مرحله ارسال",
      f_forwarder: "فورواردر",
      f_tracking: "شماره رهگیری",
      f_note: "توضیحات",
      s_pending: "در انتظار",
      s_production: "در حال تولید",
      s_ready: "آماده ارسال",
      s_transit: "در حال ارسال",
      s_delivered: "تحویل شده",
      btn_save: "ذخیره سفارش",
      btn_clear_all: "حذف همه",
      th_updated: "آخرین بروزرسانی",
      th_actions: "عملیات",
      btn_delete: "حذف",
      empty_orders: "هنوز سفارشی ثبت نشده است.",
      confirm_clear: "آیا مطمئن هستید که همه سفارش‌ها حذف شوند؟"
    }
  };


  const homeTranslations = {
    en: {
      tagline:"Industrial precision, made to perform", nav_specs:"Specifications", hero_eyebrow:"ENGINEERED FOR INDUSTRY", hero_title:"Special Square Bar<br>for Grating Industry", hero_desc:"Precision manufacturing, consistent quality, and flexible sizes for projects where every detail matters.", hero_cta:"Discuss Your Requirements", hero_specs:"Explore specifications", proof_title:"Custom manufacturing", proof_desc:"Sized around your project needs", video_label:"A closer look at the product", video_caption:"Quality in every section", video_subcaption:"Special square bar for grating industry", capacity:"1 tonne", capacity_desc:"Production capacity in 4 hours", metric_sizes:"Available sizes", metric_capacity:"Production in 4 hours", metric_range:"Product size range", metric_quality:"Focus on consistent quality", advantages_eyebrow:"WHY TABCO", advantages_title:"Made with attention to detail", advantages_desc:"From size selection to product consistency, your project needs stay at the center.", adv_1_title:"Consistent quality", adv_1_desc:"A focus on product consistency throughout manufacturing.", adv_2_title:"Custom production", adv_2_desc:"Choose a size that fits your project requirements.", adv_3_title:"Production capacity", adv_3_desc:"Capacity of one tonne in four hours.", specs_eyebrow:"TECHNICAL DETAILS", specs_title:"Dimensions & weight", specs_desc:"Explore available sizes. Listed weights refer to one square metre.", sizes_label:"Available sizes", sizes_title:"Choose dimensions", custom_size:"Available to order", grams:"g/m²", spec_note:"Weights for other sizes can be confirmed when requesting a quotation.", weight_eyebrow:"AVAILABLE WEIGHT DATA", weight_title:"Weight per square metre", weight_desc:"The values below reflect the product information currently provided.", grams_per_sqm:"grams / square metre", weight_note:"Contact sales for technical details and weight information for other sizes.", contact_eyebrow:"LET'S WORK TOGETHER", collab_title:"Ready for your next project.", collab_desc:"Contact us for more information, project requirements, or a collaboration request.", contact_point1:"Support with product enquiries", contact_point2:"Review of required sizes", form_title:"Collaboration request", form_desc:"Complete the form below to get started.", n8n_note:"To activate this form, add your live n8n form URL in script.js.", fallback_label:"If the form does not load:", fallback_link:"Open the form directly", footer_text:"Special square bar for grating industry · Precision for industrial needs", nav_products:"Product", nav_about:"Advantages", nav_collab:"Contact", nav_privacy:"Privacy", nav_admin:"Admin", nav_home:"Home"
    },
    fa: {
      tagline:"راهکار صنعتی، تولید دقیق", nav_specs:"مشخصات", hero_eyebrow:"ساخته‌شده برای صنعت", hero_title:"چارپهلوی ویژه<br>صنعت گریتینگ", hero_desc:"تولید دقیق، کیفیت یکنواخت و امکان سفارش در ابعاد متنوع؛ برای پروژه‌هایی که جزئیات در آن‌ها اهمیت دارد.", hero_cta:"درخواست مشاوره و سفارش", hero_specs:"مشاهده مشخصات", proof_title:"تولید سفارشی", proof_desc:"هماهنگ با نیاز پروژه شما", video_label:"نمای نزدیک از محصول", video_caption:"کیفیت در هر مقطع", video_subcaption:"چارپهلوی ویژه صنعت گریتینگ", capacity:"۱ تن", capacity_desc:"توان تولید در ۴ ساعت", metric_sizes:"سایز قابل تولید", metric_capacity:"توان تولید در ۴ ساعت", metric_range:"بازه ابعاد محصول", metric_quality:"تمرکز بر یکنواختی کیفیت", advantages_eyebrow:"چرا تابکو؟", advantages_title:"تولید با تمرکز بر جزئیات", advantages_desc:"از انتخاب ابعاد تا یکنواختی محصول، نیاز پروژه شما در مرکز توجه ماست.", adv_1_title:"کیفیت یکنواخت", adv_1_desc:"توجه به یکنواختی محصول در فرآیند تولید.", adv_2_title:"تولید سفارشی", adv_2_desc:"امکان انتخاب سایز متناسب با نیاز پروژه.", adv_3_title:"توان تولید بالا", adv_3_desc:"ظرفیت تولید یک تن در چهار ساعت.", specs_eyebrow:"اطلاعات فنی", specs_title:"ابعاد و وزن محصول", specs_desc:"ابعاد قابل تولید را بررسی کنید. وزن‌های اعلام‌شده مربوط به هر متر مربع هستند.", sizes_label:"سایزهای قابل تولید", sizes_title:"انتخاب ابعاد", custom_size:"قابل سفارش", grams:"گرم/مترمربع", spec_note:"وزن سایر سایزها در صورت نیاز، هنگام استعلام سفارش اعلام می‌شود.", weight_eyebrow:"وزن اسمی اعلام‌شده", weight_title:"وزن در هر متر مربع", weight_desc:"مقادیر زیر بر اساس اطلاعات فعلی محصول درج شده‌اند.", grams_per_sqm:"گرم / متر مربع", weight_note:"برای دریافت اطلاعات فنی و استعلام وزن سایر ابعاد، با واحد فروش در ارتباط باشید.", contact_eyebrow:"شروع یک همکاری", collab_title:"برای پروژه بعدی‌تان آماده‌ایم.", collab_desc:"برای دریافت اطلاعات بیشتر، بررسی نیاز پروژه یا ثبت درخواست همکاری با ما در ارتباط باشید.", contact_point1:"پاسخ‌گویی به درخواست سفارش", contact_point2:"بررسی سایزهای موردنیاز", form_title:"فرم درخواست همکاری", form_desc:"فرم زیر را تکمیل کنید.", n8n_note:"برای فعال شدن فرم، لینک واقعی فرم n8n را در فایل script.js وارد کنید.", fallback_label:"اگر فرم باز نشد:", fallback_link:"باز کردن مستقیم فرم", footer_text:"چارپهلوی ویژه صنعت گریتینگ · تولید دقیق برای نیازهای صنعتی", nav_products:"محصول", nav_about:"مزایا", nav_collab:"درخواست همکاری", nav_privacy:"حریم خصوصی", nav_admin:"مدیریت", nav_home:"خانه"
    }
  };

  const state = {
    lang: localStorage.getItem("tabco_lang") || (page === "home" ? "fa" : "en")
  };

  function t(key) {
    return (page === "home" ? homeTranslations[state.lang]?.[key] : null) || i18n[state.lang]?.[key] || i18n.en[key] || key;
  }

  function applyLanguage() {
    const html = document.documentElement;
    const isFa = state.lang === "fa";
    html.lang = isFa ? "fa" : "en";
    html.dir = isFa ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      if (key === "hero_title") el.innerHTML = t(key);
      else el.textContent = t(key);
    });

    const langToggle = document.getElementById("langToggle");
    if (langToggle) langToggle.textContent = isFa ? "EN" : "FA";

    const orderSearch = document.getElementById("orderSearch");
    if (orderSearch) {
      orderSearch.placeholder = isFa
        ? "جستجو در سفارش/مشتری/رهگیری"
        : "Search order/customer/tracking";
    }
  }

  function setupThemeToggle() {
    const root = document.documentElement;
    const button = document.getElementById("themeToggle");
    const icon = document.getElementById("themeIcon");
    const saved = localStorage.getItem("tabco_theme");
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    const theme = saved || (prefersLight ? "light" : "dark");
    root.dataset.theme = theme;
    if (icon) icon.textContent = theme === "dark" ? "☼" : "☾";
    if (button) button.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      localStorage.setItem("tabco_theme", next);
      if (icon) icon.textContent = next === "dark" ? "☼" : "☾";
    });
  }

  function setupLangToggle() {
    const btn = document.getElementById("langToggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      state.lang = state.lang === "en" ? "fa" : "en";
      localStorage.setItem("tabco_lang", state.lang);
      applyLanguage();
      if (page === "admin") renderOrders();
    });
  }

  function setupReveal() {
    const elements = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.12 }
    );
    elements.forEach((el) => observer.observe(el));
  }

  function setupHome() {
    const frame = document.getElementById("n8nFrame");
    const link = document.getElementById("n8nDirectLink");
    if (!frame || !link) return;

    frame.src = N8N_FORM_URL;
    link.href = N8N_FORM_URL;
  }

  const STORAGE_KEY = "tabco_orders";

  function loadOrders() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveOrders(orders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }

  function setupAdmin() {
    const form = document.getElementById("orderForm");
    const tbody = document.getElementById("ordersTbody");
    const search = document.getElementById("orderSearch");
    const clearBtn = document.getElementById("clearOrders");
    if (!form || !tbody || !search || !clearBtn) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const record = {
        id: String(fd.get("id") || "").trim(),
        customer: String(fd.get("customer") || "").trim(),
        phone: String(fd.get("phone") || "").trim(),
        status: String(fd.get("status") || "").trim(),
        forwarder: String(fd.get("forwarder") || "").trim(),
        tracking: String(fd.get("tracking") || "").trim(),
        note: String(fd.get("note") || "").trim(),
        updatedAt: new Date().toISOString()
      };

      if (!record.id || !record.customer || !record.status) return;

      const orders = loadOrders();
      const idx = orders.findIndex((x) => x.id.toLowerCase() === record.id.toLowerCase());
      if (idx >= 0) orders[idx] = { ...orders[idx], ...record };
      else orders.unshift(record);
      saveOrders(orders);
      form.reset();
      renderOrders();
    });

    search.addEventListener("input", renderOrders);

    clearBtn.addEventListener("click", () => {
      if (!confirm(t("confirm_clear"))) return;
      saveOrders([]);
      renderOrders();
    });

    tbody.addEventListener("click", (e) => {
      const btn = e.target;
      if (!(btn instanceof HTMLElement)) return;
      if (btn.dataset.action !== "delete") return;
      const id = btn.dataset.id;
      if (!id) return;
      const next = loadOrders().filter((o) => o.id !== id);
      saveOrders(next);
      renderOrders();
    });

    renderOrders();
  }

  function fmtDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString(state.lang === "fa" ? "fa-IR" : "en-US");
  }

  function renderOrders() {
    const tbody = document.getElementById("ordersTbody");
    const search = document.getElementById("orderSearch");
    if (!tbody || !search) return;

    const q = search.value.trim().toLowerCase();
    const rows = loadOrders().filter((o) => {
      const blob = `${o.id} ${o.customer} ${o.phone} ${o.status} ${o.forwarder} ${o.tracking} ${o.note}`.toLowerCase();
      return !q || blob.includes(q);
    });

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="muted">${t("empty_orders")}</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map(
        (o) => `
        <tr>
          <td>${escapeHtml(o.id)}</td>
          <td>${escapeHtml(o.customer)}</td>
          <td>${escapeHtml(o.phone || "-")}</td>
          <td>${escapeHtml(o.status || "-")}</td>
          <td>${escapeHtml(o.forwarder || "-")}</td>
          <td>${escapeHtml(o.tracking || "-")}</td>
          <td>${escapeHtml(o.note || "-")}</td>
          <td>${escapeHtml(fmtDate(o.updatedAt))}</td>
          <td>
            <button class="btn danger" data-action="delete" data-id="${encodeURIComponent(o.id)}">${t("btn_delete")}</button>
          </td>
        </tr>
      `
      )
      .join("");

    tbody.querySelectorAll("button[data-action='delete']").forEach((btn) => {
      const raw = btn.getAttribute("data-id");
      if (raw) btn.setAttribute("data-id", decodeURIComponent(raw));
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function init() {
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    applyLanguage();
    setupLangToggle();
    setupThemeToggle();
    setupReveal();

    if (page === "home") setupHome();
    if (page === "admin") setupAdmin();
  }

  init();
})();