// functions/code/[id].js
// Dynamic SSR page for each BMW DTC code.
// Route: /code/:id  →  e.g. /code/P0171, /code/118001, /code/2A82

const SITE_URL = 'https://bimmercodes.net';

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getSeverityClass(s) {
  if (!s) return 'medium';
  const v = String(s).toLowerCase();
  if (v === 'critical') return 'critical';
  if (v === 'high') return 'high';
  if (v === 'medium' || v === 'moderate') return 'medium';
  return 'low';
}

function getSeverityLabel(s, lang) {
  const labels = {
    en: { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' },
    ru: { critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий' },
    ka: { critical: 'კრიტიკული', high: 'მაღალი', medium: 'საშუალო', low: 'დაბალი' },
  };
  const l = labels[lang] || labels.en;
  return l[getSeverityClass(s)] || l.medium;
}

function t(lang) {
  const T = {
    en: {
      navCodes: 'Diagnostic Codes',
      navIndex: 'Code Index',
      vinBtn: 'VIN Decoder',
      partsBtn: 'Parts Finder',
      forumBtn: 'Forum',
      back: 'Back to Search',
      severity: 'Severity',
      category: 'System',
      obdEquiv: 'OBD-II Cross-Ref',
      models: 'Applicable Chassis',
      solutions: 'Diagnostic & Repair Procedure',
      software: 'Compatible Diagnostic Tools',
      notfound: 'Diagnostic Code Not Indexed',
      notfoundDesc: 'The requested identifier was not found in the static DTC index. Try searching by partial code or symptom.',
      searchBtn: 'Open Diagnostic Search',
      engineCodes: 'Engine Families',
      askAi: 'Diagnose with AI',
      lookupParts: 'OEM Parts Lookup',
      discussForum: 'Forum Threads',
      copyCode: 'Copy Code',
      copied: 'Copied',
    },
    ru: {
      navCodes: 'Коды ошибок',
      navIndex: 'Каталог кодов',
      vinBtn: 'VIN-декодер',
      partsBtn: 'Запчасти',
      forumBtn: 'Форум',
      back: 'Назад к поиску',
      severity: 'Приоритет',
      category: 'Система',
      obdEquiv: 'Аналог OBD-II',
      models: 'Применимые кузова',
      solutions: 'План диагностики и устранения',
      software: 'Диагностическое ПО',
      notfound: 'Код не найден в базе',
      notfoundDesc: 'Запрошенный идентификатор не найден в индексе DTC. Попробуйте поиск по части кода или симптому.',
      searchBtn: 'Перейти к поиску кодов',
      engineCodes: 'Серии двигателей',
      askAi: 'Разобрать с AI',
      lookupParts: 'Подбор запчастей OEM',
      discussForum: 'Темы на форуме',
      copyCode: 'Копировать',
      copied: 'Скопировано',
    },
    ka: {
      navCodes: 'დიაგნოსტიკის კოდები',
      navIndex: 'კოდების კატალოგი',
      vinBtn: 'VIN დეკოდერი',
      partsBtn: 'ნაწილები',
      forumBtn: 'ფორუმი',
      back: 'ძიებაზე დაბრუნება',
      severity: 'სიმძიმე',
      category: 'სისტემა',
      obdEquiv: 'OBD-II ეკვივალენტი',
      models: 'თავსებადი ძარები',
      solutions: 'დიაგნოსტიკისა და შეკეთების გეგმა',
      software: 'დიაგნოსტიკური პროგრამები',
      notfound: 'კოდი ბაზაში ვერ მოიძებნა',
      notfoundDesc: 'მოთხოვნილი კოდი DTC ინდექსში ვერ მოიძებნა. სცადეთ ძიება კოდის ნაწილით ან სიმპტომით.',
      searchBtn: 'კოდების ძიებაზე გადასვლა',
      engineCodes: 'ძრავის სერიები',
      askAi: 'AI ანალიზი',
      lookupParts: 'OEM ნაწილების ძიება',
      discussForum: 'ფორუმის თემები',
      copyCode: 'კოპირება',
      copied: 'დაკოპირდა',
    },
  };
  return T[lang] || T.en;
}

const BRAND_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">
  <rect x="3" y="3" width="58" height="58" rx="12" fill="#0E1218" stroke="#283244" stroke-width="2"/>
  <rect x="7" y="7" width="50" height="50" rx="8.5" fill="#131923" stroke="#1E2736" stroke-width="1"/>
  <path d="M16 18H31.5C36.2 18 39.5 20.5 39.5 24.6C39.5 27.4 37.9 29.5 35.2 30.4C38.5 31.2 40.5 33.6 40.5 37C40.5 41.6 36.9 44.5 31.4 44.5H16V18ZM22.2 28.4H29.9C32.2 28.4 33.5 27.3 33.5 25.4C33.5 23.5 32.2 22.5 29.9 22.5H22.2V28.4ZM22.2 40H30.4C33 40 34.4 38.8 34.4 36.7C34.4 34.6 32.9 33.4 30.3 33.4H22.2V40Z" fill="#E8EEF6"/>
  <path d="M43.5 18H49.5L43.5 44.5H37.5L43.5 18Z" fill="#2877EE"/>
  <rect x="46.5" y="18" width="3.5" height="7" rx="1" fill="#6EA8FF"/>
</svg>`;

function renderPage(code, lang) {
  const tr = t(lang);
  const title = code.title?.[lang] || code.title?.en || code.code;
  const description = code.description?.[lang] || code.description?.en || '';
  const solutions = code.solutions?.[lang] || code.solutions?.en || [];
  const severity = code.severity || 'Medium';
  const sevClass = getSeverityClass(severity);
  const sevLabel = getSeverityLabel(severity, lang);
  const category = code.category || 'BMW Control Unit';
  const models = code.applicableModels || [];
  const engineCodes = code.engineCodes || [];
  const pCodes = code.pCodes || [];
  const software = code.software && code.software.length ? code.software : ['BMW ISTA', 'INPA', 'OBD-II'];
  const codeId = code.code;

  const canonical = `${SITE_URL}/code/${encodeURIComponent(codeId)}`;
  const ogTitle = `BMW ${codeId} — ${esc(title)}`;
  const ogDesc = (description || title).slice(0, 160).replace(/\n/g, ' ');

  const solutionItems = Array.isArray(solutions)
    ? solutions.map((s) => `<li>${esc(s)}</li>`).join('')
    : '';

  const modelBadges = models.map((m) => `<span class="bc-spec-tag">${esc(m)}</span>`).join('');
  const engineBadges = engineCodes.map((e) => `<span class="bc-spec-tag bc-spec-tag--engine">${esc(e)}</span>`).join('');
  const softwareBadges = software.map((s) => `<span class="bc-spec-tag">${esc(s)}</span>`).join('');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `BMW Fault Code ${codeId}: ${title}`,
    description: ogDesc,
    inLanguage: lang,
    url: canonical,
    author: { '@type': 'Organization', name: 'BimmerCodes' },
    publisher: { '@type': 'Organization', name: 'BimmerCodes', url: SITE_URL },
    about: { '@type': 'Thing', name: `BMW DTC ${codeId}` },
  });

  const langLabel = { en: 'EN', ru: 'RU', ka: 'KA' };
  const langLinks = Object.keys(langLabel)
    .map(
      (l) =>
        `<a href="/code/${encodeURIComponent(codeId)}?lang=${l}" class="bc-tool-btn bc-tool-btn--lang${
          l === lang ? ' bc-tool-btn--primary' : ''
        }" style="min-width:42px;padding:0 9px;">${langLabel[l]}</a>`
    )
    .join('');

  const aiPrompt = `Diagnose BMW fault code ${codeId} (${title}). Category: ${category}. Provide key inspection steps and common failure points.`;

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>BMW ${esc(codeId)} — ${esc(title)} | BimmerCodes</title>
  <meta name="description" content="${esc(ogDesc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en" href="${SITE_URL}/code/${encodeURIComponent(codeId)}?lang=en">
  <link rel="alternate" hreflang="ru" href="${SITE_URL}/code/${encodeURIComponent(codeId)}?lang=ru">
  <link rel="alternate" hreflang="ka" href="${SITE_URL}/code/${encodeURIComponent(codeId)}?lang=ka">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(ogTitle)}">
  <meta property="og:description" content="${esc(ogDesc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="BimmerCodes">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(ogTitle)}">
  <meta name="twitter:description" content="${esc(ogDesc)}">
  <meta name="theme-color" content="#0A0C10">
  <link rel="icon" type="image/svg+xml" href="/assets/icons/ico.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="/css/tokens.css?v=4.0">
  <link rel="stylesheet" href="/css/style.css?v=4.0">
  <link rel="stylesheet" href="/css/parts-finder.css?v=4.0">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <header class="bc-header" role="banner">
    <div class="bc-header__inner">
      <a href="/" class="bc-brand">
        <span class="bc-brand__mark">${BRAND_MARK_SVG}</span>
        <span class="bc-brand__text">
          <span class="bc-brand__name">BimmerCodes</span>
          <span class="bc-brand__sub">Diagnostic &amp; Engineering</span>
        </span>
      </a>
      <nav class="bc-nav" aria-label="Primary Navigation">
        <a href="/" class="bc-nav__link is-active"><i class="fas fa-microchip"></i> <span>${esc(tr.navCodes)}</span></a>
        <a href="/all.html" class="bc-nav__link"><i class="fas fa-list-ul"></i> <span>${esc(tr.navIndex)}</span></a>
        <a href="/vin.html" class="bc-nav__link"><i class="fas fa-barcode"></i> <span>${esc(tr.vinBtn)}</span></a>
        <a href="/parts.html?code=${encodeURIComponent(codeId)}" class="bc-nav__link"><i class="fas fa-cogs"></i> <span>${esc(tr.partsBtn)}</span></a>
        <a href="/forum.html" class="bc-nav__link"><i class="fas fa-comments"></i> <span>${esc(tr.forumBtn)}</span></a>
      </nav>
      <div class="bc-header-tools">
        ${langLinks}
      </div>
    </div>
  </header>

  <main style="padding: 32px 0 56px;">
    <div class="bc-container">
      <article class="bc-datasheet">
        <div class="bc-datasheet__topbar">
          <a href="/" class="bc-datasheet__back">
            <i class="fas fa-arrow-left" aria-hidden="true"></i>
            <span>${esc(tr.back)}</span>
          </a>
          <div class="bc-datasheet__actions">
            <button type="button" class="btn btn-secondary btn-sm" id="ssr-copy-code" data-code="${esc(codeId)}">
              <i class="far fa-copy" aria-hidden="true"></i>
              <span>${esc(tr.copyCode)}</span>
            </button>
            <a href="/parts.html?code=${encodeURIComponent(codeId)}" class="btn btn-secondary btn-sm">
              <i class="fas fa-cogs" aria-hidden="true"></i>
              <span>${esc(tr.lookupParts)}</span>
            </a>
            <button type="button" class="btn btn-primary btn-sm" data-open-ai-chat data-ai-prompt="${esc(aiPrompt)}">
              <i class="fas fa-robot" aria-hidden="true"></i>
              <span>${esc(tr.askAi)}</span>
            </button>
          </div>
        </div>

        <div class="bc-datasheet__hero">
          <div class="bc-datasheet__id-row">
            <h1 class="bc-datasheet__code">${esc(codeId)}</h1>
            <span class="severity-badge severity-${sevClass}">
              <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
              ${esc(tr.severity)}: ${esc(sevLabel)}
            </span>
            ${category ? `<span class="bc-badge"><i class="fas fa-microchip" aria-hidden="true"></i> ${esc(category)}</span>` : ''}
            ${pCodes.length ? `<span class="bc-badge bc-badge--mono">${esc(tr.obdEquiv)}: ${esc(pCodes.join(', '))}</span>` : ''}
          </div>
          <h2 class="bc-datasheet__title">${esc(title)}</h2>
          ${description ? `<p class="bc-datasheet__summary">${esc(description)}</p>` : ''}
        </div>

        <div class="bc-datasheet__grid">
          <div class="bc-datasheet__primary">
            ${solutionItems ? `
            <div>
              <h3 class="bc-datasheet__block-title"><i class="fas fa-screwdriver-wrench" aria-hidden="true"></i> ${esc(tr.solutions)}</h3>
              <ol class="bc-steps-list">${solutionItems}</ol>
            </div>` : ''}

            <div style="display:flex;flex-wrap:wrap;gap:10px;padding-top:4px;">
              <a href="/parts.html?code=${encodeURIComponent(codeId)}" class="btn btn-secondary btn-sm">
                <i class="fas fa-cogs" aria-hidden="true"></i> ${esc(tr.lookupParts)}
              </a>
              <a href="/forum.html?q=${encodeURIComponent(codeId)}" class="btn btn-secondary btn-sm">
                <i class="fas fa-comments" aria-hidden="true"></i> ${esc(tr.discussForum)}
              </a>
            </div>
          </div>

          <aside class="bc-datasheet__aside">
            ${engineBadges ? `
            <div>
              <h3 class="bc-datasheet__block-title"><i class="fas fa-gauge-high" aria-hidden="true"></i> ${esc(tr.engineCodes)}</h3>
              <div class="bc-tag-cloud">${engineBadges}</div>
            </div>` : ''}

            ${modelBadges ? `
            <div>
              <h3 class="bc-datasheet__block-title"><i class="fas fa-car-side" aria-hidden="true"></i> ${esc(tr.models)}</h3>
              <div class="bc-tag-cloud">${modelBadges}</div>
            </div>` : ''}

            ${softwareBadges ? `
            <div>
              <h3 class="bc-datasheet__block-title"><i class="fas fa-terminal" aria-hidden="true"></i> ${esc(tr.software)}</h3>
              <div class="bc-tag-cloud">${softwareBadges}</div>
            </div>` : ''}
          </aside>
        </div>
      </article>

      <div id="ssr-parts-mount" style="margin-top: 24px;"></div>
    </div>
  </main>

  <footer></footer>

  <script src="/js/parts-finder.js?v=6" data-cfasync="false"></script>
  <script src="/js/footer.js?v=4.0" data-cfasync="false"></script>
  <script>
    (function () {
      const urlLang = new URLSearchParams(location.search).get('lang');
      if (urlLang && ['en', 'ru', 'ka'].includes(urlLang)) {
        try {
          localStorage.setItem('language', urlLang);
          localStorage.setItem('forumLanguage', urlLang);
        } catch (_) {}
      }
      const copyBtn = document.getElementById('ssr-copy-code');
      if (copyBtn) {
        copyBtn.addEventListener('click', async function () {
          try {
            await navigator.clipboard.writeText(copyBtn.getAttribute('data-code') || '');
            const sp = copyBtn.querySelector('span');
            if (sp) sp.textContent = ${JSON.stringify(tr.copied)};
          } catch (_) {}
        });
      }
      if (typeof PartsFinderUI !== 'undefined') {
        const pf = new PartsFinderUI('ssr-parts-mount');
        pf.loadParts(${JSON.stringify(codeId)});
      }
    })();
  </script>
</body>
</html>`;
}

function renderNotFound(codeId, lang) {
  const tr = t(lang);
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>BMW ${esc(codeId)} — ${esc(tr.notfound)} | BimmerCodes</title>
  <meta name="robots" content="noindex">
  <link rel="icon" type="image/svg+xml" href="/assets/icons/ico.svg">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@600;700&family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="/css/tokens.css?v=4.0">
  <link rel="stylesheet" href="/css/style.css?v=4.0">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  <header class="bc-header">
    <div class="bc-header__inner">
      <a href="/" class="bc-brand">
        <span class="bc-brand__mark">${BRAND_MARK_SVG}</span>
        <span class="bc-brand__text">
          <span class="bc-brand__name">BimmerCodes</span>
          <span class="bc-brand__sub">Diagnostic &amp; Engineering</span>
        </span>
      </a>
    </div>
  </header>
  <main style="display:flex;align-items:center;justify-content:center;padding:64px 20px;">
    <div class="bc-empty-box" style="max-width:520px;width:100%;">
      <div class="bc-datasheet__code" style="color:var(--accent-light);margin-bottom:8px;">${esc(codeId)}</div>
      <h1 style="font-size:1.35rem;margin-bottom:8px;">${esc(tr.notfound)}</h1>
      <p style="color:var(--text-secondary);font-size:0.95rem;margin-bottom:20px;line-height:1.6;">${esc(tr.notfoundDesc)}</p>
      <a href="/?code=${encodeURIComponent(codeId)}" class="btn btn-primary">
        <i class="fas fa-magnifying-glass" aria-hidden="true"></i> ${esc(tr.searchBtn)}
      </a>
    </div>
  </main>
  <footer></footer>
  <script src="/js/footer.js?v=4.0" data-cfasync="false"></script>
</body>
</html>`;
}

async function findCode(id, assetsFetch, baseUrl) {
  const upperCode = id.toUpperCase();

  try {
    const res = await assetsFetch(new Request(`${baseUrl}/data/codes.json`));
    if (res.ok) {
      const { codes } = await res.json();
      const found = codes.find((c) => c.code.toUpperCase() === upperCode);
      if (found) return found;
    }
  } catch (_) {}

  try {
    const res = await assetsFetch(new Request(`${baseUrl}/data/data.json`));
    if (res.ok) {
      const { codes } = await res.json();
      const found = codes.find((c) => String(c.code).toUpperCase() === upperCode);
      if (found) return found;
    }
  } catch (_) {}

  return null;
}

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const id = params.id || '';

  if (!id || id.length > 24) {
    return new Response('Invalid code', { status: 400 });
  }

  const url = new URL(request.url);
  const lang = ['en', 'ru', 'ka'].includes(url.searchParams.get('lang'))
    ? url.searchParams.get('lang')
    : 'en';

  const baseUrl = `${url.protocol}//${url.host}`;
  const code = await findCode(id, env.ASSETS.fetch.bind(env.ASSETS), baseUrl);

  const html = code ? renderPage(code, lang) : renderNotFound(id, lang);
  const status = code ? 200 : 404;

  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': code
        ? 'public, max-age=3600, stale-while-revalidate=86400'
        : 'no-store',
    },
  });
}
