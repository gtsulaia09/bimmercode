/**
 * Parts Finder UI Component
 * Displays OEM & aftermarket parts mapped to BMW diagnostic codes with supplier links.
 */

class PartsFinderUI {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.currentLang = localStorage.getItem("forumLanguage") || localStorage.getItem("language") || "en";
  }

  esc(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async loadParts(errorCode, vin = null) {
    if (!this.container) return { hasParts: false };
    try {
      this.currentLang = localStorage.getItem("forumLanguage") || localStorage.getItem("language") || "en";
      this.showLoading();

      let url = `/api/parts?code=${encodeURIComponent(errorCode)}&lang=${encodeURIComponent(this.currentLang)}`;
      if (vin) url += `&vin=${encodeURIComponent(vin)}`;

      const response = await fetch(url);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        if (this.options.onEmptyFallback) {
          this.options.onEmptyFallback(errorCode);
        } else {
          this.container.innerHTML = "";
        }
        return { hasParts: false };
      }

      const data = await response.json();
      if (!response.ok) {
        if (this.options.onEmptyFallback) {
          this.options.onEmptyFallback(errorCode);
        } else {
          this.container.innerHTML = "";
        }
        return { hasParts: false };
      }

      if (Array.isArray(data.parts)) {
        data.parts = { primary: data.parts, secondary: [], optional: [] };
      }

      const hasParts =
        (data.parts?.primary?.length || 0) +
        (data.parts?.secondary?.length || 0) +
        (data.parts?.optional?.length || 0);

      if (!hasParts) {
        if (this.options.onEmptyFallback) {
          this.options.onEmptyFallback(errorCode);
        } else {
          this.container.innerHTML = "";
        }
        return { hasParts: false };
      }

      this.renderParts(data);
      return { hasParts: true, data };
    } catch (error) {
      console.warn("Parts Finder:", error);
      if (this.options.onEmptyFallback) {
        this.options.onEmptyFallback(errorCode);
      } else {
        this.container.innerHTML = "";
      }
      return { hasParts: false };
    }
  }

  renderParts(data) {
    const { parts, estimated_cost } = data;
    const minCost = Number(estimated_cost?.min || 0);
    const maxCost = Number(estimated_cost?.max || 0);

    let html = `
      <div class="parts-finder-container">
        <div class="parts-header">
          <h3><i class="fas fa-cogs" aria-hidden="true"></i> ${this.esc(this.t("needed_parts"))}</h3>
          ${maxCost > 0 ? `
            <div class="estimated-cost">
              <span>${this.esc(this.t("estimated_cost"))}:</span>
              <strong>$${minCost.toFixed(2)} – $${maxCost.toFixed(2)}</strong>
            </div>
          ` : ""}
        </div>
    `;

    if (parts.primary && parts.primary.length > 0) {
      html += `
        <div class="parts-section primary-parts">
          <h4><i class="fas fa-circle-exclamation" aria-hidden="true"></i> ${this.esc(this.t("required_parts"))}</h4>
          <div class="parts-grid-list">
            ${parts.primary.map((part) => this.renderPart(part)).join("")}
          </div>
        </div>
      `;
    }

    if (parts.secondary && parts.secondary.length > 0) {
      html += `
        <div class="parts-section secondary-parts">
          <h4><i class="fas fa-wrench" aria-hidden="true"></i> ${this.esc(this.t("recommended_parts"))}</h4>
          <div class="parts-grid-list">
            ${parts.secondary.map((part) => this.renderPart(part)).join("")}
          </div>
        </div>
      `;
    }

    if (parts.optional && parts.optional.length > 0) {
      html += `
        <div class="parts-section optional-parts">
          <h4><i class="fas fa-layer-group" aria-hidden="true"></i> ${this.esc(this.t("optional_parts"))}</h4>
          <div class="parts-grid-list">
            ${parts.optional.map((part) => this.renderPart(part)).join("")}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    this.container.innerHTML = html;

    this.bindCopyButtons();
    this.trackClicks();
  }

  renderPart(part) {
    const partName = part[`part_name_${this.currentLang}`] || part.part_name_en || part.part_name || "BMW Replacement Component";
    const isOriginal = Boolean(part.is_original ?? part.is_oem);
    const oemBadge = isOriginal
      ? `<span class="badge-oem"><i class="fas fa-shield-alt" aria-hidden="true"></i> ${this.esc(this.t("genuine_oem"))}</span>`
      : `<span class="badge-aftermarket"><i class="fas fa-cog" aria-hidden="true"></i> ${this.esc(this.t("aftermarket"))}</span>`;

    const rating = part.avg_rating
      ? `<div class="part-rating">${this.renderStars(Number(part.avg_rating))} (${Number(part.review_count || 0)})</div>`
      : "";

    const diffKey = String(part.installation_difficulty || part.difficulty || "").toLowerCase();
    const difficulty = diffKey
      ? `<span class="difficulty-badge difficulty-${this.esc(diffKey)}">
           <i class="fas fa-screwdriver-wrench" aria-hidden="true"></i> ${this.esc(this.t("difficulty_" + diffKey))}
         </span>`
      : "";

    const compatibilityText =
      part.compatibility_notes ||
      (Array.isArray(part.compatibility) && part.compatibility.length
        ? part.compatibility.map((c) => [c.series, c.model, c.engine].filter(Boolean).join(" ")).filter(Boolean).join(", ")
        : "");

    const compatibility = compatibilityText
      ? `<div class="compatibility-info">
           <i class="fas fa-check-circle" aria-hidden="true"></i>
           <span>${this.esc(compatibilityText)}</span>
         </div>`
      : "";

    const buyLinks = part.buy_links || part.links || [];
    const oemNum = part.oem_number || "—";
    const mfg = part.manufacturer || part.brand || "";
    const laborVal = part.estimated_labor_hours ? `${part.estimated_labor_hours}h` : (part.install_time || "");
    const priceMin = part.price_min != null ? Number(part.price_min) : null;
    const priceMax = part.price_max != null ? Number(part.price_max) : null;

    return `
      <div class="part-card" data-part-id="${this.esc(part.id)}">
        <div class="part-header">
          <div class="part-title">
            <h5>${this.esc(partName)}</h5>
            ${oemBadge}
            ${difficulty}
          </div>
          ${rating}
        </div>

        <div class="part-spec-grid">
          <div class="part-spec-cell">
            <span class="part-spec-cell__label">${this.esc(this.t("oem_number"))}</span>
            <span class="part-spec-cell__value">
              <code>${this.esc(oemNum)}</code>
              ${part.oem_number ? `<button type="button" class="part-copy-oem" data-copy-oem="${this.esc(part.oem_number)}" title="Copy OEM"><i class="far fa-copy" aria-hidden="true"></i></button>` : ""}
            </span>
          </div>

          ${mfg ? `
          <div class="part-spec-cell">
            <span class="part-spec-cell__label">${this.esc(this.t("manufacturer"))}</span>
            <span class="part-spec-cell__value">${this.esc(mfg)}</span>
          </div>` : ""}

          ${priceMin != null && priceMax != null ? `
          <div class="part-spec-cell">
            <span class="part-spec-cell__label">${this.esc(this.t("price"))}</span>
            <span class="part-spec-cell__value">$${priceMin.toFixed(0)} – $${priceMax.toFixed(0)}</span>
          </div>` : ""}

          ${laborVal ? `
          <div class="part-spec-cell">
            <span class="part-spec-cell__label">${this.esc(this.t("labor"))}</span>
            <span class="part-spec-cell__value">${this.esc(laborVal)}</span>
          </div>` : ""}
        </div>

        ${compatibility}

        ${part.notes ? `
          <div class="part-notes">
            <i class="fas fa-circle-info" aria-hidden="true"></i>
            <span>${this.esc(part.notes)}</span>
          </div>
        ` : ""}

        <div class="buy-links">
          <div class="buy-links-header">${this.esc(this.t("where_to_buy"))}</div>
          <div class="marketplace-links">
            ${this.renderBuyLinks(buyLinks, part.oem_number)}
          </div>
        </div>
      </div>
    `;
  }

  renderBuyLinks(links, oemNumber) {
    if (!links || links.length === 0) {
      if (oemNumber) {
        const q = encodeURIComponent(`BMW ${oemNumber}`);
        return `
          <a href="https://www.realoem.com/bmw/enUS/partxref?q=${encodeURIComponent(oemNumber)}" target="_blank" rel="noopener noreferrer" class="marketplace-link">
            <div class="marketplace-info"><i class="fas fa-book" aria-hidden="true"></i><span>RealOEM Cross-Ref</span></div>
            <div class="price-info"><span class="free-shipping">ETK Diagram →</span></div>
          </a>
          <a href="https://www.fcpeuro.com/products?keywords=${q}" target="_blank" rel="noopener noreferrer" class="marketplace-link">
            <div class="marketplace-info"><i class="fas fa-warehouse" aria-hidden="true"></i><span>FCP Euro Lookup</span></div>
            <div class="price-info"><span class="shipping">${this.esc(oemNumber)} →</span></div>
          </a>
        `;
      }
      return `<p class="no-links">${this.esc(this.t("no_links_available"))}</p>`;
    }

    const marketplaceIcons = {
      realoem: "fas fa-book",
      ebay: "fab fa-ebay",
      amazon: "fab fa-amazon",
      aliexpress: "fas fa-box",
      autodoc: "fas fa-warehouse",
      fcpeuro: "fas fa-shield-alt"
    };

    const sortedLinks = [...links].sort((a, b) => Number(a.current_price || 0) - Number(b.current_price || 0));

    return sortedLinks
      .map((link) => {
        const mp = String(link.marketplace || link.store || "supplier").toLowerCase();
        const icon = marketplaceIcons[mp] || "fas fa-external-link-alt";
        const inStock = link.in_stock !== 0 && link.in_stock !== false;
        const priceVal = Number(link.current_price ?? link.price ?? 0);
        const shipVal = Number(link.shipping_cost || 0);
        const targetUrl = link.affiliate_url || link.product_url || link.url || "#";
        const shipping = !inStock
          ? `<span class="out-of-stock">${this.esc(this.t("out_of_stock"))}</span>`
          : shipVal > 0
            ? `<span class="shipping">+$${shipVal.toFixed(2)} ${this.esc(this.t("shipping"))}</span>`
            : `<span class="free-shipping">${this.esc(this.t("free_shipping"))}</span>`;

        return `
          <a href="${this.esc(targetUrl)}"
             target="_blank"
             rel="noopener noreferrer nofollow"
             class="marketplace-link ${!inStock ? "disabled" : ""}"
             data-link-id="${this.esc(link.id)}"
             data-marketplace="${this.esc(mp)}">
            <div class="marketplace-info">
              <i class="${icon}" aria-hidden="true"></i>
              <span class="marketplace-name">${this.esc(mp.toUpperCase())}</span>
            </div>
            <div class="price-info">
              ${priceVal > 0 ? `<span class="price">$${priceVal.toFixed(2)}</span>` : ""}
              ${shipping}
            </div>
          </a>
        `;
      })
      .join("");
  }

  renderStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = Math.max(0, 5 - fullStars - (halfStar ? 1 : 0));

    let stars = "";
    for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star"></i>';
    if (halfStar) stars += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) stars += '<i class="far fa-star"></i>';

    return `<span class="stars">${stars} ${rating.toFixed(1)}</span>`;
  }

  bindCopyButtons() {
    this.container.querySelectorAll("[data-copy-oem]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const oem = btn.getAttribute("data-copy-oem");
        if (!oem) return;
        try {
          await navigator.clipboard.writeText(oem);
          const icon = btn.querySelector("i");
          if (icon) icon.className = "fas fa-check";
          setTimeout(() => {
            if (icon) icon.className = "far fa-copy";
          }, 1400);
        } catch (_) {}
      });
    });
  }

  trackClicks() {
    const links = this.container.querySelectorAll(".marketplace-link[data-link-id]");
    links.forEach((link) => {
      link.addEventListener("click", async () => {
        const linkId = link.dataset.linkId;
        const marketplace = link.dataset.marketplace;
        if (!linkId) return;
        try {
          await fetch("/api/parts/track-click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ link_id: linkId, marketplace })
          });
        } catch (_) {}
      });
    });
  }

  showLoading() {
    this.container.innerHTML = `
      <div class="parts-loading">
        <i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i>
        <span>${this.esc(this.t("loading_parts"))}</span>
      </div>
    `;
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="parts-error">
        <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
        <span>${this.esc(message)}</span>
      </div>
    `;
  }

  t(key) {
    const translations = {
      en: {
        needed_parts: "Associated Replacement Parts & OEM Spec",
        estimated_cost: "Estimated Parts Range",
        required_parts: "Primary Replacement Components",
        recommended_parts: "Recommended Service Components",
        optional_parts: "Supporting Hardware & Seals",
        oem_number: "BMW OEM Part No.",
        genuine_oem: "Genuine OEM",
        aftermarket: "OE / Aftermarket",
        manufacturer: "Supplier / OE",
        price: "Typical Price",
        labor: "Est. Labor",
        where_to_buy: "Catalog & Supplier Reference",
        no_links_available: "No direct supplier listings recorded",
        loading_parts: "Querying BMW parts cross-reference...",
        check_compatibility: "Verify fitment against 17-digit VIN before ordering",
        difficulty_easy: "DIY / Accessible",
        difficulty_medium: "Intermediate",
        difficulty_hard: "Advanced",
        difficulty_professional: "Specialist / Workshop",
        free_shipping: "Free shipping",
        shipping: "shipping",
        out_of_stock: "Out of stock"
      },
      ru: {
        needed_parts: "Связанные запчасти и OEM-спецификация",
        estimated_cost: "Ориентировочный бюджет запчастей",
        required_parts: "Основные компоненты к замене",
        recommended_parts: "Рекомендуемые сопутствующие детали",
        optional_parts: "Дополнительный крепёж и уплотнения",
        oem_number: "OEM-номер BMW",
        genuine_oem: "Оригинал BMW",
        aftermarket: "OE / Аналог",
        manufacturer: "Производитель",
        price: "Диапазон цен",
        labor: "Норма времени",
        where_to_buy: "Каталоги и поставщики",
        no_links_available: "Прямые предложения не найдены",
        loading_parts: "Загрузка кросс-номеров запчастей...",
        check_compatibility: "Проверьте применимость по VIN перед заказом",
        difficulty_easy: "Простая замена",
        difficulty_medium: "Средняя сложность",
        difficulty_hard: "Сложный ремонт",
        difficulty_professional: "Требуется профильный сервис",
        free_shipping: "Бесплатная доставка",
        shipping: "доставка",
        out_of_stock: "Нет в наличии"
      },
      ka: {
        needed_parts: "დაკავშირებული ნაწილები და OEM სპეციფიკაცია",
        estimated_cost: "ნაწილების სავარაუდო ბიუჯეტი",
        required_parts: "ძირითადი შესაცვლელი კომპონენტები",
        recommended_parts: "რეკომენდებული თანმდევი ნაწილები",
        optional_parts: "დამატებითი სამაგრები და შუასადებები",
        oem_number: "BMW OEM ნომერი",
        genuine_oem: "ორიგინალი OEM",
        aftermarket: "OE / შემცვლელი",
        manufacturer: "მწარმოებელი",
        price: "ფასის დიაპაზონი",
        labor: "სამუშაო დრო",
        where_to_buy: "კატალოგები და მომწოდებლები",
        no_links_available: "პირდაპირი ბმულები არ მოიძებნა",
        loading_parts: "მიმდინარეობს OEM ნაწილების მოძიება...",
        check_compatibility: "შეკვეთამდე გადაამოწმეთ თავსებადობა VIN კოდით",
        difficulty_easy: "მარტივი შეცვლა",
        difficulty_medium: "საშუალო სირთულე",
        difficulty_hard: "რთული სამუშაო",
        difficulty_professional: "საჭიროა სპეციალისტი",
        free_shipping: "უფასო მიწოდება",
        shipping: "მიწოდება",
        out_of_stock: "არ არის მარაგში"
      }
    };

    return translations[this.currentLang]?.[key] || translations.en[key] || key;
  }
}

window.PartsFinderUI = PartsFinderUI;
