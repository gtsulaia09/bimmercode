/**
 * i18n-init.js — Lightweight language initializer for static/utility pages
 * (all, parts, contact, privacy, terms). Reads forumLanguage from localStorage
 * and applies translations from APP_TRANSLATIONS.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "forumLanguage";
  const LANGS = ["en", "ru", "ka"];
  const LANG_LABELS = { en: "EN", ru: "RU", ka: "KA" };

  let currentLang = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("language") || "en";
  if (!LANGS.includes(currentLang)) currentLang = "en";

  function applyTranslations() {
    const T =
      (window.APP_TRANSLATIONS && window.APP_TRANSLATIONS[currentLang]) ||
      (window.APP_TRANSLATIONS && window.APP_TRANSLATIONS.en) ||
      {};

    document.documentElement.setAttribute("lang", currentLang);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (T[key] != null) el.textContent = T[key];
    });

    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (T[key] != null) el.innerHTML = T[key];
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (T[key] != null) el.placeholder = T[key];
    });

    var btn = document.getElementById("language-toggle");
    if (btn) {
      var span = btn.querySelector("span");
      if (span) span.textContent = LANG_LABELS[currentLang] || "EN";
    }

    document.querySelectorAll("[data-set-lang]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-set-lang") === currentLang);
    });
  }

  function setPageLanguage(lang) {
    if (!LANGS.includes(lang)) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, currentLang);
    localStorage.setItem("language", currentLang);
    applyTranslations();
    window.dispatchEvent(
      new CustomEvent("languageChanged", { detail: { lang: currentLang } })
    );
    if (typeof window.updateChatContext === "function") {
      window.updateChatContext();
    }
  }

  function toggleLanguage() {
    var idx = LANGS.indexOf(currentLang);
    setPageLanguage(LANGS[(idx + 1) % LANGS.length]);
  }

  window.togglePageLanguage = toggleLanguage;
  window.setPageLanguage = setPageLanguage;
  window.t = function (key) {
    const T =
      (window.APP_TRANSLATIONS && window.APP_TRANSLATIONS[currentLang]) ||
      (window.APP_TRANSLATIONS && window.APP_TRANSLATIONS.en) ||
      {};
    return T[key] || key;
  };

  var langBtn = document.getElementById("language-toggle");
  if (langBtn) {
    langBtn.addEventListener("click", toggleLanguage);
  }

  applyTranslations();
})();
