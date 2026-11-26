// js/footer.js — Unified Technical Footer, Shared Header Sync, Analytics & AI Loader
(function () {
  "use strict";

  const FOOTER_I18N = {
    en: {
      tagline: "Precision BMW diagnostic database, 17-digit VIN specification decoder, OEM parts cross-reference, and specialist community.",
      disclaimer: "Independent automotive engineering resource. Not affiliated with or endorsed by Bayerische Motoren Werke AG (BMW AG).",
      colSuite: "Diagnostic Suite",
      linkSearch: "Diagnostic Code Search",
      linkIndex: "DTC Master Directory",
      linkVin: "17-Digit VIN Decoder",
      linkParts: "OEM Parts Finder",
      linkAi: "AI Diagnostic Assistant",
      colSystems: "Control Units",
      sysDme: "DME / DDE Powertrain",
      sysEgs: "EGS Transmission",
      sysCas: "CAS / FEM Access & Start",
      sysDsc: "DSC Stability & Brakes",
      sysFrm: "FRM / BDC Body Electronics",
      colPlatform: "Platform & Legal",
      linkForum: "Technical Forum",
      linkContact: "Support & Contact",
      linkPrivacy: "Privacy Policy",
      linkTerms: "Terms of Service",
      rights: "© 2026 BimmerCodes (bimmercodes.net). All rights reserved."
    },
    ru: {
      tagline: "Инженерная база кодов неисправностей BMW, расшифровка 17-значного VIN, подбор оригинальных запчастей и профильное сообщество.",
      disclaimer: "Независимая техническая платформа. Не связана с Bayerische Motoren Werke AG (BMW AG) и не является её официальным ресурсом.",
      colSuite: "Инструменты диагностики",
      linkSearch: "Поиск кодов DTC",
      linkIndex: "Полный каталог кодов",
      linkVin: "VIN-декодер BMW",
      linkParts: "Подбор запчастей OEM",
      linkAi: "AI-диагност",
      colSystems: "Блоки управления",
      sysDme: "DME / DDE Двигатель",
      sysEgs: "EGS Трансмиссия",
      sysCas: "CAS / FEM Доступ и запуск",
      sysDsc: "DSC Стабилизация и тормоза",
      sysFrm: "FRM / BDC Кузовная электроника",
      colPlatform: "Платформа и право",
      linkForum: "Технический форум",
      linkContact: "Поддержка и контакты",
      linkPrivacy: "Конфиденциальность",
      linkTerms: "Условия использования",
      rights: "© 2026 BimmerCodes (bimmercodes.net). Все права защищены."
    },
    ka: {
      tagline: "BMW-ს დიაგნოსტიკური კოდების საინჟინრო ბაზა, 17-ნიშნა VIN დეკოდერი, OEM ნაწილების კატალოგი და სპეციალისტთა ფორუმი.",
      disclaimer: "დამოუკიდებელი საავტომობილო-ტექნიკური პლატფორმა. არ არის აფილირებული Bayerische Motoren Werke AG-სთან (BMW AG).",
      colSuite: "დიაგნოსტიკის პაკეტი",
      linkSearch: "DTC კოდების ძიება",
      linkIndex: "კოდების სრული კატალოგი",
      linkVin: "17-ნიშნა VIN დეკოდერი",
      linkParts: "OEM ნაწილების ძიება",
      linkAi: "AI დიაგნოსტიკური ასისტენტი",
      colPlatform: "პლატფორმა და წესები",
      colSystems: "მართვის ბლოკები",
      sysDme: "DME / DDE ძრავის მართვა",
      sysEgs: "EGS გადაცემათა კოლოფი",
      sysCas: "CAS / FEM დაშვება და დაქოქვა",
      sysDsc: "DSC სტაბილიზაცია და მუხრუჭი",
      sysFrm: "FRM / BDC ძარის ელექტრონიკა",
      linkForum: "ტექნიკური ფორუმი",
      linkContact: "მხარდაჭერა და კონტაქტი",
      linkPrivacy: "კონფიდენციალურობა",
      linkTerms: "გამოყენების პირობები",
      rights: "© 2026 BimmerCodes (bimmercodes.net). ყველა უფლება დაცულია."
    }
  };

  const BRAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">
    <rect x="3" y="3" width="58" height="58" rx="12" fill="#0E1218" stroke="#283244" stroke-width="2"/>
    <rect x="7" y="7" width="50" height="50" rx="8.5" fill="#131923" stroke="#1E2736" stroke-width="1"/>
    <path d="M16 18H31.5C36.2 18 39.5 20.5 39.5 24.6C39.5 27.4 37.9 29.5 35.2 30.4C38.5 31.2 40.5 33.6 40.5 37C40.5 41.6 36.9 44.5 31.4 44.5H16V18ZM22.2 28.4H29.9C32.2 28.4 33.5 27.3 33.5 25.4C33.5 23.5 32.2 22.5 29.9 22.5H22.2V28.4ZM22.2 40H30.4C33 40 34.4 38.8 34.4 36.7C34.4 34.6 32.9 33.4 30.3 33.4H22.2V40Z" fill="#E8EEF6"/>
    <path d="M43.5 18H49.5L43.5 44.5H37.5L43.5 18Z" fill="#2877EE"/>
    <rect x="46.5" y="18" width="3.5" height="7" rx="1" fill="#6EA8FF"/>
  </svg>`;

  function getLang() {
    const raw = localStorage.getItem("forumLanguage") || localStorage.getItem("language") || "en";
    return ["en", "ru", "ka"].includes(raw) ? raw : "en";
  }

  function setAppLanguage(nextLang) {
    if (!["en", "ru", "ka"].includes(nextLang)) return;
    localStorage.setItem("forumLanguage", nextLang);
    localStorage.setItem("language", nextLang);

    // Sync any page-specific language controller
    if (typeof window.setPageLanguage === "function") {
      window.setPageLanguage(nextLang);
    } else {
      document.documentElement.setAttribute("lang", nextLang);
      const labels = { en: "EN", ru: "RU", ka: "KA" };
      const btnSpan = document.querySelector("#language-toggle span, #forum-language-toggle span, #forum-lang-display");
      if (btnSpan) btnSpan.textContent = labels[nextLang];

      const T = window.APP_TRANSLATIONS && (window.APP_TRANSLATIONS[nextLang] || window.APP_TRANSLATIONS.en);
      if (T) {
        document.querySelectorAll("[data-i18n]").forEach((el) => {
          const k = el.getAttribute("data-i18n");
          if (T[k] != null) el.textContent = T[k];
        });
        document.querySelectorAll("[data-i18n-html]").forEach((el) => {
          const k = el.getAttribute("data-i18n-html");
          if (T[k] != null) el.innerHTML = T[k];
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
          const k = el.getAttribute("data-i18n-placeholder");
          if (T[k] != null) el.placeholder = T[k];
        });
      }
      window.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang: nextLang } }));
    }
    renderFooter();
    syncLangButtons();
  }
  window.bcSetLanguage = setAppLanguage;

  function syncLangButtons() {
    const lang = getLang();
    document.querySelectorAll("[data-set-lang]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-set-lang") === lang);
    });
  }

  function updateSavedCountBadge() {
    let favs = [];
    try {
      favs = JSON.parse(localStorage.getItem("bmwFavorites") || "[]");
    } catch (_) {}
    const count = Array.isArray(favs) ? favs.length : 0;
    document.querySelectorAll("[data-saved-count]").forEach((el) => {
      el.textContent = count > 0 ? String(count) : "";
      el.setAttribute("data-count", String(count));
    });
  }
  window.updateSavedCountBadge = updateSavedCountBadge;

  function renderFooter() {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const lang = getLang();
    const t = FOOTER_I18N[lang] || FOOTER_I18N.en;

    footer.innerHTML = `
      <div class="bc-footer">
        <div class="bc-footer__grid">
          <div>
            <a href="/" class="bc-brand" aria-label="BimmerCodes">
              <span class="bc-brand__mark">${BRAND_SVG}</span>
              <span class="bc-brand__text">
                <span class="bc-brand__name">BimmerCodes</span>
                <span class="bc-brand__sub">Diagnostic &amp; Engineering</span>
              </span>
            </a>
            <p class="bc-footer__brand-desc">${t.tagline}</p>
            <p class="bc-footer__disclaimer">${t.disclaimer}</p>
          </div>

          <div>
            <h3 class="bc-footer__col-title">${t.colSuite}</h3>
            <ul class="bc-footer__links">
              <li><a href="/">${t.linkSearch}</a></li>
              <li><a href="/all.html">${t.linkIndex}</a></li>
              <li><a href="/vin.html">${t.linkVin}</a></li>
              <li><a href="/parts.html">${t.linkParts}</a></li>
              <li><button type="button" data-open-ai-chat>${t.linkAi}</button></li>
            </ul>
          </div>

          <div>
            <h3 class="bc-footer__col-title">${t.colSystems}</h3>
            <ul class="bc-footer__links">
              <li><a href="/?code=118001">${t.sysDme}</a></li>
              <li><a href="/?code=4F85">${t.sysEgs}</a></li>
              <li><a href="/?code=A0B4">${t.sysCas}</a></li>
              <li><a href="/?code=5DF0">${t.sysDsc}</a></li>
              <li><a href="/?code=9CBB">${t.sysFrm}</a></li>
            </ul>
          </div>

          <div>
            <h3 class="bc-footer__col-title">${t.colPlatform}</h3>
            <ul class="bc-footer__links">
              <li><a href="/forum.html">${t.linkForum}</a></li>
              <li><a href="/contact.html">${t.linkContact}</a></li>
              <li><a href="/privacy.html">${t.linkPrivacy}</a></li>
              <li><a href="/terms.html">${t.linkTerms}</a></li>
            </ul>
          </div>
        </div>

        <div class="bc-footer__bottom">
          <p id="footer-copyright">${t.rights}</p>
          <div class="bc-footer__langs" role="group" aria-label="Language">
            <button type="button" class="bc-footer__lang-btn ${lang === "en" ? "is-active" : ""}" data-set-lang="en">EN</button>
            <button type="button" class="bc-footer__lang-btn ${lang === "ru" ? "is-active" : ""}" data-set-lang="ru">RU</button>
            <button type="button" class="bc-footer__lang-btn ${lang === "ka" ? "is-active" : ""}" data-set-lang="ka">KA</button>
          </div>
        </div>
      </div>
    `;
  }

  // Global delegated handlers for [data-set-lang] and [data-open-ai-chat]
  document.addEventListener("click", (e) => {
    const langBtn = e.target.closest("[data-set-lang]");
    if (langBtn) {
      e.preventDefault();
      setAppLanguage(langBtn.getAttribute("data-set-lang"));
      return;
    }

    const aiTrigger = e.target.closest("[data-open-ai-chat]");
    if (aiTrigger) {
      e.preventDefault();
      const prompt = aiTrigger.getAttribute("data-ai-prompt") || "";
      const autoSend = Boolean(prompt);
      if (typeof window.openBcAiAssistant === "function") {
        window.openBcAiAssistant(prompt, autoSend);
      } else {
        window.__bcPendingAiOpen = { prompt, autoSend };
        const fab = document.getElementById("bc-ai-fab");
        if (fab) {
          fab.click();
          if (prompt) {
            setTimeout(() => {
              if (typeof window.openBcAiAssistant === "function") {
                window.__bcPendingAiOpen = null;
                window.openBcAiAssistant(prompt, autoSend);
              }
            }, 80);
          }
        } else if (!window.__bcAiChatLoader && !document.querySelector('script[src*="ai-chat-loader.js"]')) {
          const s = document.createElement("script");
          s.src = "/js/ai-chat-loader.js?v=7";
          s.defer = true;
          s.setAttribute("data-cfasync", "false");
          document.body.appendChild(s);
        }
      }
    }
  });

  window.addEventListener("languageChanged", () => {
    renderFooter();
    syncLangButtons();
  });

  window.addEventListener("storage", (e) => {
    if (e.key === "bmwFavorites") updateSavedCountBadge();
  });

  document.addEventListener("DOMContentLoaded", () => {
    renderFooter();
    syncLangButtons();
    updateSavedCountBadge();

    // Shared mobile drawer bindings (for pages without index-premium.js)
    const burger = document.getElementById("bc-mobile-burger") || document.getElementById("bc3-burger");
    const drawer = document.getElementById("bc-mobile-drawer") || document.getElementById("bc3-sheet");
    if (burger && drawer && !drawer.dataset.boundShared) {
      drawer.dataset.boundShared = "1";
      const closeDrawer = () => {
        drawer.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      };
      burger.addEventListener("click", () => {
        drawer.classList.add("open");
        burger.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
      });
      drawer.addEventListener("click", (ev) => {
        if (ev.target === drawer || ev.target.closest("[data-drawer-close], [data-bc3-sheet-close]")) {
          closeDrawer();
        }
      });
      document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && drawer.classList.contains("open")) closeDrawer();
      });
    }

    // Analytics Tracking
    (async () => {
      try {
        const userData = localStorage.getItem("user_data");
        const user = userData ? JSON.parse(userData) : null;
        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user ? user.id : null,
            event_type: "page_view",
            path: window.location.pathname,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            device_type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop"
          })
        });
      } catch (_) {}
    })();

    // Ensure AI assistant loader is mounted on every page with a footer
    if (!window.__bcAiChatLoader && !document.querySelector('script[src*="ai-chat-loader.js"]')) {
      const loader = document.createElement("script");
      loader.src = "/js/ai-chat-loader.js?v=7";
      loader.defer = true;
      loader.setAttribute("data-cfasync", "false");
      document.body.appendChild(loader);
    }
  });
})();
