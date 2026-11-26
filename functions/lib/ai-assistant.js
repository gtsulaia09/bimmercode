// functions/lib/ai-assistant.js — BMW assistant: Workers AI cascade + external fallbacks

import { getCodeFromDb } from "./dtc-codes.js";

export const SYSTEM_PROMPT = `You are the official AI assistant for bimmercodes.net. Your only job is to help users with vehicle diagnostics, fault codes (DTC / hex), and coding (BimmerCode / E-Sys / ISTA).
Rules:
1. Reply strictly in the language the user writes in (Russian, English, or Georgian / ქართული). If they mix languages, prefer the latest message language.
2. When the user sends a fault code (e.g. 118001, P0300, 130108, 2A82, A0B1), explain what it means in plain language, typical symptoms, likely causes, and safe first checks. Mention when a pro scan or ISTA is needed.
3. If the question is not automotive-related, politely refuse and remind them you are an auto expert.
4. Be concise — no filler. Use short paragraphs or bullet lists for steps.
5. Never claim to be BMW AG or an official dealer. This is independent enthusiast guidance, not legal or safety-critical certification.
6. For dangerous repairs (fuel system, airbags, high voltage on hybrids), recommend a qualified workshop.`;

const CF_PRIMARY = "@cf/zai-org/glm-4.7-flash";
const CF_FALLBACK = "@cf/meta/llama-3.1-8b-instruct-fast";

const CODE_RE =
  /\b(?:P[0-9A-F]{4}|U[0-9A-F]{4}|B[0-9A-F]{4}|C[0-9A-F]{4}|[0-9A-F]{5,6}|2[0-9A-F]{3,4})\b/gi;

/** @param {string} text */
export function extractFaultCodes(text) {
  const found = new Set();
  const m = String(text || "").matchAll(CODE_RE);
  for (const hit of m) {
    found.add(hit[0].toUpperCase());
  }
  return [...found].slice(0, 5);
}

/**
 * @param {import("@cloudflare/workers-types").D1Database | null} db
 * @param {string[]} codes
 */
export async function buildCodeContext(db, codes) {
  if (!db || !codes.length) return "";
  const blocks = [];
  for (const raw of codes) {
    const code = raw.toUpperCase();
    const row = await getCodeFromDb(db, code);
    if (!row) continue;
    blocks.push(
      `[Site DB: ${row.code}] EN: ${row.title?.en || ""} — ${(row.description?.en || "").slice(0, 400)}`
    );
  }
  if (!blocks.length) return "";
  return (
    "\n\nReference from bimmercodes.net database (use if relevant, do not invent):\n" +
    blocks.join("\n")
  );
}

/**
 * @param {unknown} response
 */
export function pickAiText(response) {
  if (!response) return "";
  if (typeof response === "string") return response.trim();
  if (typeof response.response === "string") return response.response.trim();
  if (typeof response.output_text === "string") return response.output_text.trim();
  const choice = response.choices?.[0];
  if (choice?.message?.content) return String(choice.message.content).trim();
  if (choice?.text) return String(choice.text).trim();
  return "";
}

function isRetryableStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

/**
 * @param {object} env
 * @param {{ role: string, content: string }[]} messages
 * @param {string} extraSystem
 */
async function runCloudflare(env, messages, extraSystem) {
  if (!env.AI) throw new Error("Workers AI not configured");

  const payload = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT + extraSystem },
      ...messages.slice(-12),
    ],
    max_tokens: 700,
    temperature: 0.35,
  };

  for (const model of [CF_PRIMARY, CF_FALLBACK]) {
    try {
      const response = await env.AI.run(model, payload);
      const text = pickAiText(response);
      if (text) return { text, provider: model.includes("glm") ? "cloudflare-glm" : "cloudflare-llama" };
    } catch (e) {
      const msg = e?.message || String(e);
      if (/429|rate|limit|quota/i.test(msg)) throw Object.assign(new Error(msg), { status: 429 });
      console.warn(`Workers AI ${model} failed:`, msg);
    }
  }
  throw new Error("Workers AI unavailable");
}

/**
 * @param {object} env
 * @param {{ role: string, content: string }[]} messages
 * @param {string} extraSystem
 */
async function runGroq(env, messages, extraSystem) {
  const key = env.GROQ_API_KEY;
  if (!key) throw new Error("Groq not configured");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + extraSystem },
        ...messages.slice(-12),
      ],
      max_tokens: 700,
      temperature: 0.35,
    }),
  });

  if (!res.ok) {
    const err = new Error(`Groq HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = pickAiText(data);
  if (!text) throw new Error("Empty Groq response");
  return { text, provider: "groq" };
}

/**
 * @param {object} env
 * @param {{ role: string, content: string }[]} messages
 * @param {string} extraSystem
 */
async function runGemini(env, messages, extraSystem) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini not configured");

  const contents = messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let lastErr = null;
  for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
      encodeURIComponent(key);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT + extraSystem }] },
        contents,
        generationConfig: { maxOutputTokens: 700, temperature: 0.35 },
      }),
    });

    if (!res.ok) {
      const err = new Error(`Gemini (${model}) HTTP ${res.status}`);
      err.status = res.status;
      lastErr = err;
      continue;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    if (text) return { text, provider: `gemini-${model}` };
  }
  throw lastErr || new Error("Empty Gemini response");
}

/**
 * @param {object} env
 * @param {{ role: string, content: string }[]} messages
 * @param {string} extraSystem
 */
async function runCohere(env, messages, extraSystem) {
  const key = env.COHERE_API_KEY;
  if (!key) throw new Error("Cohere not configured");

  const chatHistory = messages.slice(-12, -1).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));
  const last = messages[messages.length - 1]?.content || "";

  const res = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "command-r-08-2024",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + extraSystem },
        ...chatHistory,
        { role: "user", content: last },
      ],
      max_tokens: 700,
      temperature: 0.35,
    }),
  });

  if (!res.ok) {
    const err = new Error(`Cohere HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text =
    data?.message?.content?.[0]?.text?.trim() ||
    data?.text?.trim() ||
    "";
  if (!text) throw new Error("Empty Cohere response");
  return { text, provider: "cohere" };
}

function detectReplyLang(text) {
  const s = String(text || "");
  if (/[\u10A0-\u10FF]/.test(s)) return "ka";
  if (/[\u0400-\u04FF]/.test(s)) return "ru";
  return "en";
}

async function runBuiltInDiagnosticEngine(env, messages) {
  const lastMsg = messages[messages.length - 1]?.content || "";
  const lang = detectReplyLang(lastMsg);
  const codes = extractFaultCodes(lastMsg);
  const matchedRows = [];

  if (env.DB && codes.length) {
    for (const raw of codes) {
      try {
        const row = await getCodeFromDb(env.DB, raw.toUpperCase());
        if (row) matchedRows.push(row);
      } catch (_) {}
    }
  }

  if (matchedRows.length) {
    const sections = matchedRows.map((row) => {
      const title = row.title?.[lang] || row.title?.en || row.code;
      const desc = row.description?.[lang] || row.description?.en || "";
      const steps = (row.solutions?.[lang] || row.solutions?.en || []).slice(0, 5);
      const engines = (row.engineCodes || []).slice(0, 6).join(", ");
      if (lang === "ru") {
        return [
          `**${row.code} — ${title}**`,
          desc,
          steps.length ? "**План первичной диагностики:**\n" + steps.map((s) => `- ${s}`).join("\n") : "",
          engines ? `Типичные двигатели: ${engines}. Рекомендуется проверка параметров в реальном времени через BMW ISTA.` : "",
        ].filter(Boolean).join("\n\n");
      }
      if (lang === "ka") {
        return [
          `**${row.code} — ${title}**`,
          desc,
          steps.length ? "**დიაგნოსტიკისა და შემოწმების გეგმა:**\n" + steps.map((s) => `- ${s}`).join("\n") : "",
          engines ? `ტიპური ძრავები: ${engines}. რეკომენდებულია Live-პარამეტრების გადამოწმება BMW ISTA-ს მეშვეობით.` : "",
        ].filter(Boolean).join("\n\n");
      }
      return [
        `**${row.code} — ${title}**`,
        desc,
        steps.length ? "**Recommended Diagnostic & Inspection Steps:**\n" + steps.map((s) => `- ${s}`).join("\n") : "",
        engines ? `Common engines: ${engines}. Confirm live telemetry and freeze-frame data using BMW ISTA.` : "",
      ].filter(Boolean).join("\n\n");
    });
    return { text: sections.join("\n\n"), provider: "bimmercodes-db" };
  }

  const lower = lastMsg.toLowerCase();
  const isMisfire = /misfire|rough idle|shaking|vibrat|троит|вибрац|пропуск|ცივზე|კანკალ|პერებოი|ძიგძიგ/.test(lower);
  const isLean = /lean|fuel trim|vacuum|smoke|118001|p0171|бедн|подсос|ღარიბი|ჰაერის მოპარვ/.test(lower);
  const isVanos = /vanos|2a82|2a87|130108|camshaft|valvetronic|ванос|вальветроник|ვანოს/.test(lower);
  const isBoost = /boost|30ff|120308|charge\s*pipe|turbo|drivetrain malfunction|недодув|турбин|ბუსტ|ტურბინ/.test(lower);
  const isCooling = /overheat|coolant|thermostat|water\s*pump|p0128|2e81|перегрев|термостат|помп|გადახურებ|თერმოსტატ|პომპ/.test(lower);
  const isBattery = /battery|starter|no crank|no start|ibs|cas|a0b4|2ded|аккумулятор|стартер|не заводится|აკუმულატორ|სტარტერ|არ იქოქებ/.test(lower);

  if (isMisfire || isLean) {
    const reply =
      lang === "ru"
        ? "**Диагностика нестабильного ХХ / пропусков зажигания и коррекций смеси (DME)**\n\n- Считайте коды в блоке DME через ISTA или BimmerLink (частые коды: 118001, 140010, P0171).\n- Проверьте топливные коррекции STFT/LTFT: если сумма выше +12% на холостых и падает под нагрузкой — вероятен подсос воздуха (мембрана КВКГ в клапанной крышке, патрубок чарджпайпа, вакуумные линии).\n- Если пропуски по конкретному цилиндру (например 140110) — поменяйте местами катушку зажигания с соседним цилиндром и оцените состояние свечей и форсунок.\n- Выполните дымогенераторный тест впуска при холодном двигателе."
        : lang === "ka"
          ? "**არასტაბილური უქმე სვლისა და ნარევის კორექციის დიაგნოსტიკა (DME)**\n\n- წაიკითხეთ DME ბლოკის კოდები ISTA-თი ან BimmerLink-ით (ხშირი კოდებია: 118001, 140010, P0171).\n- შეამოწმეთ საწვავის კორექციები (STFT/LTFT): თუ უქმე სვლაზე +12%-ზე მეტია, შეამოწმეთ ჰაერის შეწოვა (კarterის ვენტილაციის PCV მემბრანა, ჩარჯპაიპის შუასადებები, ვაკუუმის მილები) კვამლის გენერატორით.\n- თუ კონკრეტულ ცილინდრზეა აალების გამოტოვება — გადაანაცვლეთ ბაბინა მეზობელ ცილინდრზე და შეამოწმეთ სანთლები და ინჟექტორები."
          : "**BMW Rough Idle, Misfire & Lean Fuel-Trim Diagnostic Plan (DME)**\n\n- Poll DME fault memory and freeze-frame data (typical identifiers: 118001, 140010, P0171).\n- Inspect Short/Long-Term Fuel Trims (STFT/LTFT) at idle vs. 2,500 RPM: trims above +12% at idle that normalize under load point to an unmetered air leak (PCV valve cover diaphragm, chargepipe O-rings, intake boot).\n- For single-cylinder misfires, swap the ignition coil to an adjacent cylinder to isolate coil vs. spark plug or leaky piezo/solenoid injector.\n- Perform a low-pressure intake smoke test on a cold engine.";
    return { text: reply, provider: "bimmercodes-kb" };
  }

  if (isVanos) {
    const reply =
      lang === "ru"
        ? "**Диагностика системы фаз газораспределения VANOS (2A82 / 2A87 / 130108)**\n\n- Проверьте уровень и чистоту моторного масла, а также наличие центральной направляющей сетки («клетки») в крышке масляного стакана (её отсутствие роняет давление масла в VANOS).\n- Извлеките впускной и выпускной электромагнитные клапаны VANOS, промойте их очистителем, замените уплотнительные кольца и поменяйте клапаны местами: если ошибка перешла с 2A82 на 2A87 — замените клапан.\n- Выполните тест приводов VANOS в BMW ISTA."
        : lang === "ka"
          ? "**VANOS სისტემის დიაგნოსტიკა (2A82 / 2A87 / 130108)**\n\n- შეამოწმეთ ძრავის ზეთის დონე და ზეთის ფილტრის ხუფის ცენტრალური პლასტმასის ღერძი/ბადე (მისი დაკარგვა იწვევს ზეთის წნევის ვარდნას VANOS-ში).\n- მოხსენით შემშვები და გამომშვები VANOS სოლენოიდები, გაწმინდეთ და დროებით გადაანაცვლეთ ადგილებით: თუ კოდი 2A82-დან 2A87-ზე გადავიდა, შეცვალეთ სოლენოიდი.\n- გაუშვით VANOS-ის ტესტ-ბლოკი BMW ISTA-ში."
          : "**BMW VANOS Camshaft Timing Diagnostic Plan (2A82 / 2A87 / 130108)**\n\n- Verify engine oil level/viscosity and inspect the oil filter housing cap to ensure the center plastic cage and small lower O-ring are intact (missing cages bleed VANOS oil pressure).\n- Remove, clean, and swap the intake and exhaust VANOS solenoids with fresh Viton O-rings; if fault 2A82 migrates to 2A87, replace the faulty solenoid.\n- Run the ISTA VANOS system test to compare target vs. actual camshaft angles.";
    return { text: reply, provider: "bimmercodes-kb" };
  }

  if (isBoost) {
    const reply =
      lang === "ru"
        ? "**Диагностика недодува турбокомпрессора / ошибки привода (30FF / 120308)**\n\n- Осмотрите пластиковый патрубок наддува (chargepipe) от интеркулера к дросселю — трещина у фланца дросселя на N54/N55 часто проявляется только под давлением.\n- Проверьте целостность вакуумных шлангов управления вестгейтами (N54) или работу электронного/пневматического актуатора вестгейта (N55/B58).\n- Опрессуйте впускной тракт давлением до 1.0 бар и проверьте герметичность перепускного клапана (diverter valve)."
        : lang === "ka"
          ? "**ტურბინის წნევის ვარდნის (Underboost) დიაგნოსტიკა (30FF / 120308)**\n\n- შეამოწმეთ პლასტმასის ჩარჯპაიპი (Chargepipe) დროსელთან — N54/N55 ძრავებზე ფლანეცის გაბზარვა ხშირი მიზეზია.\n- შეამოწმეთ ვესტგეითის ვაკუუმის მილები (N54) ან ელექტრო/პნევმატური აქტუატორი (N55/B58) და Diverter Valve-ის მემბრანა.\n- ჩაატარეთ შემშვები ტრაქტის წნევით ტესტირება (Boost leak test)."
          : "**BMW Turbocharger Underboost & Drivetrain Malfunction Plan (30FF / 120308)**\n\n- Inspect the OEM plastic chargepipe at the throttle-body C-clip flange (hairline cracks open under boost on N54/N55).\n- Check wastegate vacuum lines and pressure converters (N54) or pneumatic/electronic wastegate actuator linkage & diverter valve diaphragm (N55/B48/B58).\n- Pressure-test the charge-air tract to 15 PSI and log target vs. actual MAP in ISTA.";
    return { text: reply, provider: "bimmercodes-kb" };
  }

  if (isCooling) {
    const reply =
      lang === "ru"
        ? "**Диагностика системы охлаждения BMW (P0128 / 2E81 / 2E82)**\n\n- На двигателях N52/N54/N55 проверьте коды электрической помпы охлаждения (2E81, 2E82) и программируемого термостата (P0128).\n- При ошибке P0128 термостат заклинивает в открытом положении (температура ОЖ на трассе ниже 75–80 °C).\n- После замены помпы или термостата обязательно выполните автоматическую процедуру прокачки контура ОЖ (зажигание включено, печка макс. темп., вентилятор на минимум, педаль газа в пол на 10 сек)."
        : lang === "ka"
          ? "**BMW გაგრილების სისტემის დიაგნოსტიკა (P0128 / 2E81 / 2E82)**\n\n- N52/N54/N55 ძრავებზე შეამოწმეთ ელექტრო წყლის პომპის კოდები (2E81, 2E82) და თერმოსტატის კოდი (P0128).\n- P0128 მიუთითებს ღია მდგომარეობაში გაჭედილ თერმოსტატზე.\n- შეცვლის შემდეგ აუცილებლად ჩაატარეთ ელექტრო პომპით ჰაერის გამოდევნის (Bleeding) პროცედურა."
          : "**BMW Cooling System & Electric Water Pump Diagnostic Plan (P0128 / 2E81 / 2E82)**\n\n- Code P0128 indicates the map-controlled thermostat is stuck open; codes 2E81 / 2E82 indicate electric coolant pump speed deviation or electronics wear (common around 60k–90k miles on N52/N54/N55).\n- Inspect the 50A power distribution fuse and ground strap at the pump connector.\n- Always run the automated 12-minute electric coolant bleed cycle after servicing cooling components.";
    return { text: reply, provider: "bimmercodes-kb" };
  }

  if (isBattery) {
    const reply =
      lang === "ru"
        ? "**Диагностика запуска и электропитания CAS / FEM / IBS (A0B4 / 2DED)**\n\n- Проверьте напряжение АКБ в покое и при прокрутке стартера. При коде A0B4 (CAS подаёт сигнал кл. 50, но двигатель не крутит) проверьте плетёную массу двигателя (между лонжероном и блоком) и втягивающее реле стартера.\n- При коде 2DED (ток покоя) проверьте регистрацию АКБ через ISTA и состояние интеллектуального датчика IBS на минусовой клемме."
        : lang === "ka"
          ? "**დაქოქვისა და ელექტროკვების დიაგნოსტიკა CAS / FEM / IBS (A0B4 / 2DED)**\n\n- A0B4 კოდის დროს (CAS აგზავნის სიგნალს, მაგრამ სტარტერი არ ატრიალებს) შეამოწმეთ ძრავის მასის კაბელი (Ground strap) და თავად სტარტერი.\n- 2DED კოდისას შეამოწმეთ მოსვენების დენი, IBS სენსორი მინუს კლემაზე და აკუმულატორის რეგისტრაცია ISTA-ში."
          : "**BMW No-Crank, Starter & IBS Power Management Plan (A0B4 / 2DED)**\n\n- Fault A0B4 indicates CAS/FEM commands Terminal 50 but sees no cranking RPM: test voltage drop across the chassis-to-engine braided ground strap (jump engine block to chassis ground to test) and starter solenoid.\n- Fault 2DED indicates standby current draw above 80 mA: inspect aftermarket accessories, comfort access door handles, IBS sensor health, and verify battery registration in ISTA.";
    return { text: reply, provider: "bimmercodes-kb" };
  }

  const generic =
    lang === "ru"
      ? "Укажите точный **код ошибки BMW / OBD-II** (например: 118001, 2A82, 30FF, P0171, A0B4) или опишите **кузов, индекс двигателя и симптомы** (например: *F30 N55 вибрация на холодном пуске*).\n\n- Я расшифрую код по инженерной базе BimmerCodes, укажу вероятные причины и пошаговый план проверки через ISTA / BimmerLink."
      : lang === "ka"
        ? "მიუთითეთ ზუსტი **BMW / OBD-II შეცდომის კოდი** (მაგალითად: 118001, 2A82, 30FF, P0171, A0B4) ან მოგვწერეთ **ძარის კოდი, ძრავა და სიმპტომი** (მაგ.: *F30 N55 ცივზე ძრავის კანკალი*).\n\n- მოგაწვდით კოდის განმარტებას, სავარაუდო მიზეზებს და შემოწმების დეტალურ გეგმას."
        : "Share a **BMW hex or OBD-II fault code** (for example: 118001, 2A82, 30FF, P0171, A0B4) or describe your **chassis, engine code, and symptom** (e.g. *F30 N55 cold-start rough idle*).\n\n- I will cross-reference the BimmerCodes diagnostic index and outline likely root causes, live-data checks, and repair steps.";
  return { text: generic, provider: "bimmercodes-kb" };
}

const CASCADE = [
  { name: "cloudflare", run: runCloudflare },
  { name: "groq", run: runGroq },
  { name: "gemini", run: runGemini },
  { name: "cohere", run: runCohere },
  { name: "builtin-kb", run: runBuiltInDiagnosticEngine },
];

/**
 * @param {object} env
 * @param {{ role: string, content: string }[]} messages
 */
export async function runAssistantCascade(env, messages) {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
  const codes = extractFaultCodes(userText);
  const extraSystem = await buildCodeContext(env.DB, codes);

  const errors = [];
  for (const step of CASCADE) {
    try {
      return await step.run(env, messages, extraSystem);
    } catch (e) {
      const status = e?.status;
      const msg = e?.message || String(e);
      errors.push(`${step.name}: ${msg}`);
      if (status && !isRetryableStatus(status) && step.name !== "cloudflare") {
        continue;
      }
      console.warn(`AI cascade ${step.name} failed:`, msg);
    }
  }

  throw new Error(
    "All AI providers are temporarily unavailable. Please try again later." +
      (errors.length ? ` (${errors[errors.length - 1]})` : "")
  );
}
