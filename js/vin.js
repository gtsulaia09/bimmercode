// js/vin.js — Precision 17-Digit BMW & MINI VIN Decoder
let currentLanguage = localStorage.getItem("forumLanguage") || localStorage.getItem("language") || "en";
if (!["en", "ru", "ka"].includes(currentLanguage)) currentLanguage = "en";

const vinTranslations = {
  en: {
    brandSub: "Diagnostic & Engineering",
    navCodes: "Diagnostic Codes",
    navCodeIndex: "Code Index",
    vinBtn: "VIN Decoder",
    navParts: "Parts Finder",
    forumBtn: "Forum",
    navAi: "AI Assistant",
    profile: "Account",
    homeBtn: "Diagnostic Codes",
    vinKicker: "ISO 3779 Vehicle Identification",
    vinTitle: "17-Digit BMW & MINI VIN Specification Decoder",
    vinSubtitle:
      "Enter a complete 17-character Vehicle Identification Number to extract chassis series, powertrain configuration, assembly plant, and S-code build utilities.",
    btnCheck: "Decode VIN",
    loading: "Querying NHTSA vPIC & BMW manufacturer registry…",
    lblHistory: "Recent VINs:",
    segWmiDesc: "Manufacturer (WBA / WBS / 5UX)",
    segVdsDesc: "Model, Body & Powertrain",
    segMidDesc: "Check Digit, Year & Factory",
    segVisDesc: "Chassis Production Serial",
    decodedSheetKicker: "Verified Vehicle Identification",
    diagnoseCarAi: "Diagnose Vehicle with AI",
    searchModelCodes: "Search Model Fault Codes",

    lblModel: "Model Designation",
    lblYear: "Model Year",
    lblSeries: "Platform / Series",
    lblBody: "Body Architecture",
    lblEngine: "Displacement & Cylinders",
    lblPower: "Rated Output",
    lblFuel: "Fuel System",
    lblDrive: "Drivetrain Layout",
    lblDoors: "Doors",
    lblCountry: "Country of Origin",
    lblPlant: "Assembly Plant",
    lblWeight: "Gross Weight Class (GVWR)",
    vinGroupVehicle: "Chassis & Body Identification",
    vinGroupPowertrain: "Powertrain & Driveline",
    vinGroupFactory: "Manufacturing & GVWR",

    sCodeKicker: "Extended Build Sheet & History",
    deepDecodeTitle: "Factory S-Codes & Auction Verification Utilities",
    deepDecodeDesc:
      "Inspect factory SA/S-code build equipment (M-Sport, Harman Kardon, Adaptive Suspension) and verify North American auction records.",
    bidfaxTitle: "Auction Archive",
    bidfaxDesc: "BidFax (Copart & IAAI Photos)",
    statvinTitle: "Salvage & Lot Records",
    statvinDesc: "Stat.vin Lot History",
    factoryDocsTitle: "Factory Build Options",
    factoryDocsDesc: "M-Decoder (SA / S-Code Sheet)",
    bimmerWorkTitle: "bimmer.work",
    bimmerWorkDesc: "Factory Equipment & Paint Code",

    errLength: "Enter all 17 VIN characters (letters I, O, and Q are not used in ISO 3779 VINs).",
    errForbiddenChars: "Characters I, O, and Q are invalid in automotive VINs — use 1 and 0 instead.",
    errNotBmw: "This VIN belongs to {make}. This decoder is calibrated for BMW & MINI vehicles.",
    errNetwork: "Unable to reach the VIN specification registry. Check your connection and retry.",
    validReady: "17-character ISO 3779 format verified — ready to decode.",
  },
  ru: {
    brandSub: "Диагностика и инженерия",
    navCodes: "Коды ошибок",
    navCodeIndex: "Каталог кодов",
    vinBtn: "VIN-декодер",
    navParts: "Запчасти",
    forumBtn: "Форум",
    navAi: "AI-ассистент",
    profile: "Аккаунт",
    homeBtn: "Коды ошибок",
    vinKicker: "Идентификация ТС по ISO 3779",
    vinTitle: "Расшифровка 17-значного VIN BMW и MINI",
    vinSubtitle:
      "Введите полный 17-символьный идентификационный номер кузова для получения серии, силовой установки, завода сборки и ссылок на комплектацию S-кодов.",
    btnCheck: "Расшифровать",
    loading: "Запрос в реестр производителей BMW / vPIC…",
    lblHistory: "Недавние проверки:",
    segWmiDesc: "Производитель (WBA / WBS / 5UX)",
    segVdsDesc: "Модель, кузов и двигатель",
    segMidDesc: "Контр. знак, год и завод",
    segVisDesc: "Серийный номер шасси",
    decodedSheetKicker: "Паспортная спецификация автомобиля",
    diagnoseCarAi: "Диагностика авто с AI",
    searchModelCodes: "Коды ошибок модели",

    lblModel: "Модель",
    lblYear: "Модельный год",
    lblSeries: "Платформа / Серия",
    lblBody: "Тип кузова",
    lblEngine: "Объём и цилиндры",
    lblPower: "Мощность",
    lblFuel: "Тип топлива",
    lblDrive: "Привод",
    lblDoors: "Двери",
    lblCountry: "Страна сборки",
    lblPlant: "Завод-изготовитель",
    lblWeight: "Полная масса (GVWR)",
    vinGroupVehicle: "Кузов и идентификация",
    vinGroupPowertrain: "Двигатель и трансмиссия",
    vinGroupFactory: "Сборка и весовой класс",

    sCodeKicker: "Комплектация и история",
    deepDecodeTitle: "Заводские опции (S-коды) и проверка аукционов",
    deepDecodeDesc:
      "Откройте полную ведомость заводских опций SA/S-кодов (M-Sport, музыка, подвеска) и проверьте архивные лоты Copart / IAAI.",
    bidfaxTitle: "Архив аукционов",
    bidfaxDesc: "BidFax (фото Copart и IAAI)",
    statvinTitle: "Статистика лотов",
    statvinDesc: "Stat.vin (история повреждений)",
    factoryDocsTitle: "Заводские опции",
    factoryDocsDesc: "M-Decoder (лист S-кодов)",
    bimmerWorkTitle: "bimmer.work",
    bimmerWorkDesc: "Комплектация и код краски",

    errLength: "Введите ровно 17 символов VIN (буквы I, O и Q в стандарте VIN не используются).",
    errForbiddenChars: "Символы I, O и Q недопустимы в VIN — используйте цифры 1 и 0.",
    errNotBmw: "Этот VIN принадлежит марке {make}. Декодер предназначен для BMW и MINI.",
    errNetwork: "Не удалось подключиться к базе VIN. Проверьте соединение и повторите попытку.",
    validReady: "Формат 17 символов проверен — готов к расшифровке.",
  },
  ka: {
    brandSub: "დიაგნოსტიკა და ინჟინერია",
    navCodes: "დიაგნოსტიკის კოდები",
    navCodeIndex: "კოდების კატალოგი",
    vinBtn: "VIN დეკოდერი",
    navParts: "ნაწილები",
    forumBtn: "ფორუმი",
    navAi: "AI ასისტენტი",
    profile: "პროფილი",
    homeBtn: "დიაგნოსტიკის კოდები",
    vinKicker: "ISO 3779 ავტომობილის იდენტიფიკაცია",
    vinTitle: "BMW და MINI 17-ნიშნა VIN დეკოდერი",
    vinSubtitle:
      "შეიყვანეთ სრული 17-სიმბოლოიანი VIN კოდი სერიის, ძრავის მახასიათებლების, ქარხნისა და S-კოდების ოპციების შესამოწმებლად.",
    btnCheck: "გაშიფრვა",
    loading: "მიმდინარეობს BMW / vPIC რეესტრში მოძიება…",
    lblHistory: "ბოლო შემოწმებები:",
    segWmiDesc: "მწარმოებელი (WBA / WBS / 5UX)",
    segVdsDesc: "მოდელი, ძარა და ძრავა",
    segMidDesc: "საკონტროლო, წელი და ქარხანა",
    segVisDesc: "შასის სერიული ნომერი",
    decodedSheetKicker: "დადასტურებული ტექნიკური მონაცემები",
    diagnoseCarAi: "AI დიაგნოსტიკა ამ მანქანისთვის",
    searchModelCodes: "მოდელის კოდების ძიება",

    lblModel: "მოდელი",
    lblYear: "გამოშვების წელი",
    lblSeries: "პლატფორმა / სერია",
    lblBody: "ძარის ტიპი",
    lblEngine: "მოცულობა და ცილინდრები",
    lblPower: "სიმძლავრე",
    lblFuel: "საწვავის ტიპი",
    lblDrive: "წამყვანი თვლები",
    lblDoors: "კარების რაოდენობა",
    lblCountry: "მწარმოებელი ქვეყანა",
    lblPlant: "ქარხანა",
    lblWeight: "სრული წონა (GVWR)",
    vinGroupVehicle: "ძარა და იდენტიფიკაცია",
    vinGroupPowertrain: "ძრავა და ტრანსმისია",
    vinGroupFactory: "წარმოება და წონა",

    sCodeKicker: "კომპლექტაცია და ისტორია",
    deepDecodeTitle: "ქარხნული S-კოდები და აუქციონის ისტორია",
    deepDecodeDesc:
      "გადაამოწმეთ ქარხნული ოპციების სრული სია (M-Sport, აუდიო, დაკიდება) და Copart / IAAI აუქციონის არქივი.",
    bidfaxTitle: "აუქციონის არქივი",
    bidfaxDesc: "BidFax (Copart და IAAI ფოტოები)",
    statvinTitle: "ლოტების ისტორია",
    statvinDesc: "Stat.vin (დაზიანებების სტატისტიკა)",
    factoryDocsTitle: "ქარხნული ოპციები",
    factoryDocsDesc: "M-Decoder (S-კოდების სია)",
    bimmerWorkTitle: "bimmer.work",
    bimmerWorkDesc: "კომპლექტაცია და საღებავის კოდი",

    errLength: "შეიყვანეთ 17-ვე VIN სიმბოლო (ასოები I, O და Q სტანდარტში არ გამოიყენება).",
    errForbiddenChars: "სიმბოლოები I, O და Q VIN კოდში დაუშვებელია — გამოიყენეთ 1 და 0.",
    errNotBmw: "ეს VIN ეკუთვნის მარკას: {make}. დეკოდერი განკუთვნილია BMW და MINI-სთვის.",
    errNetwork: "VIN რეესტრთან დაკავშირება ვერ მოხერხდა. სცადეთ ხელახლა.",
    validReady: "17-სიმბოლოიანი ფორმატი სწორია — მზადაა გასაშიფრად.",
  },
};

function escVin(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setValidationStatus(message, state = "") {
  const msgEl = document.getElementById("vin-validation-msg");
  if (!msgEl) return;
  msgEl.textContent = message || "";
  msgEl.className = "vin-validation-msg" + (state ? ` is-${state}` : "");
}

function updateVinTelemetry() {
  const vinInput = document.getElementById("vin-input");
  const counter = document.getElementById("vin-char-counter");
  if (!vinInput) return;

  const cleaned = vinInput.value.toUpperCase().replace(/[\s-]/g, "");
  if (cleaned !== vinInput.value) {
    vinInput.value = cleaned;
  }

  const len = cleaned.length;
  const hasForbidden = /[IOQ]/.test(cleaned);
  const t = vinTranslations[currentLanguage] || vinTranslations.en;

  if (counter) {
    counter.textContent = `${len} / 17`;
    counter.classList.toggle("is-ready", len === 17 && !hasForbidden);
    counter.classList.toggle("is-invalid", hasForbidden);
  }

  const setSeg = (id, val, padLen) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = (val || "").padEnd(padLen, "·");
  };
  setSeg("seg-wmi", cleaned.slice(0, 3), 3);
  setSeg("seg-vds", cleaned.slice(3, 8), 5);
  setSeg("seg-mid", cleaned.slice(8, 11), 3);
  setSeg("seg-vis", cleaned.slice(11, 17), 6);

  if (hasForbidden) {
    setValidationStatus(t.errForbiddenChars, "error");
  } else if (len === 17) {
    setValidationStatus(t.validReady, "valid");
  } else {
    setValidationStatus("", "");
  }
}

function loadHistory() {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem("vinHistory") || "[]");
  } catch (_) {}
  const container = document.getElementById("history-container");
  const list = document.getElementById("history-list");

  if (!Array.isArray(history) || history.length === 0) {
    if (container) container.style.display = "none";
    return;
  }

  if (container) container.style.display = "flex";
  if (list) {
    list.innerHTML = "";
    history.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "history-item";
      btn.innerHTML = `
        <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>
        <span>${escVin(item.title)}</span>
        <code>${escVin(String(item.vin || "").slice(0, 7))}…</code>
      `;
      btn.onclick = () => {
        const inp = document.getElementById("vin-input");
        if (inp) {
          inp.value = item.vin;
          updateVinTelemetry();
          decodeVin();
        }
      };
      list.appendChild(btn);
    });
  }
}

function saveToHistory(vin, title) {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem("vinHistory") || "[]");
  } catch (_) {}
  history = history.filter((h) => h.vin !== vin);
  history.unshift({ vin, title });
  if (history.length > 5) history = history.slice(0, 5);
  localStorage.setItem("vinHistory", JSON.stringify(history));
  loadHistory();
}

function updateLanguage() {
  const globalT =
    (window.APP_TRANSLATIONS && window.APP_TRANSLATIONS[currentLanguage]) || {};
  const t = Object.assign(
    {},
    globalT,
    vinTranslations[currentLanguage] || vinTranslations.en
  );
  const langBtnSpan = document.querySelector("#language-toggle span");
  const langLabels = { en: "EN", ru: "RU", ka: "KA" };
  if (langBtnSpan) langBtnSpan.textContent = langLabels[currentLanguage] || "EN";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (t[key] != null) el.textContent = t[key];
  });
  document.querySelectorAll("[data-set-lang]").forEach((b) => {
    b.classList.toggle("is-active", b.getAttribute("data-set-lang") === currentLanguage);
  });

  document.documentElement.setAttribute("lang", currentLanguage);
  updateVinTelemetry();

  window.dispatchEvent(
    new CustomEvent("languageChanged", { detail: { lang: currentLanguage } })
  );
  if (typeof window.updateChatContext === "function") {
    window.updateChatContext();
  }
}

window.setPageLanguage = function (nextLang) {
  if (!["en", "ru", "ka"].includes(nextLang)) return;
  currentLanguage = nextLang;
  localStorage.setItem("forumLanguage", currentLanguage);
  localStorage.setItem("language", currentLanguage);
  updateLanguage();
};

document.addEventListener("DOMContentLoaded", () => {
  const langToggle = document.getElementById("language-toggle");
  if (langToggle) {
    langToggle.addEventListener("click", () => {
      const langs = ["en", "ru", "ka"];
      const idx = langs.indexOf(currentLanguage);
      window.setPageLanguage(langs[(idx + 1) % langs.length]);
    });
  }

  const vinInput = document.getElementById("vin-input");
  if (vinInput) {
    vinInput.addEventListener("input", updateVinTelemetry);
    vinInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        decodeVin();
      }
    });
  }

  const copyBtn = document.getElementById("copy-vin-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const v = document.getElementById("res-vin")?.textContent || "";
      if (!v || v === "—") return;
      try {
        await navigator.clipboard.writeText(v);
        const icon = copyBtn.querySelector("i");
        if (icon) icon.className = "fas fa-check";
        setTimeout(() => {
          if (icon) icon.className = "far fa-copy";
        }, 1400);
      } catch (_) {}
    });
  }

  const aiBtn = document.getElementById("vin-ask-ai-btn");
  if (aiBtn) {
    aiBtn.addEventListener("click", () => {
      const ctx = window.currentCarContext;
      const prompt = ctx
        ? `My vehicle is a ${ctx.year} ${ctx.model} (${ctx.chassis || "BMW"}, ${ctx.engine}, VIN: ${ctx.vin}). What common fault codes and preventive maintenance items should I inspect?`
        : "";
      if (typeof window.openBcAiAssistant === "function") {
        window.openBcAiAssistant(prompt);
      } else {
        document.getElementById("bc-ai-fab")?.click();
      }
    });
  }

  updateLanguage();
  loadHistory();

  // Support ?vin=... prefill & auto-decode
  const urlVin = new URLSearchParams(window.location.search).get("vin");
  if (urlVin && vinInput) {
    vinInput.value = urlVin.trim().toUpperCase().slice(0, 17);
    updateVinTelemetry();
    if (vinInput.value.length === 17 && !/[IOQ]/.test(vinInput.value)) {
      decodeVin();
    }
  }
});

async function decodeVin() {
  const t = vinTranslations[currentLanguage] || vinTranslations.en;
  const vinInput = document.getElementById("vin-input");
  if (!vinInput) return;

  const vin = vinInput.value.trim().toUpperCase().replace(/[\s-]/g, "");
  vinInput.value = vin;
  updateVinTelemetry();

  const resultDiv = document.getElementById("vin-result");
  const loader = document.getElementById("loader");
  const refInfo = document.getElementById("vin-reference-info");

  if (/[IOQ]/.test(vin)) {
    setValidationStatus(t.errForbiddenChars, "error");
    vinInput.focus();
    return;
  }

  if (vin.length !== 17) {
    setValidationStatus(t.errLength, "error");
    vinInput.focus();
    return;
  }

  if (resultDiv) resultDiv.style.display = "none";
  if (loader) loader.style.display = "flex";

  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vin)}?format=json`
    );
    const data = await response.json();
    const results = data.Results || [];

    const getVal = (varName) => {
      const item = results.find((r) => r.Variable === varName);
      return item && item.Value && item.Value !== "null" ? String(item.Value).trim() : "—";
    };

    const make = getVal("Make");
    if (
      make.toUpperCase().indexOf("BMW") === -1 &&
      make.toUpperCase().indexOf("MINI") === -1 &&
      !/^(WBA|WBS|WBY|WBX|4US|5UX|5UM|WMW|3MW)/.test(vin)
    ) {
      setValidationStatus(t.errNotBmw.replace("{make}", make !== "—" ? make : "Unknown"), "error");
      if (loader) loader.style.display = "none";
      return;
    }

    const model = getVal("Model");
    const year = getVal("Model Year");
    const series = getVal("Series");
    const bodyClass = getVal("Body Class");
    const engineCyl = getVal("Engine Number of Cylinders");
    const engineL = getVal("Displacement (L)");
    const engineModel = getVal("Engine Model");
    const hp = getVal("Engine Brake (hp) From");
    const kw = getVal("Engine Power (kW)");
    const fuel = getVal("Fuel Type - Primary");
    const drive = getVal("Drive Type");
    const doors = getVal("Doors");
    const plantCity = getVal("Plant City");
    const plantCountry = getVal("Plant Country");
    const weight = getVal("Gross Vehicle Weight Rating From");

    const brandLabel = make.toUpperCase().includes("MINI") ? "MINI" : "BMW";
    const titleParts = [year !== "—" ? year : "", brandLabel, model !== "—" ? model : series !== "—" ? series : ""].filter(Boolean);
    document.getElementById("car-title").textContent = titleParts.join(" ");

    const resVin = document.getElementById("res-vin");
    if (resVin) resVin.textContent = vin;

    document.getElementById("res-model").textContent = model;
    document.getElementById("res-year").textContent = year;
    document.getElementById("res-series").textContent = series;
    document.getElementById("res-body").textContent = bodyClass.replace("Sedan/Saloon", "Sedan");

    let engineText = "—";
    const engParts = [];
    if (engineL !== "—") engParts.push(`${Number(engineL).toFixed(1)}L`);
    if (engineCyl !== "—") engParts.push(`${engineCyl}-Cyl`);
    if (engineModel !== "—") engParts.push(`(${engineModel})`);
    if (engParts.length) engineText = engParts.join(" ");
    document.getElementById("res-engine").textContent = engineText;

    let powerText = "—";
    if (hp !== "—" && kw !== "—") powerText = `${hp} HP (${kw} kW)`;
    else if (hp !== "—") powerText = `${hp} HP`;
    else if (kw !== "—") powerText = `${kw} kW`;
    document.getElementById("res-power").textContent = powerText;

    document.getElementById("res-fuel").textContent = fuel;
    document.getElementById("res-drive").textContent = drive;
    document.getElementById("res-doors").textContent = doors;
    document.getElementById("res-country").textContent = plantCountry;
    document.getElementById("res-plant").textContent = plantCity;
    document.getElementById("res-weight").textContent = weight.replace(/Class [\w\d]+:\s*/i, "");

    const mdecLink = document.getElementById("link-mdecoder");
    if (mdecLink) mdecLink.href = `https://www.mdecoder.com/decode/${vin}`;

    const codesLink = document.getElementById("vin-search-codes-link");
    if (codesLink) {
      const searchHint = model !== "—" ? model : "DME";
      codesLink.href = `/?code=${encodeURIComponent(searchHint)}`;
    }

    document.getElementById("deep-decode-section").style.display = "block";
    if (refInfo) refInfo.style.display = "none";

    const shortTitle = `${year !== "—" ? year : ""} ${model !== "—" ? model : brandLabel}`.trim();
    saveToHistory(vin, shortTitle);

    window.currentCarContext = {
      model: `${brandLabel} ${model !== "—" ? model : ""}`.trim(),
      year: year,
      engine: engineText !== "—" ? engineText : "BMW Engine",
      chassis: series !== "—" ? series : "",
      vin: vin,
    };

    try {
      sessionStorage.setItem("bc_ai_vehicle_ctx", JSON.stringify(window.currentCarContext));
    } catch (_) {}

    if (typeof window.updateChatContext === "function") {
      window.updateChatContext();
    }

    if (loader) loader.style.display = "none";
    if (resultDiv) {
      resultDiv.style.display = "block";
      resultDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (e) {
    console.error(e);
    if (loader) loader.style.display = "none";
    setValidationStatus(t.errNetwork, "error");
  }
}
window.decodeVin = decodeVin;

function submitExternalSearch(serviceId) {
  const vinInput = document.getElementById("vin-input");
  if (!vinInput) return;
  const vin = vinInput.value.trim().toUpperCase();
  if (!vin || vin.length !== 17) return;

  let url = "";

  switch (serviceId) {
    case "bidfax":
      url = `https://en.bidfax.info/?do=search&subaction=search&story=${encodeURIComponent(vin)}`;
      break;
    case "statvin":
      url = `https://stat.vin/cars?vin=${encodeURIComponent(vin)}`;
      break;
    case "mdecoder":
      url = `https://www.mdecoder.com/decode/${encodeURIComponent(vin)}`;
      fetch(`https://www.mdecoder.com/decode/${encodeURIComponent(vin)}`, { mode: "no-cors" }).catch(() => {});
      break;
    case "bimmerwork": {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://bimmer.work/";
      form.target = "_blank";

      const vinInputHf = document.createElement("input");
      vinInputHf.type = "hidden";
      vinInputHf.name = "vin";
      vinInputHf.value = vin;

      form.appendChild(vinInputHf);
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      return;
    }
  }

  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
window.submitExternalSearch = submitExternalSearch;
