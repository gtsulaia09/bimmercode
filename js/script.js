// =============================================================================
// BimmerCodes — Core Diagnostic Application, Auth, Favorites & Profile Logic
// =============================================================================

let cropperImage = new Image();
let baseScale = 1;
let zoomLevel = 1;
let cropperOffsetX = 0;
let cropperOffsetY = 0;
let isDragging = false;
let startX, startY;
let isNewImageSelected = false;

const searchInput = document.getElementById("search-input");
const resultsContainer = document.getElementById("results-container");
const emptyState = document.getElementById("empty-state");
const noResults = document.getElementById("no-results");
const codeDetail = document.getElementById("code-detail");
const searchContainer = document.getElementById("search-container");
const languageToggle = document.getElementById("language-toggle");

let currentLanguage = localStorage.getItem("forumLanguage") || localStorage.getItem("language") || "en";
if (!["en", "ru", "ka"].includes(currentLanguage)) currentLanguage = "en";

window.addEventListener("languageChanged", (e) => {
  const next = e?.detail?.lang || localStorage.getItem("forumLanguage") || "en";
  if (["en", "ru", "ka"].includes(next)) {
    currentLanguage = next;
    document.documentElement.setAttribute("lang", currentLanguage);
    renderRecentCodesBar();
  }
});

let bmwCodes = [];
let selectedCode = null;
let debounceTimer;
let searchRunId = 0;

const SEARCH_MIN_CHARS = 2;
const SEARCH_MAX_RESULTS = 60;
const SEARCH_META_MIN_CHARS = 3;

function escHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function codeTitleText(code, lang) {
  const t = code?.title;
  if (!t) return "";
  if (typeof t === "string") return t;
  return t[lang] || t.en || t.ru || t.ka || "";
}

function codeDescText(code, lang) {
  const d = code?.description;
  if (!d) return "";
  if (typeof d === "string") return d;
  return d[lang] || d.en || d.ru || d.ka || "";
}

function getSeverityMeta(rawSeverity, lang) {
  const s = String(rawSeverity || "Medium").toLowerCase();
  let cls = "medium";
  if (s === "critical") cls = "critical";
  else if (s === "high") cls = "high";
  else if (s === "low") cls = "low";

  const labels = {
    en: { critical: "Critical", high: "High", medium: "Medium", low: "Low" },
    ru: { critical: "Критический", high: "Высокий", medium: "Средний", low: "Низкий" },
    ka: { critical: "კრიტიკული", high: "მაღალი", medium: "საშუალო", low: "დაბალი" },
  };
  const label = (labels[lang] || labels.en)[cls];
  return { cls, label };
}

function buildCodeLookup(codes) {
  const byCode = new Map();
  const byPCode = new Map();
  for (const c of codes) {
    if (c?.code) byCode.set(String(c.code).toUpperCase(), c);
    for (const p of c.pCodes || []) {
      if (p) byPCode.set(String(p).toUpperCase(), c);
    }
  }
  return { byCode, byPCode };
}

function scoreCodeMatch(code, q, lang) {
  const codeStr = String(code.code || "").toLowerCase();
  if (codeStr === q) return 100;
  if (code.pCodes?.some((p) => String(p).toLowerCase() === q)) return 95;
  if (codeStr.startsWith(q)) return 85;
  if (code.pCodes?.some((p) => String(p).toLowerCase().startsWith(q))) return 80;
  if (codeStr.includes(q)) return 70;
  if (code.pCodes?.some((p) => String(p).toLowerCase().includes(q))) return 65;

  if (q.length >= SEARCH_META_MIN_CHARS) {
    const titleLang = codeTitleText(code, lang).toLowerCase();
    const titleEn = codeTitleText(code, "en").toLowerCase();
    if (titleLang.includes(q) || titleEn.includes(q)) return 50;

    const cat = String(code.category || "").toLowerCase();
    if (cat.includes(q)) return 45;

    if (code.engineCodes?.some((e) => String(e).toLowerCase().includes(q))) return 40;
    if (code.applicableModels?.some((m) => String(m).toLowerCase().includes(q))) return 35;
  }
  return 0;
}

function searchCodes(term, lang = currentLanguage) {
  const q = String(term || "").trim().toLowerCase();
  if (q.length < SEARCH_MIN_CHARS) {
    return { items: [], truncated: false, query: q };
  }

  const scored = [];
  for (let i = 0; i < bmwCodes.length; i++) {
    const score = scoreCodeMatch(bmwCodes[i], q, lang);
    if (score > 0) {
      scored.push({ code: bmwCodes[i], score });
      if (scored.length >= 400 && score <= 40) {
        // Cap deep metadata scans once plenty of strong matches are collected
        break;
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const truncated = scored.length > SEARCH_MAX_RESULTS;
  const items = scored.slice(0, SEARCH_MAX_RESULTS).map((x) => x.code);
  return { items, truncated, query: q };
}

// =============================================================================
// RECENTLY VIEWED CODES
// =============================================================================

function recordRecentCode(codeId) {
  if (!codeId) return;
  try {
    let recent = JSON.parse(localStorage.getItem("recentCodes") || "[]");
    if (!Array.isArray(recent)) recent = [];
    const upper = String(codeId).toUpperCase();
    recent = [upper, ...recent.filter((c) => String(c).toUpperCase() !== upper)].slice(0, 6);
    localStorage.setItem("recentCodes", JSON.stringify(recent));
    renderRecentCodesBar();
  } catch (_) {}
}

function renderRecentCodesBar() {
  const bar = document.getElementById("recent-codes-bar");
  if (!bar) return;
  let recent = [];
  try {
    recent = JSON.parse(localStorage.getItem("recentCodes") || "[]");
  } catch (_) {}
  if (!Array.isArray(recent) || recent.length === 0) {
    bar.classList.add("hidden");
    bar.innerHTML = "";
    return;
  }

  const label =
    currentLanguage === "ru"
      ? "Недавние:"
      : currentLanguage === "ka"
        ? "ბოლოს ნანახი:"
        : "Recent:";

  bar.classList.remove("hidden");
  bar.innerHTML = `
    <span class="bc-quick-chips__label">${escHtml(label)}</span>
    ${recent
      .map(
        (c) =>
          `<button type="button" class="bc-code-chip" data-open-code="${escHtml(c)}">${escHtml(c)}</button>`
      )
      .join("")}
  `;
}

// =============================================================================
// DIAGNOSTIC DATASHEET VIEW
// =============================================================================

function findRelatedCodes(code, maxCount = 4) {
  if (!bmwCodes.length || !code) return [];
  const cat = String(code.category || "").toLowerCase();
  if (!cat) return [];
  const out = [];
  for (let i = 0; i < bmwCodes.length && out.length < maxCount; i++) {
    const c = bmwCodes[i];
    if (c.code === code.code) continue;
    if (String(c.category || "").toLowerCase() === cat) {
      out.push(c);
    }
  }
  return out;
}

function displayCodeDetail(code) {
  if (!code || !codeDetail) return;
  selectedCode = code;
  const lang = currentLanguage || "en";
  const t = (window.APP_TRANSLATIONS && (window.APP_TRANSLATIONS[lang] || window.APP_TRANSLATIONS.en)) || {};

  recordRecentCode(code.code);

  const forumModal = document.getElementById("code-detail-modal");
  if (forumModal) {
    forumModal.classList.add("active");
    codeDetail.classList.remove("hidden");
  } else {
    if (searchContainer) searchContainer.classList.add("hidden");
    codeDetail.classList.remove("hidden");
  }

  const title = codeTitleText(code, lang) || code.code;
  const description = codeDescText(code, lang) || t.noDescription || "Diagnostic trouble code stored in control module memory.";
  const solutions = (code.solutions && (code.solutions[lang] || code.solutions.en)) || [];
  const category = code.category || "BMW Control Unit";
  const pCodes = code.pCodes || [];
  const models = code.applicableModels || [];
  const engines = code.engineCodes || [];
  const software = code.software && code.software.length ? code.software : ["BMW ISTA", "INPA", "OBD-II"];
  const sev = getSeverityMeta(code.severity, lang);

  let favorites = [];
  try {
    favorites = JSON.parse(localStorage.getItem("bmwFavorites") || "[]");
  } catch (_) {}
  const isFav = favorites.includes(code.code);

  const related = findRelatedCodes(code, 4);

  const labels = {
    en: {
      back: "Back to Search",
      save: isFav ? "Saved" : "Save Code",
      copy: "Copy",
      copied: "Copied",
      permalink: "Permalink",
      askAi: "Diagnose with AI",
      oemParts: "OEM Parts Finder",
      realOem: "RealOEM ETK",
      forumDiscuss: "Forum Discussions",
      relatedTitle: "Related System Codes",
      softwareTitle: "Diagnostic Tools",
    },
    ru: {
      back: "Назад к поиску",
      save: isFav ? "Сохранено" : "Сохранить",
      copy: "Копировать",
      copied: "Скопировано",
      permalink: "Страница кода",
      askAi: "Анализ с AI",
      oemParts: "Подбор запчастей",
      realOem: "Каталог RealOEM",
      forumDiscuss: "Обсуждения на форуме",
      relatedTitle: "Связанные коды системы",
      softwareTitle: "Диагностическое ПО",
    },
    ka: {
      back: "ძიებაზე დაბრუნება",
      save: isFav ? "შენახულია" : "შენახვა",
      copy: "კოპირება",
      copied: "დაკოპირდა",
      permalink: "კოდის გვერდი",
      askAi: "AI დიაგნოსტიკა",
      oemParts: "OEM ნაწილები",
      realOem: "RealOEM კატალოგი",
      forumDiscuss: "ფორუმის თემები",
      relatedTitle: "სისტემის მსგავსი კოდები",
      softwareTitle: "დიაგნოსტიკური პროგრამები",
    },
  }[lang] || {};

  const engineHint = engines.length ? engines[0] : "";
  const realOemQuery = `site:realoem.com BMW ${engineHint} ${category}`.trim();
  const aiPrompt = `Diagnose BMW fault code ${code.code} (${title}). Module/System: ${category}. Provide step-by-step troubleshooting and common root causes.`;

  codeDetail.innerHTML = `
    <article class="bc-datasheet">
      <div class="bc-datasheet__topbar">
        <button type="button" class="bc-datasheet__back" onclick="hideDetail()">
          <i class="fas fa-arrow-left" aria-hidden="true"></i>
          <span>${escHtml(labels.back)}</span>
        </button>

        <div class="bc-datasheet__actions">
          <button type="button" class="btn btn-secondary btn-sm" id="detail-copy-btn">
            <i class="far fa-copy" aria-hidden="true"></i>
            <span>${escHtml(labels.copy)}</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm ${isFav ? "active" : ""}" id="detail-fav-btn">
            <i class="${isFav ? "fas" : "far"} fa-bookmark" aria-hidden="true" style="${isFav ? "color:#FACC15" : ""}"></i>
            <span>${escHtml(labels.save)}</span>
          </button>
          <a href="/code/${encodeURIComponent(code.code)}?lang=${encodeURIComponent(lang)}" class="btn btn-secondary btn-sm">
            <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
            <span>${escHtml(labels.permalink)}</span>
          </a>
          <button type="button" class="btn btn-primary btn-sm" data-open-ai-chat data-ai-prompt="${escHtml(aiPrompt)}">
            <i class="fas fa-robot" aria-hidden="true"></i>
            <span>${escHtml(labels.askAi)}</span>
          </button>
        </div>
      </div>

      <div class="bc-datasheet__hero">
        <div class="bc-datasheet__id-row">
          <h2 class="bc-datasheet__code">${escHtml(code.code)}</h2>
          <span class="severity-badge severity-${sev.cls}">
            <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
            ${escHtml(sev.label)}
          </span>
          <span class="bc-badge">
            <i class="fas fa-microchip" aria-hidden="true"></i>
            ${escHtml(category)}
          </span>
          ${
            pCodes.length > 0
              ? `<span class="bc-badge bc-badge--mono">${escHtml(t.obdLabel || "OBD-II:")} ${escHtml(pCodes.join(", "))}</span>`
              : ""
          }
        </div>
        <h3 class="bc-datasheet__title">${escHtml(title)}</h3>
        <p class="bc-datasheet__summary">${escHtml(description)}</p>
      </div>

      <div class="bc-datasheet__grid">
        <div class="bc-datasheet__primary">
          ${
            solutions.length
              ? `<div>
                  <h4 class="bc-datasheet__block-title">
                    <i class="fas fa-screwdriver-wrench" aria-hidden="true"></i>
                    ${escHtml(t.possibleSolutions || "Diagnostic & Repair Procedure")}
                  </h4>
                  <ol class="bc-steps-list">
                    ${solutions.map((s) => `<li>${escHtml(s)}</li>`).join("")}
                  </ol>
                </div>`
              : ""
          }

          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <a href="/parts.html?code=${encodeURIComponent(code.code)}" class="btn btn-secondary btn-sm">
              <i class="fas fa-cogs" aria-hidden="true"></i>
              <span>${escHtml(labels.oemParts)}</span>
            </a>
            <a href="https://www.google.com/search?q=${encodeURIComponent(realOemQuery)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
              <i class="fas fa-book-open" aria-hidden="true"></i>
              <span>${escHtml(labels.realOem)}</span>
            </a>
            <a href="/forum.html?q=${encodeURIComponent(code.code)}" class="btn btn-secondary btn-sm">
              <i class="fas fa-comments" aria-hidden="true"></i>
              <span>${escHtml(labels.forumDiscuss)}</span>
            </a>
          </div>

          ${
            related.length
              ? `<div>
                  <h4 class="bc-datasheet__block-title">
                    <i class="fas fa-diagram-project" aria-hidden="true"></i>
                    ${escHtml(labels.relatedTitle)}
                  </h4>
                  <div class="bc-related-codes">
                    ${related
                      .map(
                        (rc) => `
                      <button type="button" class="bc-related-item" data-open-code="${escHtml(rc.code)}">
                        <span class="bc-related-item__code">${escHtml(rc.code)}</span>
                        <span class="bc-related-item__title">${escHtml(codeTitleText(rc, lang))}</span>
                      </button>`
                      )
                      .join("")}
                  </div>
                </div>`
              : ""
          }
        </div>

        <aside class="bc-datasheet__aside">
          ${
            engines.length
              ? `<div>
                  <h4 class="bc-datasheet__block-title">
                    <i class="fas fa-gauge-high" aria-hidden="true"></i>
                    ${escHtml(t.engineCodes || "Engine Codes")}
                  </h4>
                  <div class="bc-tag-cloud">
                    ${engines.map((e) => `<span class="bc-spec-tag bc-spec-tag--engine">${escHtml(e)}</span>`).join("")}
                  </div>
                </div>`
              : ""
          }

          ${
            models.length
              ? `<div>
                  <h4 class="bc-datasheet__block-title">
                    <i class="fas fa-car-side" aria-hidden="true"></i>
                    ${escHtml(t.applicableModels || "Applicable Chassis")}
                  </h4>
                  <div class="bc-tag-cloud">
                    ${models.map((m) => `<span class="bc-spec-tag">${escHtml(m)}</span>`).join("")}
                  </div>
                </div>`
              : ""
          }

          <div>
            <h4 class="bc-datasheet__block-title">
              <i class="fas fa-terminal" aria-hidden="true"></i>
              ${escHtml(labels.softwareTitle)}
            </h4>
            <div class="bc-tag-cloud">
              ${software.map((s) => `<span class="bc-spec-tag">${escHtml(s)}</span>`).join("")}
            </div>
          </div>
        </aside>
      </div>
      ${forumModal ? `<div id="modal-parts-finder-mount" style="padding: 0 24px 24px;"></div>` : ""}
    </article>
  `;

  // Wire Copy & Favorite buttons inside datasheet
  const copyBtn = document.getElementById("detail-copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(`${code.code} — ${title}`);
        const span = copyBtn.querySelector("span");
        if (span) span.textContent = labels.copied;
      } catch (_) {}
    });
  }

  const favBtn = document.getElementById("detail-fav-btn");
  if (favBtn) {
    favBtn.addEventListener("click", (ev) => {
      window.toggleFavorite(ev, code.code);
      displayCodeDetail(code);
    });
  }

  // Wire related code buttons even on pages without index-premium.js
  codeDetail.querySelectorAll("[data-open-code]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const targetCode = btn.getAttribute("data-open-code");
      if (targetCode) window.openCodeModal(targetCode);
    });
  });

  // Initialize Parts Finder
  const partsMountId = forumModal ? "modal-parts-finder-mount" : "parts-finder-container";
  const partsContainer = document.getElementById(partsMountId);
  if (partsContainer && typeof PartsFinderUI !== "undefined") {
    partsContainer.classList.remove("hidden");
    const partsFinder = new PartsFinderUI(partsMountId);
    partsFinder.loadParts(code.code);
  }
}

// =============================================================================
// SAVED CODES (FAVORITES)
// =============================================================================

window.toggleFavorite = function (event, codeId) {
  if (event) event.stopPropagation();

  let favorites = [];
  try {
    favorites = JSON.parse(localStorage.getItem("bmwFavorites") || "[]");
  } catch (_) {}

  if (favorites.includes(codeId)) {
    favorites = favorites.filter((id) => id !== codeId);
  } else {
    favorites.push(codeId);
  }

  localStorage.setItem("bmwFavorites", JSON.stringify(favorites));
  if (typeof window.updateSavedCountBadge === "function") {
    window.updateSavedCountBadge();
  }

  if (!document.body.classList.contains("viewing-detail")) {
    handleSearch();
  }
  renderFavoritesList();
};

window.toggleFavoritesModal = function () {
  const modal = document.getElementById("favorites-modal");
  if (!modal) return;
  const willOpen = !modal.classList.contains("active");
  if (willOpen) {
    document.getElementById("auth-modal")?.classList.remove("active");
    modal.classList.add("active");
    renderFavoritesList();
  } else {
    modal.classList.remove("active");
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  }
};

function renderFavoritesList() {
  const list = document.getElementById("favorites-list");
  if (!list) return;

  let favorites = [];
  try {
    favorites = JSON.parse(localStorage.getItem("bmwFavorites") || "[]");
  } catch (_) {}
  const t = (window.APP_TRANSLATIONS && (window.APP_TRANSLATIONS[currentLanguage] || window.APP_TRANSLATIONS.en)) || {};

  list.innerHTML = "";

  if (favorites.length === 0) {
    list.innerHTML = `
      <div class="empty-favs">
        <i class="far fa-bookmark" aria-hidden="true"></i>
        <p>${escHtml(t.emptySaved || "No saved diagnostic codes yet.")}</p>
      </div>`;
    return;
  }

  const savedCodes = bmwCodes.filter((c) => favorites.includes(c.code));
  const favCta = t.solutionCta || "Inspect";

  savedCodes.forEach((code) => {
    const sev = getSeverityMeta(code.severity, currentLanguage);
    const div = document.createElement("div");
    div.className = "bc-result-row code-item";

    div.innerHTML = `
      <div class="bc-result-row__inner">
        <div class="bc-result-row__main code-item-main" role="button" tabindex="0">
          <div class="bc-result-row__id-col">
            <span class="bc-result-row__code">${escHtml(code.code)}</span>
            <span class="severity-badge severity-${sev.cls}" style="width:fit-content;">${escHtml(sev.label)}</span>
          </div>
          <div class="bc-result-row__body">
            <span class="bc-result-row__title">${escHtml(codeTitleText(code, currentLanguage))}</span>
            <span class="bc-result-row__meta">${escHtml(code.category || "BMW DTC")}</span>
          </div>
          <div class="bc-result-row__cta-col">
            <span class="bc-result-row__open">${escHtml(favCta)}</span>
          </div>
        </div>
        <div class="bc-result-row__actions">
          <button type="button" class="star-btn active" title="Remove" onclick="toggleFavorite(event, '${escHtml(code.code)}')">
            <i class="fas fa-trash-alt" aria-hidden="true"></i>
          </button>
        </div>
      </div>`;

    const mainEl = div.querySelector(".code-item-main");
    mainEl.addEventListener("click", () => {
      toggleFavoritesModal();
      displayCodeDetail(code);
    });

    list.appendChild(div);
  });
}

/* Global modal opener for .badge-code-link & [data-open-code] */
window.openCodeModal = function openCodeModal(codeStr) {
  if (!codeStr) return;
  const needle = String(codeStr).trim().toUpperCase();
  const tryFind = () => {
    const lookup = window.__bmwCodeLookup;
    if (lookup) {
      return lookup.byCode.get(needle) || lookup.byPCode.get(needle) || null;
    }
    return (window.bmwCodes || bmwCodes || []).find(
      (c) => c.code && String(c.code).toUpperCase() === needle
    );
  };
  const code = tryFind();
  if (code) return window.displayCodeDetail(code);

  const once = () => {
    const c = tryFind();
    window.removeEventListener("bmwCodes:ready", once);
    if (c) return window.displayCodeDetail(c);
    window.location.href = `/code/${encodeURIComponent(codeStr)}?lang=${encodeURIComponent(currentLanguage)}`;
  };
  window.addEventListener("bmwCodes:ready", once);
  setTimeout(once, 1500);
};
window.displayCodeDetail = displayCodeDetail;

document.addEventListener("click", (ev) => {
  const btn = ev.target.closest(".badge-code-link");
  if (!btn) return;
  ev.preventDefault();
  ev.stopPropagation();
  const code = btn.dataset.code;
  if (code) window.openCodeModal(code);
});

window.hideDetail = function () {
  const detailEl = document.getElementById("code-detail");
  const searchEl = document.getElementById("search-container");
  const forumModal = document.getElementById("code-detail-modal");
  const partsContainer = document.getElementById("parts-finder-container");

  if (forumModal) {
    forumModal.classList.remove("active");
  }

  if (detailEl) detailEl.classList.add("hidden");
  if (searchEl) searchEl.classList.remove("hidden");
  if (partsContainer) partsContainer.classList.add("hidden");

  selectedCode = null;
  if (!forumModal) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

// =============================================================================
// AUTHENTICATION & ACCOUNT RECOVERY
// =============================================================================

function toggleAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  const willOpen = !modal.classList.contains("active");
  if (willOpen) {
    document.getElementById("favorites-modal")?.classList.remove("active");
    switchAuthTab("login");
    modal.classList.add("active");
  } else {
    modal.classList.remove("active");
  }
}
window.toggleAuthModal = toggleAuthModal;

function switchAuthTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll("#auth-modal .auth-form").forEach((form) => form.classList.remove("active"));

  const tabs = document.querySelectorAll("#auth-modal .tab-btn");
  if (tab === "login") {
    tabs[0]?.classList.add("active");
    document.getElementById("login-form")?.classList.add("active");
  } else {
    tabs[1]?.classList.add("active");
    document.getElementById("register-form")?.classList.add("active");
  }
}
window.switchAuthTab = switchAuthTab;

window.showRecoveryModal = function () {
  toggleAuthModal();
  const modal = document.getElementById("recovery-modal");
  if (modal) {
    modal.classList.add("active");
    const s1 = document.getElementById("recovery-step-1");
    const s2 = document.getElementById("recovery-step-2");
    if (s1) {
      s1.classList.add("active");
      s1.style.display = "";
    }
    if (s2) {
      s2.classList.remove("active");
      s2.style.display = "none";
    }
    const msg = document.getElementById("rec-msg-1");
    if (msg) msg.textContent = "";
    const recEmail = document.getElementById("rec-email");
    if (recEmail) recEmail.value = "";
  }
};

window.closeRecoveryModal = function () {
  document.getElementById("recovery-modal")?.classList.remove("active");
};

function setupRegisterForm() {
  const regForm = document.getElementById("register-form");
  const getT = () => (window.APP_TRANSLATIONS && (window.APP_TRANSLATIONS[currentLanguage] || window.APP_TRANSLATIONS.en)) || {};

  const step1 = document.getElementById("recovery-step-1");
  if (step1 && !step1.dataset.bound) {
    step1.dataset.bound = "1";
    step1.addEventListener("submit", async (e) => {
      e.preventDefault();
      const t = getT();
      const email = document.getElementById("rec-email")?.value || "";
      const msg = document.getElementById("rec-msg-1");
      const btn = e.target.querySelector("button");
      const origLabel = btn ? btn.textContent : "Continue";

      try {
        if (btn) btn.textContent = "...";
        if (msg) msg.textContent = "";

        const res = await fetch("/api/auth/password-recovery/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: email }),
        });
        const data = await res.json();

        if (res.ok) {
          window.recoveryToken = data.recovery_token;
          const s1 = document.getElementById("recovery-step-1");
          const s2 = document.getElementById("recovery-step-2");
          if (s1) {
            s1.classList.remove("active");
            s1.style.display = "none";
          }
          if (s2) {
            s2.classList.add("active");
            s2.style.display = "";
          }

          const qMap = {
            first_pet: t.secQPet || "What was your first pet's name?",
            mother_maiden: t.secQMaiden || "What is your mother's maiden name?",
            first_car: t.secQCar || "What was your first car model?",
            city_born: t.secQCity || "In which city were you born?",
          };
          const display = document.getElementById("rec-question-display");
          if (display) display.textContent = qMap[data.security_question] || data.security_question;
        } else if (msg) {
          msg.textContent = data.error || "Account not found";
          msg.style.color = "var(--status-danger)";
        }
      } catch (_) {
        if (msg) {
          msg.textContent = t.networkError || "Connection error";
          msg.style.color = "var(--status-danger)";
        }
      } finally {
        if (btn) btn.textContent = origLabel;
      }
    });
  }

  const step2 = document.getElementById("recovery-step-2");
  if (step2 && !step2.dataset.bound) {
    step2.dataset.bound = "1";
    step2.addEventListener("submit", async (e) => {
      e.preventDefault();
      const answer = document.getElementById("rec-answer")?.value || "";
      const newPassword = document.getElementById("rec-new-password")?.value || "";
      const msg = document.getElementById("rec-msg-2");
      const btn = e.target.querySelector("button");
      const origLabel = btn ? btn.textContent : "Reset Password";

      try {
        if (btn) btn.textContent = "...";
        if (msg) msg.textContent = "";

        const verifyRes = await fetch("/api/auth/password-recovery/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recovery_token: window.recoveryToken,
            security_answer: answer,
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || "Incorrect security answer");

        const resetRes = await fetch("/api/auth/password-recovery/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reset_token: verifyData.reset_token,
            new_password: newPassword,
          }),
        });
        const resetData = await resetRes.json();

        if (resetRes.ok) {
          if (msg) {
            msg.textContent = "Password updated. Redirecting to sign in…";
            msg.style.color = "var(--status-success)";
          }
          window.recoveryToken = null;
          setTimeout(() => {
            closeRecoveryModal();
            toggleAuthModal();
          }, 1600);
        } else {
          throw new Error(resetData.error || "Failed to reset password");
        }
      } catch (err) {
        if (msg) {
          msg.textContent = err.message || "Connection error";
          msg.style.color = "var(--status-danger)";
        }
      } finally {
        if (btn) btn.textContent = origLabel;
      }
    });
  }

  if (!regForm || regForm.dataset.bound) return;
  regForm.dataset.bound = "1";

  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const val = (id) => document.getElementById(id)?.value?.trim() ?? "";
    const username = val("reg-username");
    const firstName = val("reg-first-name") || null;
    const lastName = val("reg-last-name") || null;
    const ageRaw = val("reg-age");
    const age = ageRaw ? parseInt(ageRaw, 10) : null;
    const email = val("reg-email");
    const password = document.getElementById("reg-password")?.value ?? "";
    const question = val("reg-question");
    const answer = val("reg-answer");
    const msg = document.getElementById("reg-msg");
    const btn = regForm.querySelector('button[type="submit"]');
    const originalBtnHtml = btn ? btn.innerHTML : "";

    const setMsg = (text, ok = false) => {
      if (!msg) return;
      msg.textContent = text;
      msg.style.color = ok ? "var(--status-success)" : "var(--status-danger)";
    };

    if (!username || !email || !password) {
      setMsg("Please enter username, email, and password.");
      return;
    }
    if (!question || !answer) {
      setMsg("Please select a security question and provide an answer.");
      return;
    }
    if (age !== null && (Number.isNaN(age) || age < 13 || age > 120)) {
      setMsg("Age must be between 13 and 120.");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
    }

    const payload = {
      username,
      first_name: firstName,
      last_name: lastName,
      age,
      email,
      password,
      language: currentLanguage || "en",
      security_question: question,
      security_answer: answer,
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMsg("Account created. Please sign in.", true);
        setTimeout(() => switchAuthTab("login"), 1200);
      } else {
        setMsg(data.error || `Registration failed (HTTP ${res.status})`);
      }
    } catch (err) {
      setMsg(err?.message || "Connection error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
      }
    }
  });
}

function setupLoginForm() {
  const loginForm = document.getElementById("login-form");
  if (!loginForm || loginForm.dataset.bound) return;
  loginForm.dataset.bound = "1";

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value?.trim() ?? "";
    const password = document.getElementById("login-password")?.value ?? "";
    const msg = document.getElementById("login-msg");
    const btn = loginForm.querySelector('button[type="submit"]');
    const originalBtnHtml = btn ? btn.innerHTML : "";

    const setMsg = (text, ok = false) => {
      if (!msg) return;
      msg.textContent = text;
      msg.style.color = ok ? "var(--status-success)" : "var(--status-danger)";
    };

    if (!email || !password) {
      setMsg("Please enter email and password.");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user_data", JSON.stringify(data.user));
        await refreshUserData();
        checkAuthStatus();

        window.dispatchEvent(new CustomEvent("auth:changed", { detail: { user: data.user } }));
        if (typeof updateSidebarUser === "function") updateSidebarUser();

        const replyForm = document.getElementById("reply-form");
        const loginMsg = document.getElementById("login-to-reply");
        if (replyForm) replyForm.style.display = "flex";
        if (loginMsg) loginMsg.style.display = "none";

        setMsg("Signed in.", true);

        setTimeout(() => {
          toggleAuthModal();
          const emailEl = document.getElementById("login-email");
          const passwordEl = document.getElementById("login-password");
          if (emailEl) emailEl.value = "";
          if (passwordEl) passwordEl.value = "";
          if (msg) msg.textContent = "";
        }, 700);
      } else {
        setMsg(data.error || (res.status === 401 ? "Invalid email or password" : `Login failed (HTTP ${res.status})`));
      }
    } catch (_) {
      setMsg("Connection error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
      }
    }
  });
}

function checkAuthStatus() {
  const token = localStorage.getItem("auth_token");
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user_data") || "null");
  } catch (_) {}
  const authBtn = document.getElementById("auth-btn");
  if (!authBtn) return;

  const t = (window.APP_TRANSLATIONS && (window.APP_TRANSLATIONS[currentLanguage] || window.APP_TRANSLATIONS.en)) || {};
  const loginText = t.loginBtn || "Sign In";

  authBtn.classList.remove("hidden");
  authBtn.innerHTML = `<i class="fas fa-user-circle" aria-hidden="true"></i> <span data-i18n="loginBtn">${escHtml(loginText)}</span>`;
  const span = authBtn.querySelector("span");

  if (token && user && user.username) {
    if (span) {
      span.removeAttribute("data-i18n");
      span.textContent = user.username;
    }

    if (user.avatar_url) {
      const icon = authBtn.querySelector("i");
      if (icon) {
        icon.outerHTML = `<img src="${escHtml(user.avatar_url)}" onerror="this.onerror=null;this.src='/assets/icons/ico.svg'" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover;border:1px solid var(--border-strong);">`;
      }
    }

    authBtn.classList.add("auth-btn--logged");
    authBtn.classList.remove("bc-tool-btn--primary");
    authBtn.setAttribute("href", "#");
    authBtn.removeAttribute("onclick");

    let wrapper = authBtn.closest(".auth-dropdown-wrap");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "auth-dropdown-wrap";
      authBtn.parentNode.insertBefore(wrapper, authBtn);
      wrapper.appendChild(authBtn);
    }
    wrapper.querySelector(".auth-dropdown")?.remove();

    const profileLabel = t.profile || "Profile & Garage";
    const logoutLabel = t.logout || "Logout";
    const isAdmin = ["super_admin_role", "admin_role", "senior_moderator_role", "moderator_role", "admin", "super_admin"].includes(
      String(user.role_id || user.role || "")
    );

    const dropdown = document.createElement("div");
    dropdown.className = "auth-dropdown";
    dropdown.innerHTML = `
      <a href="/profile.html" class="auth-dropdown-item">
        <i class="fas fa-id-badge" aria-hidden="true"></i> ${escHtml(profileLabel)}
      </a>
      ${
        isAdmin
          ? `<a href="/admin.html" class="auth-dropdown-item">
              <i class="fas fa-sliders" aria-hidden="true"></i> Admin Console
            </a>`
          : ""
      }
      <button type="button" class="auth-dropdown-item auth-dropdown-logout" onclick="logout && logout()">
        <i class="fas fa-sign-out-alt" aria-hidden="true"></i> ${escHtml(logoutLabel)}
      </button>
    `;
    wrapper.appendChild(dropdown);

    authBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      wrapper.classList.toggle("open");
    };
  } else {
    const wrapper = authBtn.closest(".auth-dropdown-wrap");
    if (wrapper) {
      wrapper.parentNode.insertBefore(authBtn, wrapper);
      wrapper.remove();
    }
    authBtn.classList.remove("auth-btn--logged");
    authBtn.classList.add("bc-tool-btn--primary");
    authBtn.setAttribute("href", "#");
    authBtn.removeAttribute("onclick");
    authBtn.onclick = (e) => {
      e.preventDefault();
      toggleAuthModal();
    };
  }
}

document.addEventListener("click", (e) => {
  document.querySelectorAll(".auth-dropdown-wrap.open").forEach((wrap) => {
    if (!wrap.contains(e.target)) wrap.classList.remove("open");
  });
});

window.logout = function () {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");
  location.reload();
};

// =============================================================================
// INITIALIZATION & SEARCH EXECUTION
// =============================================================================

function showAdminDeniedBannerIfNeeded() {
  if (new URLSearchParams(window.location.search).get("admin") !== "denied") return;
  const h = window.location.hostname;
  const isLocal = h === "localhost" || h === "127.0.0.1";
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.style.cssText =
    "position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:12px 16px;background:var(--surface-2);color:var(--text-primary);font-size:13px;border-top:2px solid var(--status-warning);line-height:1.5;box-shadow:var(--shadow-lg);";
  const parts = isLocal
    ? [
        "<strong>Admin (local):</strong> API returned 403 — assign an admin role in local D1 or configure <code>ADMIN_PANEL_EMAILS</code> in <code>.dev.vars</code>. ",
        '<button type="button" class="btn btn-secondary btn-sm admin-denied-dismiss" style="margin-left:10px;">Dismiss</button>',
      ]
    : [
        "<strong>Admin:</strong> Access denied. Your account requires an administrator role. ",
        '<button type="button" class="btn btn-secondary btn-sm admin-denied-dismiss" style="margin-left:10px;">OK</button>',
      ];
  el.innerHTML = parts.join("");
  el.querySelector(".admin-denied-dismiss").addEventListener("click", () => {
    el.remove();
    const u = new URL(window.location.href);
    u.searchParams.delete("admin");
    window.history.replaceState({}, document.title, u.pathname + u.search);
  });
  document.body.appendChild(el);
}

async function init() {
  try {
    showAdminDeniedBannerIfNeeded();
    await refreshUserData();

    if (typeof getMockData === "function") bmwCodes = getMockData();

    const [resCodes, resData] = await Promise.all([
      fetch("/data/codes.json").catch(() => null),
      fetch("/data/data.json").catch(() => null),
    ]);

    if (resCodes && resCodes.ok) {
      const d1 = await resCodes.json();
      bmwCodes = [...bmwCodes, ...(d1.codes || [])];
    }

    if (resData && resData.ok) {
      const d2 = await resData.json();
      const existingCodes = new Set(bmwCodes.map((c) => c.code));
      const newCodes = (d2.codes || []).filter((c) => !existingCodes.has(c.code));
      bmwCodes = [...bmwCodes, ...newCodes];
    }

    window.bmwCodes = bmwCodes;
    window.__bmwCodeLookup = buildCodeLookup(bmwCodes);
    window.dispatchEvent(new CustomEvent("bmwCodes:ready", { detail: { count: bmwCodes.length } }));

    setupRegisterForm();
    setupLoginForm();
    checkAuthStatus();
    setupEventListeners();
    updateLanguage();
    renderRecentCodesBar();

    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get("lang");
    if (urlLang && ["en", "ru", "ka"].includes(urlLang)) {
      window.setPageLanguage(urlLang);
    }

    const codeFromUrl = urlParams.get("code") || urlParams.get("search");
    if (codeFromUrl && searchInput) {
      searchInput.value = codeFromUrl;
      const exact =
        window.__bmwCodeLookup.byCode.get(codeFromUrl.trim().toUpperCase()) ||
        window.__bmwCodeLookup.byPCode.get(codeFromUrl.trim().toUpperCase());
      if (exact) {
        displayCodeDetail(exact);
      } else {
        handleSearch();
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (urlParams.get("saved") === "1") {
      toggleFavoritesModal();
    }

    setupAvatarEditorAndProfileForm();

    if (typeof window.__forumRenderMobileMenu === "function") {
      window.__forumRenderMobileMenu();
    } else if (typeof initMobileMenu === "function") {
      initMobileMenu();
    }
  } catch (error) {
    console.warn("Init error", error);
    setupEventListeners();
    updateLanguage();
  }
}

function setupAvatarEditorAndProfileForm() {
  const avatarInput = document.getElementById("avatar-upload");
  const canvas = document.getElementById("avatar-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const slider = document.getElementById("zoom-slider");
  const previewContainer = document.getElementById("current-avatar-view");
  const canvasContainer = document.getElementById("canvas-container");
  const profileForm = document.getElementById("profile-form");

  function drawEditor() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    const currentScale = baseScale * zoomLevel;
    const imgWidth = cropperImage.width * currentScale;
    const imgHeight = cropperImage.height * currentScale;
    const centerX = (canvas.width - imgWidth) / 2 + cropperOffsetX;
    const centerY = (canvas.height - imgHeight) / 2 + cropperOffsetY;

    ctx.drawImage(cropperImage, centerX, centerY, imgWidth, imgHeight);
    ctx.restore();
  }

  function resetEditor() {
    if (!canvas || !cropperImage.width) return;
    baseScale = Math.max(canvas.width / cropperImage.width, canvas.height / cropperImage.height);
    zoomLevel = 1;
    if (slider) slider.value = 1;
    cropperOffsetX = 0;
    cropperOffsetY = 0;
    drawEditor();
  }

  if (avatarInput) {
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        cropperImage = new Image();
        cropperImage.src = evt.target.result;
        cropperImage.onload = () => {
          isNewImageSelected = true;
          if (previewContainer) previewContainer.style.display = "none";
          if (canvasContainer) canvasContainer.style.display = "block";
          resetEditor();
        };
      };
      reader.readAsDataURL(file);
    });
  }

  if (slider) {
    slider.addEventListener("input", (e) => {
      zoomLevel = parseFloat(e.target.value);
      drawEditor();
    });
  }

  if (canvas) {
    canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
    });
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      cropperOffsetX += e.clientX - startX;
      cropperOffsetY += e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;
      drawEditor();
    });
    window.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  if (profileForm && !profileForm.dataset.bound) {
    profileForm.dataset.bound = "1";
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.querySelector("#profile-form button[type='submit']");
      const originalText = btn ? btn.textContent : "Save";
      if (btn) {
        btn.textContent = "Saving...";
        btn.disabled = true;
      }

      const user = JSON.parse(localStorage.getItem("user_data") || "{}");
      const username = document.getElementById("profile-username")?.value;
      const email = document.getElementById("profile-email")?.value;
      const firstName = document.getElementById("profile-first-name")?.value;
      const lastName = document.getElementById("profile-last-name")?.value;
      const age = parseInt(document.getElementById("profile-age")?.value, 10) || null;
      const city = document.getElementById("profile-city")?.value;
      const country = document.getElementById("profile-country")?.value;
      const carModel = document.getElementById("profile-car")?.value;
      const bmwYear = parseInt(document.getElementById("profile-year")?.value, 10) || null;
      const bmwBody = document.getElementById("profile-body")?.value;
      const bmwEngine = document.getElementById("profile-engine")?.value;
      const bio = document.getElementById("profile-bio")?.value;
      const currentPassword = document.getElementById("profile-password-confirm")?.value;

      const pwInput = document.getElementById("profile-password-confirm");
      const emailInput = document.getElementById("profile-email");
      const emailChanged =
        emailInput && email && String(email).trim().toLowerCase() !== String(user.email || "").toLowerCase();

      if (emailChanged && !currentPassword) {
        alert("Please enter your current password to change email");
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
        return;
      }
      if (pwInput && !emailChanged && !currentPassword) {
        alert("Please enter your current password to save changes");
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
        return;
      }
      if (age && (age < 13 || age > 120)) {
        alert("Age must be between 13 and 120");
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
        return;
      }

      let finalAvatarUrl = user.avatar_url;

      try {
        if (isNewImageSelected && canvas) {
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
          const formData = new FormData();
          formData.append("file", blob, "avatar.webp");
          const upRes = await fetch("/api/upload", { method: "POST", body: formData });
          const upData = await upRes.json();
          if (upData.url) finalAvatarUrl = upData.url;
        }

        const token = localStorage.getItem("auth_token");
        if (!token) {
          alert("Please sign in again");
          if (btn) { btn.textContent = originalText; btn.disabled = false; }
          return;
        }

        if (emailChanged) {
          const emailRes = await fetch("/api/user/change-email", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              id: user.id,
              current_password: currentPassword,
              new_email: email.trim(),
            }),
          });
          const emailData = await emailRes.json();
          if (!emailRes.ok || !emailData.success) {
            alert("Error: " + (emailData.error || "Email update failed"));
            if (btn) { btn.textContent = originalText; btn.disabled = false; }
            return;
          }
        }

        const payload = { id: user.id, avatar_url: finalAvatarUrl };
        if (username != null && username !== "") payload.username = username;
        if (firstName != null) payload.first_name = firstName;
        if (lastName != null) payload.last_name = lastName;
        if (age != null) payload.age = age;
        if (city != null) payload.city = city;
        if (country != null) payload.country = country;
        if (carModel != null) payload.car_model = carModel;
        if (bmwYear != null) payload.bmw_year = bmwYear;
        if (bmwBody != null) payload.bmw_body = bmwBody;
        if (bmwEngine != null) payload.bmw_engine = bmwEngine;
        if (bio != null) payload.bio = bio;

        const updateRes = await fetch("/api/user/update", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const updateData = await updateRes.json();

        if (updateRes.ok && updateData.success) {
          if (pwInput) pwInput.value = "";
          await refreshUserData();
          alert("Profile updated successfully!");
          if (username && username !== user.username) {
            location.reload();
          } else {
            toggleProfileModal();
            checkAuthStatus();
          }
        } else {
          alert("Error: " + (updateData.error || "Update failed"));
        }
      } catch (err) {
        console.error(err);
        alert("Error saving profile");
      } finally {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", init);

function setupEventListeners() {
  const input = document.getElementById("search-input");
  if (input && !input.dataset.boundSearch) {
    input.dataset.boundSearch = "1";
    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => handleSearch(), 220);
    });
  }

  if (languageToggle && !languageToggle.dataset.boundLang) {
    languageToggle.dataset.boundLang = "1";
    languageToggle.addEventListener("click", () => {
      const langs = ["en", "ru", "ka"];
      const idx = langs.indexOf(currentLanguage);
      window.setPageLanguage(langs[(idx + 1) % langs.length]);
    });
  }
}

window.setPageLanguage = function (nextLang) {
  if (!["en", "ru", "ka"].includes(nextLang)) return;
  currentLanguage = nextLang;
  localStorage.setItem("forumLanguage", currentLanguage);
  localStorage.setItem("language", currentLanguage);
  updateLanguage();
  if (selectedCode) displayCodeDetail(selectedCode);
  else handleSearch();
};

function updateLanguage() {
  const langLabels = { en: "EN", ru: "RU", ka: "KA" };

  if (languageToggle) {
    const span = languageToggle.querySelector("span");
    if (span) span.textContent = langLabels[currentLanguage] || "EN";
  }
  const sheetLangDisplay = document.getElementById("bc3-sheet-lang-display");
  if (sheetLangDisplay) sheetLangDisplay.textContent = langLabels[currentLanguage] || "EN";

  const text =
    (window.APP_TRANSLATIONS && (window.APP_TRANSLATIONS[currentLanguage] || window.APP_TRANSLATIONS.en)) || {};

  if (searchInput && text.searchPlaceholder) {
    searchInput.placeholder = text.searchPlaceholder;
  }

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (text[key] != null) el.textContent = text[key];
  });

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (text[key] != null) el.innerHTML = text[key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (text[key]) el.placeholder = text[key];
  });

  document.documentElement.setAttribute("lang", currentLanguage);
  checkAuthStatus();

  window.dispatchEvent(
    new CustomEvent("languageChanged", { detail: { lang: currentLanguage } })
  );
  if (typeof window.updateChatContext === "function") {
    window.updateChatContext();
  }

  if (typeof window.__forumRenderMobileMenu === "function") {
    window.__forumRenderMobileMenu();
  } else if (typeof initMobileMenu === "function") {
    initMobileMenu();
  }
}

function handleSearch() {
  if (!searchInput || !resultsContainer) return;

  const term = searchInput.value.trim();
  const runId = ++searchRunId;

  if (term === "" || term.length < SEARCH_MIN_CHARS) {
    resultsContainer.classList.add("hidden");
    resultsContainer.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    if (noResults) noResults.classList.add("hidden");
    return;
  }

  const doSearch = () => {
    if (runId !== searchRunId) return;
    if (document.body.classList.contains("viewing-detail")) return;
    const { items, truncated } = searchCodes(term, currentLanguage);

    if (items.length === 0) {
      resultsContainer.classList.add("hidden");
      resultsContainer.innerHTML = "";
      if (emptyState) emptyState.classList.add("hidden");
      if (noResults) noResults.classList.remove("hidden");
      return;
    }

    renderResults(items, { truncated });
    resultsContainer.classList.remove("hidden");
    if (emptyState) emptyState.classList.add("hidden");
    if (noResults) noResults.classList.add("hidden");
  };

  requestAnimationFrame(doSearch);
}
window.handleSearch = handleSearch;

function renderResults(codes, opts = {}) {
  let favorites = [];
  try {
    favorites = JSON.parse(localStorage.getItem("bmwFavorites") || "[]");
  } catch (_) {}
  const t = (window.APP_TRANSLATIONS && (window.APP_TRANSLATIONS[currentLanguage] || window.APP_TRANSLATIONS.en)) || {};
  const ctaLabel = t.solutionCta || "Inspect";
  const frag = document.createDocumentFragment();

  if (opts.truncated) {
    const hint = document.createElement("p");
    hint.className = "search-results-hint";
    hint.textContent =
      t.searchResultsTruncated ||
      `Showing top ${SEARCH_MAX_RESULTS} matches — refine code or system keyword for narrower results.`;
    frag.appendChild(hint);
  }

  codes.forEach((code) => {
    const el = document.createElement("div");
    el.className = "bc-result-row code-item";

    const isFav = favorites.includes(code.code);
    const sev = getSeverityMeta(code.severity, currentLanguage);
    const enginesPreview = (code.engineCodes || []).slice(0, 4).join(", ");
    const obdPreview = (code.pCodes || []).slice(0, 2).join(", ");

    el.innerHTML = `
      <div class="bc-result-row__inner">
        <div class="bc-result-row__main code-item-main" role="button" tabindex="0">
          <div class="bc-result-row__id-col">
            <span class="bc-result-row__code">
              ${escHtml(code.code)}
              <a href="/code/${encodeURIComponent(code.code)}?lang=${encodeURIComponent(currentLanguage)}"
                 title="Open standalone datasheet"
                 onclick="event.stopPropagation()"
                 style="font-size:11px;color:var(--text-tertiary);">
                <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
              </a>
            </span>
            ${obdPreview ? `<span class="bc-result-row__obd">${escHtml(obdPreview)}</span>` : ""}
          </div>

          <div class="bc-result-row__body">
            <span class="bc-result-row__title">${escHtml(codeTitleText(code, currentLanguage))}</span>
            <div class="bc-result-row__meta">
              <span><i class="fas fa-microchip" aria-hidden="true"></i> ${escHtml(code.category || "BMW DTC")}</span>
              ${enginesPreview ? `<span>· ${escHtml(enginesPreview)}</span>` : ""}
            </div>
          </div>

          <div class="bc-result-row__cta-col">
            <span class="severity-badge severity-${sev.cls}">${escHtml(sev.label)}</span>
            <button type="button" class="bc-result-row__open" data-action="open-detail">${escHtml(ctaLabel)}</button>
          </div>
        </div>

        <div class="bc-result-row__actions">
          <button type="button" class="star-btn ${isFav ? "active" : ""}" title="Save code" onclick="toggleFavorite(event, '${escHtml(code.code)}')">
            <i class="${isFav ? "fas" : "far"} fa-bookmark" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `;

    const mainEl = el.querySelector(".code-item-main");
    const openDetail = () => displayCodeDetail(code);
    mainEl.addEventListener("click", openDetail);
    mainEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openDetail();
      }
    });

    frag.appendChild(el);
  });

  resultsContainer.innerHTML = "";
  resultsContainer.appendChild(frag);
}

// =============================================================================
// PROFILE MODAL & USER SYNC
// =============================================================================

window.toggleProfileModal = async function () {
  const modal = document.getElementById("profile-modal");
  if (!modal) return;

  modal.classList.toggle("active");

  if (modal.classList.contains("active")) {
    await refreshUserData();
    const user = JSON.parse(localStorage.getItem("user_data") || "null");

    if (user) {
      const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v || "";
      };
      setVal("profile-username", user.username);
      setVal("profile-email", user.email);
      setVal("profile-first-name", user.first_name);
      setVal("profile-last-name", user.last_name);
      setVal("profile-age", user.age);
      setVal("profile-car", user.car_model);
      setVal("profile-bio", user.bio);
      setVal("profile-city", user.city);
      setVal("profile-country", user.country);
      setVal("profile-year", user.bmw_year);
      setVal("profile-body", user.bmw_body);
      setVal("profile-engine", user.bmw_engine);
      setVal("profile-password-confirm", "");

      const previewContainer = document.getElementById("current-avatar-view");
      const canvasContainer = document.getElementById("canvas-container");
      const previewImg = document.getElementById("profile-preview-img");

      isNewImageSelected = false;
      if (previewContainer) previewContainer.style.display = "block";
      if (canvasContainer) canvasContainer.style.display = "none";

      if (previewImg) {
        previewImg.src =
          user.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || "B")}&background=181E29&color=EDF1F7`;
      }
    }
  }
};

async function refreshUserData() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user_data") || "null");
  } catch (_) {}
  if (!user || !user.id) return;

  try {
    if (user.avatar_url && user.avatar_url.includes("avatar-placeholder.png")) {
      user.avatar_url = "/assets/icons/ico.svg";
      localStorage.setItem("user_data", JSON.stringify(user));
    }

    const res = await fetch(`/api/user/get?id=${encodeURIComponent(user.id)}&t=${Date.now()}`);
    if (res.status === 404) {
      logout();
      return;
    }

    if (res.ok) {
      const freshUser = await res.json();
      const importantKeys = ["username", "avatar_url", "reputation", "role", "email"];
      const hasChanges = importantKeys.some((key) => freshUser[key] !== user[key]);

      localStorage.setItem("user_data", JSON.stringify(freshUser));
      if (hasChanges) {
        checkAuthStatus();
        if (typeof updateSidebarUser === "function") updateSidebarUser();
        if (typeof updateHeaderAuth === "function") updateHeaderAuth();
      }
    }
  } catch (_) {}
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// =============================================================================
// CUSTOM ALERT / CONFIRM DIALOGS & REPUTATION BADGES
// =============================================================================

function createCustomModal(type) {
  let overlay = document.querySelector(".custom-alert-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "custom-alert-overlay";
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="custom-alert-box">
      <div class="custom-alert-icon"><i class="fas"></i></div>
      <div class="custom-alert-message"></div>
      <div class="custom-alert-actions"></div>
    </div>
  `;

  const icon = overlay.querySelector(".custom-alert-icon i");
  if (type === "error") {
    icon.className = "fas fa-circle-exclamation";
    icon.style.color = "var(--status-danger)";
  } else if (type === "success") {
    icon.className = "fas fa-circle-check";
    icon.style.color = "var(--status-success)";
  } else if (type === "confirm") {
    icon.className = "fas fa-circle-question";
    icon.style.color = "var(--status-warning)";
  } else {
    icon.className = "fas fa-circle-info";
    icon.style.color = "var(--accent-light)";
  }

  return overlay;
}

function showCustomAlert(message, type = "info") {
  return new Promise((resolve) => {
    const overlay = createCustomModal(type);
    overlay.querySelector(".custom-alert-message").textContent = message;

    const btn = document.createElement("button");
    btn.className = "custom-alert-btn";
    btn.textContent = "OK";
    btn.onclick = () => {
      closeCustomModal();
      resolve();
    };

    overlay.querySelector(".custom-alert-actions").appendChild(btn);
    setTimeout(() => overlay.classList.add("active"), 10);
  });
}

function showCustomConfirm(message) {
  return new Promise((resolve) => {
    const overlay = createCustomModal("confirm");
    overlay.querySelector(".custom-alert-message").textContent = message;
    const actions = overlay.querySelector(".custom-alert-actions");

    const btnCancel = document.createElement("button");
    btnCancel.className = "custom-alert-btn cancel";
    btnCancel.textContent = "Cancel";
    btnCancel.onclick = () => {
      closeCustomModal();
      resolve(false);
    };

    const btnOk = document.createElement("button");
    btnOk.className = "custom-alert-btn";
    btnOk.textContent = "Confirm";
    btnOk.onclick = () => {
      closeCustomModal();
      resolve(true);
    };

    actions.appendChild(btnCancel);
    actions.appendChild(btnOk);
    setTimeout(() => overlay.classList.add("active"), 10);
  });
}

function closeCustomModal() {
  const overlay = document.querySelector(".custom-alert-overlay");
  if (overlay) {
    overlay.classList.remove("active");
    setTimeout(() => {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 220);
  }
}
window.closeCustomModal = closeCustomModal;
window.showCustomAlert = showCustomAlert;
window.showCustomConfirm = showCustomConfirm;
window.alert = function (msg) {
  showCustomAlert(msg);
};

window.getReputationBadge = function (reputation, role) {
  const lang = localStorage.getItem("forumLanguage") || localStorage.getItem("language") || "en";
  const t = (typeof APP_TRANSLATIONS !== "undefined" && APP_TRANSLATIONS[lang]) ? APP_TRANSLATIONS[lang] : {};

  if (role === "super_admin_role") {
    return `<span class="user-badge badge-super-admin"><i class="fas fa-shield-halved"></i> ${escHtml(t.role_super_admin || "Super Admin")}</span>`;
  }
  if (role === "admin_role") {
    return `<span class="user-badge badge-admin"><i class="fas fa-shield-alt"></i> ${escHtml(t.role_admin || "Admin")}</span>`;
  }
  if (role === "senior_moderator_role") {
    return `<span class="user-badge badge-senior-mod"><i class="fas fa-user-shield"></i> ${escHtml(t.role_senior_mod || "Senior Mod")}</span>`;
  }
  if (role === "moderator_role") {
    return `<span class="user-badge badge-moderator"><i class="fas fa-gavel"></i> ${escHtml(t.role_moderator || "Moderator")}</span>`;
  }

  const rep = parseInt(reputation, 10) || 0;
  if (rep >= 2000) {
    return `<span class="user-badge badge-guru"><i class="fas fa-award"></i> ${escHtml(t.badge_guru || "Master Tech")}</span>`;
  } else if (rep >= 500) {
    return `<span class="user-badge badge-expert"><i class="fas fa-star"></i> ${escHtml(t.badge_expert || "Specialist")}</span>`;
  } else if (rep >= 100) {
    return `<span class="user-badge badge-pro"><i class="fas fa-wrench"></i> ${escHtml(t.badge_pro || "Pro")}</span>`;
  } else if (rep >= 10) {
    return `<span class="user-badge badge-member"><i class="fas fa-user"></i> ${escHtml(t.badge_member || "Member")}</span>`;
  }
  return `<span class="user-badge badge-newcomer"><i class="fas fa-user"></i> ${escHtml(t.badge_newcomer || "Newcomer")}</span>`;
};

// =============================================================================
// MOBILE DRAWER FALLBACK (FORUM / TOPIC OFFCANVAS)
// =============================================================================

window.toggleMobileMenu = function () {
  const offcanvas = document.querySelector(".mobile-offcanvas");
  const overlay = document.querySelector(".mobile-menu-overlay");
  if (offcanvas && overlay) {
    offcanvas.classList.toggle("active");
    overlay.classList.toggle("active");
    document.body.style.overflow = offcanvas.classList.contains("active") ? "hidden" : "";
  }
};

window.initMobileMenu = function () {
  const menuContent = document.getElementById("mobile-menu-content");
  if (!menuContent) return;

  if (typeof window.__forumRenderMobileMenu === "function") {
    window.__forumRenderMobileMenu();
    return;
  }

  menuContent.innerHTML = "";

  const sidebarNav = document.querySelector(".sidebar .nav-menu");
  if (sidebarNav) {
    const navClone = sidebarNav.cloneNode(true);
    navClone.style.marginTop = "0";
    navClone.style.flexDirection = "column";
    navClone.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => toggleMobileMenu());
    });
    menuContent.appendChild(navClone);
  }

  const authContainer = document.createElement("div");
  authContainer.style.marginTop = "16px";
  authContainer.style.paddingTop = "16px";
  authContainer.style.borderTop = "1px solid var(--border-default)";

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user_data") || "null");
  } catch (_) {}

  const t =
    typeof APP_TRANSLATIONS !== "undefined" && APP_TRANSLATIONS[currentLanguage]
      ? APP_TRANSLATIONS[currentLanguage]
      : { loginRegister: "Sign In / Register", profile: "Profile", logout: "Logout" };

  if (user) {
    authContainer.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <img src="${escHtml(user.avatar_url || "/assets/icons/ico.svg")}" onerror="this.onerror=null;this.src='/assets/icons/ico.svg'" style="width:38px;height:38px;border-radius:50%;background:var(--surface-2);object-fit:cover;">
        <div>
          <div style="font-weight:600;color:var(--text-primary);">${escHtml(user.username)}</div>
          <div style="font-size:12px;color:var(--text-tertiary);">${escHtml(user.email || "")}</div>
        </div>
      </div>
      <a href="/profile.html" class="btn btn-secondary" style="width:100%;margin-bottom:8px;">
        <i class="fas fa-user-circle"></i> ${escHtml(t.profile)}
      </a>
      <button type="button" onclick="logout()" class="btn btn-danger" style="width:100%;">
        <i class="fas fa-sign-out-alt"></i> ${escHtml(t.logout)}
      </button>
    `;
  } else {
    authContainer.innerHTML = `
      <button type="button" class="btn btn-primary" onclick="toggleMobileMenu(); toggleAuthModal()" style="width:100%;">
        <i class="fas fa-sign-in-alt"></i> ${escHtml(t.loginRegister)}
      </button>
    `;
  }

  menuContent.appendChild(authContainer);
};
