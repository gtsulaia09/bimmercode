// functions/api/categories.js — public categories list with i18n
export async function onRequestGet(context) {
  const { env, request } = context;
  const lang = (new URL(request.url).searchParams.get("lang") || "en").toLowerCase();

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, slug, title, title_en, title_ru, title_ka,
              description, description_en, description_ru, description_ka,
              icon, color, sort_order, is_active
         FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, title ASC`
    ).all();

    const pickTitle = (row) =>
      row[`title_${lang}`] || row.title_en || row.title;
    const pickDesc = (row) =>
      row[`description_${lang}`] || row.description_en || row.description || "";

    // Counts per category (topics, last activity)
    let counts;
    try {
      counts = await env.DB.prepare(
        `SELECT category, COUNT(*) AS topics_count, MAX(COALESCE(last_reply_at, created_at)) AS last_activity
           FROM topics
          WHERE (is_archived IS NULL OR is_archived = 0)
          GROUP BY category`
      ).all();
    } catch (countErr) {
      if (!String(countErr?.message || countErr).includes("is_archived")) throw countErr;
      counts = await env.DB.prepare(
        `SELECT category, COUNT(*) AS topics_count, MAX(created_at) AS last_activity
           FROM topics
          GROUP BY category`
      ).all();
    }
    const countsBySlug = {};
    for (const c of counts.results || []) countsBySlug[c.category] = c;

    let categories = (results || []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: pickTitle(row),
      description: pickDesc(row),
      icon: row.icon || "fas fa-folder",
      color: row.color || "#2877EE",
      sort_order: row.sort_order,
      topics_count: countsBySlug[row.slug]?.topics_count || 0,
      last_activity: countsBySlug[row.slug]?.last_activity || null,
    }));

    if (!categories.length) {
      const defaults = [
        { slug: "diagnostics", icon: "fas fa-microchip", color: "#2877EE", en: "Fault Codes & ISTA", ru: "Коды ошибок и ISTA", ka: "კოდები და ISTA" },
        { slug: "engine-drivetrain", icon: "fas fa-gears", color: "#38BDF8", en: "Engine & Transmission", ru: "Двигатель и КПП", ka: "ძრავა და ტრანსმისია" },
        { slug: "electronics", icon: "fas fa-bolt", color: "#F59E0B", en: "ECU & Body Electronics", ru: "ЭБУ и электроника", ka: "ელექტრონიკა და ბლოკები" },
        { slug: "coding-retrofits", icon: "fas fa-terminal", color: "#10B981", en: "Coding & Retrofits", ru: "Кодирование и дооснащение", ka: "კოდირება და რეტროფიტი" },
        { slug: "suspension-brakes", icon: "fas fa-car-side", color: "#94A3B8", en: "Chassis, DSC & Brakes", ru: "Шасси, DSC и тормоза", ka: "სავალი ნაწილი და DSC" },
      ];
      categories = defaults.map((d, idx) => ({
        id: d.slug,
        slug: d.slug,
        title: d[lang] || d.en,
        description: "",
        icon: d.icon,
        color: d.color,
        sort_order: idx + 1,
        topics_count: countsBySlug[d.slug]?.topics_count || 0,
        last_activity: countsBySlug[d.slug]?.last_activity || null,
      }));
    }

    return new Response(JSON.stringify({ success: true, categories }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
