// js/index-premium.js — Homepage diagnostic console, quick-lookup ledger, and keyboard interactions.
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------- Mobile navigation drawer ---------------- */
  const burger = $("#bc3-burger");
  const sheet = $("#bc3-sheet");
  function openSheet() {
    if (!sheet) return;
    sheet.classList.add("open");
    sheet.dataset.boundShared = "1";
    burger?.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeSheet() {
    if (!sheet) return;
    sheet.classList.remove("open");
    burger?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  if (burger && sheet) {
    sheet.dataset.boundShared = "1";
    burger.addEventListener("click", openSheet);
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet || e.target.closest("[data-bc3-sheet-close]")) {
        closeSheet();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sheet.classList.contains("open")) closeSheet();
    });
  }

  /* ---------------- Search input & clear control ---------------- */
  const searchInput = $("#search-input");
  const clearBtn = $("#search-clear-btn");

  function syncClearButton() {
    if (!searchInput || !clearBtn) return;
    clearBtn.classList.toggle("hidden", !searchInput.value.trim());
  }

  if (searchInput) {
    searchInput.addEventListener("input", syncClearButton);
    syncClearButton();
  }

  if (clearBtn && searchInput) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      syncClearButton();
      if (typeof window.hideDetail === "function" && document.body.classList.contains("viewing-detail")) {
        window.hideDetail();
      }
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.focus();
    });
  }

  /* ---------------- Delegated [data-bc3-search] & [data-open-code] ---------------- */
  document.addEventListener("click", (e) => {
    const openCodeTrigger = e.target.closest("[data-open-code]");
    if (openCodeTrigger) {
      const codeStr = openCodeTrigger.getAttribute("data-open-code");
      if (codeStr && typeof window.openCodeModal === "function") {
        e.preventDefault();
        window.openCodeModal(codeStr);
        return;
      }
    }

    const searchTrigger = e.target.closest("[data-bc3-search]");
    if (searchTrigger && searchInput) {
      e.preventDefault();
      const q = searchTrigger.getAttribute("data-bc3-search") || "";
      if (typeof window.hideDetail === "function" && document.body.classList.contains("viewing-detail")) {
        window.hideDetail();
      }
      searchInput.value = q;
      syncClearButton();
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.focus({ preventScroll: true });
      const target = document.getElementById("search");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });

  /* ---------------- Inline Homepage VIN Quick-Jump ---------------- */
  const homeVinForm = $("#home-vin-form");
  if (homeVinForm) {
    homeVinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("#home-vin-input");
      const raw = (input?.value || "").trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
      if (raw) {
        window.location.href = `/vin.html?vin=${encodeURIComponent(raw)}`;
      } else {
        window.location.href = "/vin.html";
      }
    });
  }

  /* ---------------- ⌘K / Ctrl+K / Slash focus search ---------------- */
  document.addEventListener("keydown", (e) => {
    const isMod = e.metaKey || e.ctrlKey;
    if (isMod && (e.key === "k" || e.key === "K")) {
      if (!searchInput) return;
      e.preventDefault();
      if (typeof window.hideDetail === "function" && document.body.classList.contains("viewing-detail")) {
        window.hideDetail();
      }
      searchInput.focus({ preventScroll: false });
      searchInput.select();
    }
    if (e.key === "/" && document.activeElement === document.body) {
      if (!searchInput) return;
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ---------------- FAQ: single open item ---------------- */
  const faqItems = $$(".bc-faq-item, .bc3-faq__item");
  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (item.open) {
        faqItems.forEach((other) => {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  /* ---------------- Scroll-into-view: code detail ---------------- */
  const detailEl = $("#code-detail");
  if (detailEl && "MutationObserver" in window) {
    const setViewingDetail = (on) => {
      document.body.classList.toggle("viewing-detail", on);
    };
    const moDetail = new MutationObserver(() => {
      const visible = !detailEl.classList.contains("hidden");
      setViewingDetail(visible);
      if (visible) {
        requestAnimationFrame(() => {
          const headerH = document.querySelector("header")?.offsetHeight || 64;
          const top = detailEl.getBoundingClientRect().top + window.scrollY - (headerH + 12);
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        });
      }
    });
    moDetail.observe(detailEl, { attributes: true, attributeFilter: ["class"] });
    setViewingDetail(!detailEl.classList.contains("hidden"));
  }

  /* ---------------- Search form submit opens exact match if present ---------------- */
  const heroSearchForm = $("#hero-search-form");
  if (heroSearchForm && searchInput) {
    heroSearchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const term = (searchInput.value || "").trim().toUpperCase();
      if (!term) {
        searchInput.focus();
        return;
      }
      const lookup = window.__bmwCodeLookup;
      const exact = lookup ? lookup.byCode.get(term) || lookup.byPCode.get(term) : null;
      if (exact && typeof window.displayCodeDetail === "function") {
        window.displayCodeDetail(exact);
      } else if (typeof window.handleSearch === "function") {
        window.handleSearch();
      }
    });
  }
})();
