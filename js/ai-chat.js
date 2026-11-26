/**
 * BimmerCodes AI Diagnostic Companion — calls /api/ai/chat (edge hybrid cascade).
 * Features vehicle/DTC context awareness, structured diagnostic rendering, and code cross-linking.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "bc_ai_chat_history";
  const CTX_STORAGE_KEY = "bc_ai_vehicle_ctx";
  const LANG_KEY = "forumLanguage";
  const CLIENT_DAILY_KEY = "bc_ai_daily";
  const CLIENT_DAILY_MAX = 40;

  let langOverride = null;

  function getLang() {
    if (langOverride && ["en", "ru", "ka"].includes(langOverride)) return langOverride;
    const l = localStorage.getItem(LANG_KEY) || localStorage.getItem("language") || "en";
    return ["en", "ru", "ka"].includes(l) ? l : "en";
  }

  const FALLBACK = {
    en: {
      chatTitle: "BimmerCodes Diagnostic AI",
      chatStatus: "BMW & MINI Fault Analysis · EN / RU / KA",
      chatFabLabel: "AI Tech",
      chatPlaceholder: "Enter fault codes (118001, 2A82, P0171) or symptoms…",
      chatWelcome:
        "Specify your BMW chassis, engine, and stored fault codes or symptoms. I will outline likely root causes, sensor checks, and repair priorities.",
      chatSend: "Send",
      chatClose: "Close assistant",
      chatClear: "Reset session",
      chatOpenLabel: "Open AI Diagnostic Assistant",
      chatThinking: "Analyzing fault telemetry…",
      chatError: "Diagnostic assistant is temporarily unreachable. Please retry shortly.",
      chatLimitReached: "Daily diagnostic message quota reached. Resets tomorrow.",
      chatLimitHint: "Daily diagnostic queries remaining: {n}",
      chatLimitModalTitle: "Daily AI Diagnostic Quota Reached",
      chatLimitModalBody:
        "You have used today's free AI diagnostic allowance. Post your fault codes and freeze-frame details in the Technical Forum for community specialist input.",
      chatLimitModalForumBtn: "Post in Technical Forum",
      chatLimitModalLaterBtn: "Close",
      ctxSetBtn: "+ Set Vehicle / DTC Context",
      ctxEditBtn: "Edit",
      ctxClearBtn: "Clear",
      ctxChassisPh: "Model / Chassis (e.g. F30 335i)",
      ctxEnginePh: "Engine (e.g. N55)",
      ctxCodePh: "DTC (e.g. 118001)",
      ctxSaveBtn: "Apply Context",
      startersLabel: "Diagnostic starters",
      starter1Label: "118001 + 140010 · Lean & cold misfire",
      starter1Prompt: "BMW F30 with 118001 (mixture too lean) and 140010 (misfire) on cold start. Give me a step-by-step check order.",
      starter2Label: "2A82 · VANOS intake jamming",
      starter2Prompt: "BMW N52 stored code 2A82 VANOS intake mechanical jamming. What checks separate solenoid failure from cam bearing ledge wear?",
      starter3Label: "30FF · Turbo underboost under load",
      starter3Prompt: "BMW N54/N55 throws 30FF charge-air pressure too low under full load. How do I isolate boost leaks vs wastegate/solenoid issues?",
      starter4Label: "2DED / A0B4 · Power & starter faults",
      starter4Prompt: "BMW E90 has parasitic drain 2DED or no-crank A0B4. How should I test IBS, ground strap, and starter solenoid?",
    },
    ru: {
      chatTitle: "AI-диагност BimmerCodes",
      chatStatus: "Анализ неисправностей BMW и MINI · RU / EN / KA",
      chatFabLabel: "AI Диагност",
      chatPlaceholder: "Введите коды (118001, 2A82, P0171) или симптомы…",
      chatWelcome:
        "Укажите кузов, двигатель BMW и коды ошибок или симптомы. Я предложу порядок проверок, типовые причины и приоритет ремонта.",
      chatSend: "Отправить",
      chatClose: "Закрыть",
      chatClear: "Очистить диалог",
      chatOpenLabel: "Открыть AI-диагноста",
      chatThinking: "Анализ диагностических данных…",
      chatError: "Не удалось связаться с AI-диагностом. Повторите попытку через минуту.",
      chatLimitReached: "Дневной лимит запросов исчерпан. Обновится завтра.",
      chatLimitHint: "Осталось запросов на сегодня: {n}",
      chatLimitModalTitle: "Дневной лимит AI-диагноста исчерпан",
      chatLimitModalBody:
        "Бесплатные запросы на сегодня закончились. Создайте тему на техническом форуме — владельцы и мастера помогут разобрать коды и симптомы.",
      chatLimitModalForumBtn: "Задать вопрос на форуме",
      chatLimitModalLaterBtn: "Закрыть",
      ctxSetBtn: "+ Указать авто / код DTC",
      ctxEditBtn: "Изм.",
      ctxClearBtn: "Сброс",
      ctxChassisPh: "Кузов / модель (напр. F30 335i)",
      ctxEnginePh: "Двигатель (напр. N55)",
      ctxCodePh: "Код DTC (напр. 118001)",
      ctxSaveBtn: "Применить",
      startersLabel: "Быстрые сценарии",
      starter1Label: "118001 + 140010 · Бедная смесь и пропуски",
      starter1Prompt: "BMW F30: ошибки 118001 (бедная смесь) и 140010 (пропуски зажигания) на холодном пуске. Какой порядок диагностики?",
      starter2Label: "2A82 · Заедание впускного VANOS",
      starter2Prompt: "Двигатель BMW N52, код 2A82 по впускному VANOS. Как отличить неисправность клапана от износа постели распредвала?",
      starter3Label: "30FF · Недодув турбины под нагрузкой",
      starter3Prompt: "BMW N54/N55 выдаёт ошибку 30FF при разгоне. Как пошагово проверить вакуумные трубки, преобразователи давления и вестгейты?",
      starter4Label: "2DED / A0B4 · Ток покоя и стартер",
      starter4Prompt: "BMW E90: ошибка 2DED по току покоя или A0B4 (нет прокрутки стартера). Как проверить датчик IBS, массу двигателя и втягивающее?",
    },
    ka: {
      chatTitle: "BimmerCodes AI დიაგნოსტი",
      chatStatus: "BMW და MINI კოდების ანალიზი · KA / EN / RU",
      chatFabLabel: "AI დიაგნოსტი",
      chatPlaceholder: "შეიყვანეთ კოდი (118001, 2A82, P0171) ან სიმპტომი…",
      chatWelcome:
        "მიუთითეთ BMW-ს ძარა, ძრავა და შეცდომის კოდები ან სიმპტომები. შემოგთავაზებთ შემოწმების თანმიმდევრობასა და სავარაუდო მიზეზებს.",
      chatSend: "გაგზავნა",
      chatClose: "დახურვა",
      chatClear: "გასუფთავება",
      chatOpenLabel: "AI დიაგნოსტიკური ასისტენტის გახსნა",
      chatThinking: "მიმდინარეობს მონაცემების ანალიზი…",
      chatError: "ასისტენტთან კავშირი დროებით შეფერხდა. სცადეთ მოგვიანებით.",
      chatLimitReached: "დღიური უფასო ლიმიტი ამოიწურა. განახლდება ხვალ.",
      chatLimitHint: "დღეს დარჩენილი მოთხოვნები: {n}",
      chatLimitModalTitle: "AI დიაგნოსტიკის დღიური ლიმიტი ამოიწურა",
      chatLimitModalBody:
        "დღევანდელი უფასო ლიმიტი ამოწურულია. გახსენით თემა ტექნიკურ ფორუმზე, სადაც სპეციალისტები და მფლობელები დაგეხმარებიან პრობლემის მოგვარებაში.",
      chatLimitModalForumBtn: "ფორუმზე კითხვის დასმა",
      chatLimitModalLaterBtn: "დახურვა",
      ctxSetBtn: "+ ავტომობილის / DTC კონტექსტი",
      ctxEditBtn: "შეცვლა",
      ctxClearBtn: "წაშლა",
      ctxChassisPh: "ძარა / მოდელი (მაგ. F30 335i)",
      ctxEnginePh: "ძრავა (მაგ. N55)",
      ctxCodePh: "კოდი (მაგ. 118001)",
      ctxSaveBtn: "შენახვა",
      startersLabel: "სწრაფი დიაგნოსტიკა",
      starter1Label: "118001 + 140010 · ღარიბი ნარევი და მისფაიერი",
      starter1Prompt: "BMW F30-ზე ფიქსირდება 118001 და 140010 ცივ დაქოქვაზე. რა თანმიმდევრობით შევამოწმო?",
      starter2Label: "2A82 · შემშვები VANOS-ის გაჭედვა",
      starter2Prompt: "BMW N52 ძრავზე ამოაგდო 2A82 (VANOS intake). როგორ გავმიჯნო სოლენოიდის პრობლემა გამანაწილებელი ლილვის ცვეთისგან?",
      starter3Label: "30FF · დაბალი ბუსტი დატვირთვაზე",
      starter3Prompt: "BMW N54/N55 აგდებს 30FF კოდს აჩქარებისას. როგორ შევამოწმო ჰერმეტულობა, ვაკუუმის მილები და ვესტგეითი?",
      starter4Label: "2DED / A0B4 · დენის გაჟონვა და სტარტერი",
      starter4Prompt: "BMW E90-ზე ფიქსირდება 2DED ან A0B4 (სტარტერი არ ატრიალებს). როგორ შევამოწმო IBS სენსორი, ძრავის მასა და სტარტერი?",
    },
  };

  const FORUM_NEW_TOPIC_URL = "/forum.html?new=1";

  function t(key) {
    const lang = getLang();
    const T = window.APP_TRANSLATIONS || {};
    return (
      (FALLBACK[lang] && FALLBACK[lang][key]) ||
      (T[lang] && T[lang][key]) ||
      FALLBACK.en[key] ||
      key
    );
  }

  function escHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Formats assistant plain/markdown text into structured diagnostic blocks
   * while strictly escaping all untrusted HTML first.
   */
  function formatAssistantHtml(rawText) {
    const safe = escHtml(rawText || "");
    const lines = safe.split(/\r?\n/);
    const out = [];
    let inList = null; // 'ul' | 'ol'

    const inlineFmt = (line) => {
      return line
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, '<code class="bc-ai-inline-code">$1</code>')
        .replace(
          /\b(P[0-3][0-9A-F]{3}|[1-9A-F][0-9A-F]{3}(?:[0-9A-F]{2})?)\b/g,
          (match) => {
            // Avoid turning 4-digit model years (1985-2029) into DTC badges
            if (/^(19[89]\d|20[0-2]\d)$/.test(match)) return match;
            return `<button type="button" class="badge-code-link bc-ai-dtc-ref" data-code="${match}">${match}</button>`;
          }
        );
    };

    const closeList = () => {
      if (inList) {
        out.push(`</${inList}>`);
        inList = null;
      }
    };

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        closeList();
        continue;
      }

      const hMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
      if (hMatch) {
        closeList();
        out.push(`<div class="bc-ai-msg-heading">${inlineFmt(hMatch[1])}</div>`);
        continue;
      }

      const olMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
      if (olMatch) {
        if (inList !== "ol") {
          closeList();
          out.push('<ol class="bc-ai-list bc-ai-list--steps">');
          inList = "ol";
        }
        out.push(`<li>${inlineFmt(olMatch[2])}</li>`);
        continue;
      }

      const ulMatch = trimmed.match(/^[-*•]\s+(.+)$/);
      if (ulMatch) {
        if (inList !== "ul") {
          closeList();
          out.push('<ul class="bc-ai-list">');
          inList = "ul";
        }
        out.push(`<li>${inlineFmt(ulMatch[1])}</li>`);
        continue;
      }

      closeList();
      out.push(`<p class="bc-ai-para">${inlineFmt(trimmed)}</p>`);
    }

    closeList();
    return out.join("") || `<p class="bc-ai-para">${safe}</p>`;
  }

  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(messages) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch (_) {}
  }

  function readActiveContext() {
    if (window.currentCarContext && window.currentCarContext.model) {
      return window.currentCarContext;
    }
    try {
      const saved = JSON.parse(sessionStorage.getItem(CTX_STORAGE_KEY) || "null");
      if (saved && (saved.model || saved.engine || saved.dtc)) return saved;
    } catch (_) {}

    try {
      const u = JSON.parse(localStorage.getItem("user_data") || "null");
      if (u && (u.car_model || u.bmw_body || u.bmw_engine)) {
        return {
          model: [u.bmw_year, u.car_model, u.bmw_body].filter(Boolean).join(" "),
          engine: u.bmw_engine || "",
          dtc: "",
        };
      }
    } catch (_) {}
    return null;
  }

  function formatContextSummary(ctx) {
    if (!ctx) return "";
    return [ctx.year, ctx.model, ctx.chassis, ctx.engine, ctx.dtc ? `DTC ${ctx.dtc}` : ""]
      .filter((v) => v && v !== "—")
      .join(" · ");
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function readClientUsage() {
    try {
      const raw = localStorage.getItem(CLIENT_DAILY_KEY);
      const today = todayKey();
      if (!raw) return { date: today, count: 0 };
      const data = JSON.parse(raw);
      if (data.date !== today) return { date: today, count: 0 };
      return { date: today, count: Math.max(0, Number(data.count) || 0) };
    } catch {
      return { date: todayKey(), count: 0 };
    }
  }

  function writeClientUsage(count) {
    try {
      localStorage.setItem(
        CLIENT_DAILY_KEY,
        JSON.stringify({ date: todayKey(), count: Math.max(0, count) })
      );
    } catch (_) {}
  }

  function clientDailyRemaining() {
    const data = readClientUsage();
    return Math.max(0, CLIENT_DAILY_MAX - data.count);
  }

  function bumpClientDaily() {
    const data = readClientUsage();
    writeClientUsage(data.count + 1);
  }

  function syncClientUsageFromServer(used) {
    if (typeof used !== "number" || used < 0) return;
    writeClientUsage(used);
  }

  let ui = null;
  let limitModal = null;
  let history = [];
  let busy = false;

  function reconcileClientUsageFromHistory() {
    const userMsgs = history.filter((m) => m.role === "user").length;
    const data = readClientUsage();
    writeClientUsage(Math.max(data.count, userMsgs));
  }

  function isDailyLimitExhausted() {
    return clientDailyRemaining() <= 0;
  }

  function setChatInputLocked(locked) {
    if (!ui) return;
    ui.input.disabled = locked;
    ui.sendBtn.disabled = locked || busy;
    ui.sendBtn.classList.toggle("bc-ai-send--locked", locked);
  }

  function mountLimitModal() {
    if (document.getElementById("bc-ai-limit-modal")) return;

    const el = document.createElement("div");
    el.id = "bc-ai-limit-modal";
    el.className = "bc-ai-limit-modal";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "bc-ai-limit-modal-title");
    el.innerHTML = `
      <div class="bc-ai-limit-modal__backdrop" data-bc-ai-limit-dismiss></div>
      <div class="bc-ai-limit-modal__card">
        <button type="button" class="bc-ai-limit-modal__close" data-bc-ai-limit-dismiss aria-label="${escHtml(t("chatClose"))}">
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
        <div class="bc-ai-limit-modal__icon" aria-hidden="true">
          <i class="fas fa-comments"></i>
        </div>
        <h2 class="bc-ai-limit-modal__title" id="bc-ai-limit-modal-title"></h2>
        <p class="bc-ai-limit-modal__body" id="bc-ai-limit-modal-body"></p>
        <div class="bc-ai-limit-modal__actions">
          <a class="bc-ai-limit-modal__cta" id="bc-ai-limit-forum-link" href="${FORUM_NEW_TOPIC_URL}">
            <i class="fas fa-comments" aria-hidden="true"></i>
            <span id="bc-ai-limit-forum-label"></span>
          </a>
          <button type="button" class="bc-ai-limit-modal__ghost" id="bc-ai-limit-later"></button>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    limitModal = {
      root: el,
      title: document.getElementById("bc-ai-limit-modal-title"),
      body: document.getElementById("bc-ai-limit-modal-body"),
      forumLabel: document.getElementById("bc-ai-limit-forum-label"),
      laterBtn: document.getElementById("bc-ai-limit-later"),
      forumLink: document.getElementById("bc-ai-limit-forum-link"),
    };

    el.querySelectorAll("[data-bc-ai-limit-dismiss]").forEach((node) => {
      node.addEventListener("click", hideLimitModal);
    });
    limitModal.laterBtn.addEventListener("click", hideLimitModal);

    limitModal.forumLink.addEventListener("click", (e) => {
      if (window.location.pathname.replace(/\/$/, "").endsWith("/forum.html")) {
        e.preventDefault();
        hideLimitModal();
        if (typeof window.openNewTopicModal === "function") {
          window.openNewTopicModal();
        }
      }
    });

    window.hideBcAiLimitModal = hideLimitModal;
  }

  function applyLimitModalLocale() {
    if (!limitModal) return;
    limitModal.title.textContent = t("chatLimitModalTitle");
    limitModal.body.textContent = t("chatLimitModalBody");
    limitModal.forumLabel.textContent = t("chatLimitModalForumBtn");
    limitModal.laterBtn.textContent = t("chatLimitModalLaterBtn");
  }

  function showLimitModal() {
    if (!limitModal) mountLimitModal();
    applyLimitModalLocale();
    limitModal.root.classList.add("is-visible");
    document.body.style.overflow = "hidden";
    limitModal.laterBtn.focus();
  }

  function hideLimitModal() {
    if (!limitModal) return;
    limitModal.root.classList.remove("is-visible");
    document.body.style.overflow = "";
  }

  function handleDailyLimitHit() {
    setChatInputLocked(true);
    updateLimitLabel(0);
    appendBot(t("chatLimitReached"));
    showLimitModal();
  }

  function renderContextBar() {
    if (!ui || !ui.ctxBar) return;
    const ctx = readActiveContext();
    const summary = formatContextSummary(ctx);

    if (summary) {
      ui.ctxBar.innerHTML = `
        <div class="bc-ai-ctx-pill">
          <i class="fas fa-car-side" aria-hidden="true"></i>
          <span class="bc-ai-ctx-pill__text">${escHtml(summary)}</span>
          <button type="button" class="bc-ai-ctx-btn" data-ai-ctx-edit>${escHtml(t("ctxEditBtn"))}</button>
          <button type="button" class="bc-ai-ctx-btn" data-ai-ctx-clear>${escHtml(t("ctxClearBtn"))}</button>
        </div>
      `;
    } else {
      ui.ctxBar.innerHTML = `
        <button type="button" class="bc-ai-ctx-trigger" data-ai-ctx-edit>
          <i class="fas fa-sliders" aria-hidden="true"></i>
          <span>${escHtml(t("ctxSetBtn"))}</span>
        </button>
      `;
    }
  }

  function toggleContextEditor(show) {
    if (!ui || !ui.ctxForm) return;
    const open = typeof show === "boolean" ? show : ui.ctxForm.classList.contains("hidden");
    ui.ctxForm.classList.toggle("hidden", !open);
    if (open) {
      const ctx = readActiveContext() || {};
      ui.ctxModelInput.value = ctx.model || "";
      ui.ctxEngineInput.value = ctx.engine || "";
      ui.ctxCodeInput.value = ctx.dtc || "";
      ui.ctxModelInput.focus();
    }
  }

  function mountWidget() {
    if (document.getElementById("bc-ai-root")) return;

    const root = document.createElement("div");
    root.id = "bc-ai-root";
    root.innerHTML = `
      <button type="button" class="bc-ai-fab" id="bc-ai-fab" aria-label="${escHtml(t("chatOpenLabel"))}">
        <span class="bc-ai-fab__dot" aria-hidden="true"></span>
        <i class="fas fa-microchip" aria-hidden="true"></i>
        <span class="bc-ai-fab__label" id="bc-ai-fab-label">${escHtml(t("chatFabLabel"))}</span>
      </button>

      <div class="bc-ai-panel" id="bc-ai-panel" role="dialog" aria-labelledby="bc-ai-title" aria-hidden="true">
        <div class="bc-ai-panel__head">
          <div class="bc-ai-panel__brand">
            <span class="bc-ai-panel__badge"><i class="fas fa-microchip" aria-hidden="true"></i></span>
            <div>
              <p class="bc-ai-panel__title" id="bc-ai-title">${escHtml(t("chatTitle"))}</p>
              <p class="bc-ai-panel__status" id="bc-ai-status">${escHtml(t("chatStatus"))}</p>
            </div>
          </div>
          <div class="bc-ai-panel__head-actions">
            <button type="button" class="bc-ai-panel__icon-btn" id="bc-ai-clear" title="${escHtml(t("chatClear"))}" aria-label="${escHtml(t("chatClear"))}">
              <i class="fas fa-rotate-left" aria-hidden="true"></i>
            </button>
            <button type="button" class="bc-ai-panel__close" id="bc-ai-close" aria-label="${escHtml(t("chatClose"))}">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div class="bc-ai-ctx-bar" id="bc-ai-ctx-bar"></div>

        <form class="bc-ai-ctx-editor hidden" id="bc-ai-ctx-form">
          <div class="bc-ai-ctx-editor__grid">
            <input type="text" id="bc-ai-ctx-model" maxlength="40" placeholder="${escHtml(t("ctxChassisPh"))}" />
            <input type="text" id="bc-ai-ctx-engine" maxlength="24" placeholder="${escHtml(t("ctxEnginePh"))}" />
            <input type="text" id="bc-ai-ctx-code" maxlength="16" placeholder="${escHtml(t("ctxCodePh"))}" />
          </div>
          <button type="submit" class="bc-ai-ctx-save" id="bc-ai-ctx-save">${escHtml(t("ctxSaveBtn"))}</button>
        </form>

        <div class="bc-ai-messages" id="bc-ai-messages"></div>

        <div class="bc-ai-footer">
          <p class="bc-ai-limit" id="bc-ai-limit"></p>
          <form class="bc-ai-form" id="bc-ai-form">
            <textarea class="bc-ai-input" id="bc-ai-input" rows="1" maxlength="2000"
              placeholder="${escHtml(t("chatPlaceholder"))}"></textarea>
            <button type="submit" class="bc-ai-send" id="bc-ai-send" aria-label="${escHtml(t("chatSend"))}">
              <i class="fas fa-arrow-up" aria-hidden="true"></i>
            </button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    history = loadHistory();
    reconcileClientUsageFromHistory();

    ui = {
      fab: document.getElementById("bc-ai-fab"),
      fabLabel: document.getElementById("bc-ai-fab-label"),
      panel: document.getElementById("bc-ai-panel"),
      closeBtn: document.getElementById("bc-ai-close"),
      clearBtn: document.getElementById("bc-ai-clear"),
      title: document.getElementById("bc-ai-title"),
      status: document.getElementById("bc-ai-status"),
      ctxBar: document.getElementById("bc-ai-ctx-bar"),
      ctxForm: document.getElementById("bc-ai-ctx-form"),
      ctxModelInput: document.getElementById("bc-ai-ctx-model"),
      ctxEngineInput: document.getElementById("bc-ai-ctx-engine"),
      ctxCodeInput: document.getElementById("bc-ai-ctx-code"),
      ctxSaveBtn: document.getElementById("bc-ai-ctx-save"),
      messagesEl: document.getElementById("bc-ai-messages"),
      form: document.getElementById("bc-ai-form"),
      input: document.getElementById("bc-ai-input"),
      sendBtn: document.getElementById("bc-ai-send"),
      limitEl: document.getElementById("bc-ai-limit"),
    };

    ui.fab.addEventListener("click", () => setOpen(!ui.panel.classList.contains("is-open")));
    ui.closeBtn.addEventListener("click", () => setOpen(false));

    ui.clearBtn.addEventListener("click", () => {
      history = [];
      saveHistory([]);
      renderMessages();
    });

    ui.ctxBar.addEventListener("click", (e) => {
      if (e.target.closest("[data-ai-ctx-edit]")) {
        toggleContextEditor();
      } else if (e.target.closest("[data-ai-ctx-clear]")) {
        window.currentCarContext = null;
        try {
          sessionStorage.removeItem(CTX_STORAGE_KEY);
        } catch (_) {}
        toggleContextEditor(false);
        renderContextBar();
      }
    });

    ui.ctxForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const ctx = {
        model: ui.ctxModelInput.value.trim(),
        engine: ui.ctxEngineInput.value.trim(),
        dtc: ui.ctxCodeInput.value.trim().toUpperCase(),
      };
      if (ctx.model || ctx.engine || ctx.dtc) {
        window.currentCarContext = ctx;
        try {
          sessionStorage.setItem(CTX_STORAGE_KEY, JSON.stringify(ctx));
        } catch (_) {}
      }
      toggleContextEditor(false);
      renderContextBar();
    });

    ui.messagesEl.addEventListener("click", (e) => {
      const starter = e.target.closest("[data-ai-starter]");
      if (starter) {
        const prompt = starter.getAttribute("data-ai-starter") || "";
        if (prompt) {
          ui.input.value = prompt;
          sendMessage();
        }
        return;
      }

      const codeBtn = e.target.closest(".bc-ai-dtc-ref");
      if (codeBtn) {
        const code = codeBtn.getAttribute("data-code");
        if (code) {
          if (typeof window.openCodeModal === "function") {
            window.openCodeModal(code);
          } else {
            window.location.href = `/?code=${encodeURIComponent(code)}`;
          }
        }
      }
    });

    ui.form.addEventListener("submit", (e) => {
      e.preventDefault();
      sendMessage();
    });

    ui.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    ui.input.addEventListener("input", () => {
      ui.input.style.height = "auto";
      ui.input.style.height = Math.min(ui.input.scrollHeight, 112) + "px";
    });

    mountLimitModal();

    window.updateChatContext = () => {
      applyChatLocale();
      renderContextBar();
    };

    window.openBcAiAssistant = (prefillPrompt = "") => {
      setOpen(true);
      if (prefillPrompt) {
        ui.input.value = prefillPrompt;
        ui.input.style.height = "auto";
        ui.input.style.height = Math.min(ui.input.scrollHeight, 112) + "px";
        ui.input.focus();
      }
    };

    window.addEventListener("languageChanged", (e) => {
      applyChatLocale(e?.detail?.lang);
    });
    window.addEventListener("storage", (e) => {
      if (e.key === LANG_KEY || e.key === "language") applyChatLocale();
    });

    applyChatLocale();
    renderContextBar();
    renderMessages();
    updateLimitLabel();
    refreshUsageFromServer();
    if (isDailyLimitExhausted()) setChatInputLocked(true);
  }

  function applyChatLocale(forcedLang) {
    if (!ui) return;
    langOverride = forcedLang && ["en", "ru", "ka"].includes(forcedLang) ? forcedLang : null;

    ui.title.textContent = t("chatTitle");
    ui.status.textContent = t("chatStatus");
    if (ui.fabLabel) ui.fabLabel.textContent = t("chatFabLabel");
    ui.input.placeholder = t("chatPlaceholder");
    ui.fab.setAttribute("aria-label", t("chatOpenLabel"));
    ui.closeBtn.setAttribute("aria-label", t("chatClose"));
    ui.clearBtn.setAttribute("title", t("chatClear"));
    ui.sendBtn.setAttribute("aria-label", t("chatSend"));
    ui.ctxModelInput.placeholder = t("ctxChassisPh");
    ui.ctxEngineInput.placeholder = t("ctxEnginePh");
    ui.ctxCodeInput.placeholder = t("ctxCodePh");
    ui.ctxSaveBtn.textContent = t("ctxSaveBtn");

    applyLimitModalLocale();
    renderContextBar();
    updateLimitLabel();
    if (!history.length) renderMessages();

    langOverride = null;
  }

  function updateLimitLabel(remaining) {
    if (!ui) return;
    const n =
      typeof remaining === "number" && remaining >= 0
        ? remaining
        : clientDailyRemaining();
    ui.limitEl.textContent = t("chatLimitHint").replace("{n}", String(n));
    if (n <= 0) setChatInputLocked(true);
  }

  async function refreshUsageFromServer() {
    try {
      const res = await fetch("/api/ai/chat", { method: "GET" });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.used === "number") syncClientUsageFromServer(data.used);
      updateLimitLabel(
        typeof data.remaining === "number" ? data.remaining : clientDailyRemaining()
      );
    } catch (_) {
      updateLimitLabel();
    }
  }

  function renderMessages() {
    if (!ui) return;
    ui.messagesEl.innerHTML = "";
    if (!history.length) {
      const welcomeWrap = document.createElement("div");
      welcomeWrap.className = "bc-ai-welcome-block";
      welcomeWrap.innerHTML = `
        <div class="bc-ai-msg bc-ai-msg--bot" data-bc-ai-welcome="1">
          <p class="bc-ai-para">${escHtml(t("chatWelcome"))}</p>
        </div>
        <div class="bc-ai-starters">
          <span class="bc-ai-starters__label">${escHtml(t("startersLabel"))}</span>
          <button type="button" class="bc-ai-starter-btn" data-ai-starter="${escHtml(t("starter1Prompt"))}">
            <span>${escHtml(t("starter1Label"))}</span>
            <i class="fas fa-arrow-right" aria-hidden="true"></i>
          </button>
          <button type="button" class="bc-ai-starter-btn" data-ai-starter="${escHtml(t("starter2Prompt"))}">
            <span>${escHtml(t("starter2Label"))}</span>
            <i class="fas fa-arrow-right" aria-hidden="true"></i>
          </button>
          <button type="button" class="bc-ai-starter-btn" data-ai-starter="${escHtml(t("starter3Prompt"))}">
            <span>${escHtml(t("starter3Label"))}</span>
            <i class="fas fa-arrow-right" aria-hidden="true"></i>
          </button>
          <button type="button" class="bc-ai-starter-btn" data-ai-starter="${escHtml(t("starter4Prompt"))}">
            <span>${escHtml(t("starter4Label"))}</span>
            <i class="fas fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      `;
      ui.messagesEl.appendChild(welcomeWrap);
    } else {
      for (const m of history) {
        const el = document.createElement("div");
        const isUser = m.role === "user";
        el.className = "bc-ai-msg bc-ai-msg--" + (isUser ? "user" : "bot");
        if (isUser) {
          el.textContent = m.displayContent || m.content;
        } else {
          el.innerHTML = formatAssistantHtml(m.content);
        }
        ui.messagesEl.appendChild(el);
      }
    }
    ui.messagesEl.scrollTop = ui.messagesEl.scrollHeight;
  }

  function setOpen(open) {
    ui.panel.classList.toggle("is-open", open);
    ui.panel.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("bc-ai-chat-open", open);
    if (open) {
      applyChatLocale();
      renderContextBar();
      renderMessages();
      refreshUsageFromServer();
      if (isDailyLimitExhausted()) {
        setChatInputLocked(true);
      } else {
        setChatInputLocked(false);
        ui.input.focus();
      }
    }
  }

  async function sendMessage() {
    if (!ui || busy) return;
    const rawText = ui.input.value.trim();
    if (!rawText) return;

    if (isDailyLimitExhausted()) {
      handleDailyLimitHit();
      return;
    }

    busy = true;
    ui.sendBtn.disabled = true;
    ui.input.value = "";
    ui.input.style.height = "auto";

    // Remove starter prompts if present
    ui.messagesEl.querySelector(".bc-ai-starters")?.remove();

    const ctx = readActiveContext();
    const ctxSummary = formatContextSummary(ctx);
    const apiContent =
      ctxSummary && !rawText.includes(ctxSummary)
        ? `[Vehicle Context: ${ctxSummary}]\n${rawText}`
        : rawText;

    history.push({ role: "user", content: apiContent, displayContent: rawText });
    appendUser(rawText);
    const typing = appendBot(t("chatThinking"), true);

    try {
      const apiMessages = history.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, lang: getLang() }),
      });
      const data = await res.json().catch(() => ({}));

      typing.remove();

      if (!res.ok) {
        if (data.error === "daily_limit" || res.status === 429) {
          history.pop();
          handleDailyLimitHit();
        } else {
          const msg = data.message || t("chatError");
          appendBot(msg);
          history.pop();
        }
      } else {
        history.push({ role: "assistant", content: data.reply });
        appendBot(data.reply);
        if (typeof data.used === "number") {
          syncClientUsageFromServer(data.used);
        } else {
          bumpClientDaily();
        }
        const left =
          typeof data.remaining === "number" ? data.remaining : clientDailyRemaining();
        updateLimitLabel(left);
        saveHistory(history);
        if (left <= 0) {
          showLimitModal();
        }
      }
    } catch {
      typing.remove();
      appendBot(t("chatError"));
      history.pop();
    } finally {
      busy = false;
      if (!isDailyLimitExhausted()) {
        setChatInputLocked(false);
      }
    }
  }

  function appendUser(text) {
    const el = document.createElement("div");
    el.className = "bc-ai-msg bc-ai-msg--user";
    el.textContent = text;
    ui.messagesEl.appendChild(el);
    ui.messagesEl.scrollTop = ui.messagesEl.scrollHeight;
  }

  function appendBot(text, typing) {
    const el = document.createElement("div");
    el.className = "bc-ai-msg bc-ai-msg--bot" + (typing ? " bc-ai-msg--typing" : "");
    if (typing) {
      el.innerHTML = `<span class="bc-ai-typing-dot"></span><span>${escHtml(text)}</span>`;
    } else {
      el.innerHTML = formatAssistantHtml(text);
    }
    ui.messagesEl.appendChild(el);
    ui.messagesEl.scrollTop = ui.messagesEl.scrollHeight;
    return el;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountWidget);
  } else {
    mountWidget();
  }
})();
