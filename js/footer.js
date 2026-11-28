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
          s.src = "/js/ai-chat-loader.js?v=8";
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

  function escAttr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Universal lightweight Auth & Modal controller for secondary pages without script.js (all, parts, vin, contact, privacy, terms)
  function initStandaloneHeaderAuth() {
    if (document.querySelector('script[src*="/js/script.js"]') || document.querySelector('script[src*="/js/forum.js"]') || document.body.classList.contains("admin-page")) {
      return;
    }

    if (typeof window.logout !== "function") {
      window.logout = function () {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
        location.reload();
      };
    }

    function ensureStandaloneAuthModal() {
      if (document.getElementById("auth-modal")) return;
      const host = document.createElement("div");
      host.innerHTML = `
        <div id="auth-modal" class="auth-modal" role="dialog" aria-modal="true" aria-label="Authentication">
          <div class="auth-content">
            <button type="button" class="close-auth" onclick="toggleAuthModal()" aria-label="Close">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
            <div class="auth-tabs">
              <button type="button" class="tab-btn active" onclick="switchAuthTab('login')">Sign In</button>
              <button type="button" class="tab-btn" onclick="switchAuthTab('register')">Register</button>
            </div>
            <form id="login-form" class="auth-form active" autocomplete="on">
              <h2>Sign in to BimmerCodes</h2>
              <div class="input-group">
                <i class="fas fa-envelope" aria-hidden="true"></i>
                <input type="text" id="login-email" autocomplete="username" placeholder="Email or username" required />
              </div>
              <div class="input-group input-with-action">
                <i class="fas fa-lock" aria-hidden="true"></i>
                <input type="password" id="login-password" autocomplete="current-password" placeholder="Password" required />
                <button type="button" class="input-eye" data-target="login-password" aria-label="Show password" tabindex="-1">
                  <i class="fas fa-eye" aria-hidden="true"></i>
                </button>
              </div>
              <button type="submit" class="submit-btn">Sign In</button>
              <p class="auth-msg" id="login-msg"></p>
            </form>
            <form id="register-form" class="auth-form" autocomplete="on">
              <h2>Create Specialist Account</h2>
              <div class="input-group">
                <i class="fas fa-user" aria-hidden="true"></i>
                <input type="text" id="reg-username" minlength="3" maxlength="20" autocomplete="username" placeholder="Username (3–20 letters, digits, _)" required />
              </div>
              <div class="input-group">
                <i class="fas fa-envelope" aria-hidden="true"></i>
                <input type="email" id="reg-email" autocomplete="email" placeholder="Email address" required />
              </div>
              <div class="input-group input-with-action" style="margin-bottom:6px;">
                <i class="fas fa-lock" aria-hidden="true"></i>
                <input type="password" id="reg-password" minlength="8" autocomplete="new-password" placeholder="Password (min. 8 chars, A-Z, a-z, 0-9)" required />
                <button type="button" class="input-eye" data-target="reg-password" aria-label="Show password" tabindex="-1">
                  <i class="fas fa-eye" aria-hidden="true"></i>
                </button>
              </div>
              <div class="pw-strength" data-strength="0" aria-hidden="true" style="margin-bottom:6px;">
                <span></span><span></span><span></span><span></span>
              </div>
              <p style="font-size:11.5px;color:var(--text-tertiary);margin:0 0 12px;">8+ characters including uppercase, lowercase, and a number.</p>
              <div class="input-group">
                <i class="fas fa-shield-alt" aria-hidden="true"></i>
                <select id="reg-question" required>
                  <option value="" disabled selected>Select security question</option>
                  <option value="first_pet">What was your first pet's name?</option>
                  <option value="mother_maiden">What is your mother's maiden name?</option>
                  <option value="first_car">What was your first car model?</option>
                  <option value="city_born">In which city were you born?</option>
                </select>
              </div>
              <div class="input-group">
                <i class="fas fa-key" aria-hidden="true"></i>
                <input type="text" id="reg-answer" placeholder="Security answer" required />
              </div>
              <button type="submit" class="submit-btn">Create Account</button>
              <p class="auth-msg" id="reg-msg"></p>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(host.firstElementChild);

      document.getElementById("login-form")?.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const email = document.getElementById("login-email")?.value?.trim() || "";
        const password = document.getElementById("login-password")?.value || "";
        const msg = document.getElementById("login-msg");
        if (!email || !password) return;
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.token) {
            localStorage.setItem("auth_token", data.token);
            localStorage.setItem("user_data", JSON.stringify(data.user));
            renderStandaloneHeaderBtn();
            window.dispatchEvent(new CustomEvent("auth:changed", { detail: { user: data.user } }));
            document.getElementById("auth-modal")?.classList.remove("active");
          } else if (msg) {
            msg.textContent = data.error || "Invalid credentials";
            msg.style.color = "var(--status-danger)";
          }
        } catch (_) {
          if (msg) {
            msg.textContent = "Connection error";
            msg.style.color = "var(--status-danger)";
          }
        }
      });

      document.getElementById("register-form")?.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const username = document.getElementById("reg-username")?.value?.trim() || "";
        const email = document.getElementById("reg-email")?.value?.trim() || "";
        const password = document.getElementById("reg-password")?.value || "";
        const security_question = document.getElementById("reg-question")?.value || "";
        const security_answer = document.getElementById("reg-answer")?.value?.trim() || "";
        const msg = document.getElementById("reg-msg");
        const setMsg = (txt, ok) => {
          if (!msg) return;
          msg.textContent = txt;
          msg.style.color = ok ? "var(--status-success)" : "var(--status-danger)";
        };
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          return setMsg("Username must be 3–20 characters (letters, numbers, or _).");
        }
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
          return setMsg("Password must be 8+ chars with uppercase, lowercase, and a number.");
        }
        try {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password, language: getLang(), security_question, security_answer }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            const lr = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            }).catch(() => null);
            const ld = lr ? await lr.json().catch(() => ({})) : {};
            if (lr && lr.ok && ld.token) {
              localStorage.setItem("auth_token", ld.token);
              localStorage.setItem("user_data", JSON.stringify(ld.user));
              renderStandaloneHeaderBtn();
              window.dispatchEvent(new CustomEvent("auth:changed", { detail: { user: ld.user } }));
              setMsg("Account created — signed in!", true);
              setTimeout(() => document.getElementById("auth-modal")?.classList.remove("active"), 500);
            } else {
              setMsg("Account created. Please sign in.", true);
              setTimeout(() => window.switchAuthTab("login"), 700);
            }
          } else {
            const detail = Array.isArray(data.details) && data.details.length ? `${data.error}: ${data.details.join(" · ")}` : (data.error || "Registration failed");
            setMsg(detail);
          }
        } catch (_) {
          setMsg("Connection error");
        }
      });
    }

    if (!window.__bcAuthEyeBound) {
      window.__bcAuthEyeBound = true;
      document.addEventListener("click", (e) => {
        const eye = e.target.closest(".input-eye");
        if (!eye) return;
        e.preventDefault();
        const inp = document.getElementById(eye.getAttribute("data-target") || "");
        if (!inp) return;
        const ic = eye.querySelector("i");
        if (inp.type === "password") {
          inp.type = "text";
          ic?.classList.replace("fa-eye", "fa-eye-slash");
        } else {
          inp.type = "password";
          ic?.classList.replace("fa-eye-slash", "fa-eye");
        }
      });
    }

    if (!window.__bcPwMeterBound) {
      window.__bcPwMeterBound = true;
      document.addEventListener("input", (e) => {
        if (e.target?.id !== "reg-password") return;
        const pw = e.target.value || "";
        let s = 0;
        if (pw.length >= 8) s++;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
        if (/\d/.test(pw)) s++;
        if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
        document.querySelector(".pw-strength")?.setAttribute("data-strength", String(s));
      });
    }

    window.switchAuthTab = function (tab) {
      const target = tab === "register" ? "register" : "login";
      document.querySelectorAll("#auth-modal .tab-btn").forEach((b, idx) => {
        b.classList.toggle("active", (target === "login" && idx === 0) || (target === "register" && idx === 1));
      });
      const lf = document.getElementById("login-form");
      const rf = document.getElementById("register-form");
      if (lf) { lf.classList.toggle("active", target === "login"); lf.style.display = target === "login" ? "" : "none"; }
      if (rf) { rf.classList.toggle("active", target === "register"); rf.style.display = target === "register" ? "" : "none"; }
    };

    window.toggleAuthModal = function (initialTab) {
      ensureStandaloneAuthModal();
      const modal = document.getElementById("auth-modal");
      if (!modal) return;
      const willOpen = !modal.classList.contains("active");
      if (willOpen) {
        window.switchAuthTab(initialTab === "register" ? "register" : "login");
        modal.classList.add("active");
      } else {
        modal.classList.remove("active");
      }
    };

    function renderStandaloneHeaderBtn() {
      const tools = document.querySelector(".bc-header-tools");
      if (!tools) return;
      let btn = document.getElementById("auth-btn") || document.getElementById("parts-account-link") || tools.querySelector('a[href*="/profile"]');
      if (!btn) {
        btn = document.createElement("a");
        btn.href = "#";
        btn.id = "auth-btn";
        btn.className = "bc-tool-btn bc-tool-btn--primary";
        const burger = tools.querySelector(".bc-burger");
        if (burger) tools.insertBefore(btn, burger);
        else tools.appendChild(btn);
      }
      btn.id = "auth-btn";

      let user = null;
      const token = localStorage.getItem("auth_token");
      try { user = JSON.parse(localStorage.getItem("user_data") || "null"); } catch (_) {}
      const lang = getLang();
      const T = (window.APP_TRANSLATIONS && (window.APP_TRANSLATIONS[lang] || window.APP_TRANSLATIONS.en)) || {};

      if (token && user && user.username) {
        btn.classList.add("auth-btn--logged");
        btn.classList.remove("bc-tool-btn--primary", "bc-tool-btn--hide-mobile");
        btn.href = "#";
        btn.innerHTML = `<i class="fas fa-user-circle" aria-hidden="true"></i> <span>${escAttr(user.username)}</span>`;
        let wrap = btn.closest(".auth-dropdown-wrap");
        if (!wrap) {
          wrap = document.createElement("div");
          wrap.className = "auth-dropdown-wrap";
          btn.parentNode.insertBefore(wrap, btn);
          wrap.appendChild(btn);
        }
        wrap.querySelector(".auth-dropdown")?.remove();
        const isAdmin = ["super_admin_role", "admin_role", "senior_moderator_role", "moderator_role", "admin", "super_admin"].includes(String(user.role_id || user.role || ""));
        const dd = document.createElement("div");
        dd.className = "auth-dropdown";
        dd.innerHTML = `
          <a href="/profile.html?id=${encodeURIComponent(user.id)}" class="auth-dropdown-item">
            <i class="fas fa-id-badge" aria-hidden="true"></i> ${escAttr(T.profile || "Profile & Garage")}
          </a>
          ${isAdmin ? `<a href="/admin.html" class="auth-dropdown-item"><i class="fas fa-sliders" aria-hidden="true"></i> Admin Console</a>` : ""}
          <button type="button" class="auth-dropdown-item auth-dropdown-logout" onclick="logout()">
            <i class="fas fa-sign-out-alt" aria-hidden="true"></i> ${escAttr(T.logout || "Logout")}
          </button>
        `;
        wrap.appendChild(dd);
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          wrap.classList.toggle("open");
        };
      } else {
        const wrap = btn.closest(".auth-dropdown-wrap");
        if (wrap) {
          wrap.parentNode.insertBefore(btn, wrap);
          wrap.remove();
        }
        btn.classList.remove("auth-btn--logged", "bc-tool-btn--hide-mobile");
        btn.classList.add("bc-tool-btn--primary");
        btn.href = "#";
        btn.innerHTML = `<i class="fas fa-user-circle" aria-hidden="true"></i> <span>${escAttr(T.loginBtn || "Sign In")}</span>`;
        btn.onclick = (e) => {
          e.preventDefault();
          window.toggleAuthModal("login");
        };
      }
    }

    document.addEventListener("click", (e) => {
      document.querySelectorAll(".auth-dropdown-wrap.open").forEach((w) => {
        if (!w.contains(e.target)) w.classList.remove("open");
      });
    });
    window.addEventListener("languageChanged", renderStandaloneHeaderBtn);
    window.addEventListener("auth:changed", renderStandaloneHeaderBtn);
    renderStandaloneHeaderBtn();
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderFooter();
    syncLangButtons();
    updateSavedCountBadge();
    initStandaloneHeaderAuth();

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
      loader.src = "/js/ai-chat-loader.js?v=8";
      loader.defer = true;
      loader.setAttribute("data-cfasync", "false");
      document.body.appendChild(loader);
    }
  });
})();
