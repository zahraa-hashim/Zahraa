// ═══════════════════════════════════════════════════════════════
//  wayl-checkout — منصة الدفع (Wayl)
// ═══════════════════════════════════════════════════════════════
//  دالة وحدة بثلاث شغلات، حتى ينشر ملف واحد بس:
//
//   ١. create  — الصفحة تدز {plan, name, phone, lang, back}
//                ← نقرا الباقة والمبلغ من site_info بنفسنا (ما نصدّق المتصفح)
//                ← نسوي صف بـ orders (pending)
//                ← نطلب رابط دفع من Wayl ونرجّعه للصفحة
//   ٢. status  — الصفحة ترجع من Wayl بـ ?pay=back&order=…&k=…
//                ← نرجّع حالة الطلب، وإذا بعده pending نسأل Wayl مباشرة
//   ٣. webhook — Wayl يدز إشعار لـ ?hook=1 لما الدفع يكمل
//                ← ما نصدّق محتوى الإشعار: نسأل Wayl عن الرابط بنفسنا ونحدّث
//
//  ── الأسرار (Supabase → Edge Functions → Secrets) ──
//   WAYL_TOKEN           مفتاح التاجر من لوحة Wayl            (ضروري)
//   WAYL_WEBHOOK_SECRET  أي نص عشوائي طويل — يتأكد إن الإشعار من Wayl (ضروري)
//   SITE_ORIGINS         الدومينات المسموح ترجع لها الزبونة بعد الدفع،
//                        مفصولة بفاصلة. مثال: https://zahraa-hashim.github.io
//   WAYL_API             (اختياري) الافتراضي https://api.thewayl.com
//   SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY — موجودات تلقائياً
//
//  ── النشر ──
//   Verify JWT لازم يكون **مطفي**: الصفحة العامة تناديها بالمفتاح العام،
//   و Wayl يناديها بدون أي توكن. الحماية هنا بالكود نفسه (شوف تحت).
//   بالـ CLI:  supabase functions deploy wayl-checkout --no-verify-jwt
//
//  ⚠️ أسماء حقول Wayl (lineItem · referenceId · redirectionUrl · …) مأخوذة
//  من توثيقهم العام. أول ما ينفتح حساب التاجر، طابقيها ويّا التوثيق
//  الرسمي بلوحة Wayl — كل اللي يخص Wayl محصور بقسم «③ Wayl» تحت،
//  فالتعديل بمكان واحد بس.
// ═══════════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

// ═══ ① أدوات ═══
const AR_NUM: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};
const latin = (s: unknown) => String(s ?? "").replace(/[٠-٩۰-۹]/g, (d) => AR_NUM[d]);
const bi = (v: unknown, lang = "ar"): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  const o = v as Record<string, string>;
  return o[lang] || o.ar || o.en || "";
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* نفس منطق planAmount بـ index.html — بس هنا هو المرجع الحقيقي */
function planAmount(p: Record<string, unknown>): number {
  const a = Number(p.amount);
  if (Number.isFinite(a) && a > 0) return Math.round(a);
  const digits = latin(bi(p.price, "en") || bi(p.price, "ar")).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

/* رابط الرجوع لازم يكون من دومين الموقع نفسه — وإلا الدالة تصير
   «open redirect» يستغلها أي أحد يحوّل الناس لموقع مزيّف بعد الدفع */
function safeBack(back: unknown): string | null {
  try {
    const u = new URL(String(back));
    const allowed = env("SITE_ORIGINS").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
    if (!allowed.includes(u.origin)) return null;
    if (u.protocol !== "https:" && !u.hostname.match(/^(localhost|127\.0\.0\.1)$/)) return null;
    return u.origin + u.pathname;
  } catch {
    return null;
  }
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
/* مقارنة بزمن ثابت — حتى ما ينعرف التوقيع حرف حرف من سرعة الرد */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ═══ ② حالة الدفع ═══
type Status = "pending" | "paid" | "failed";
/* Wayl يرجّع الحالة كنص — نوحّدها لثلاث حالات بس.
   ⚠️ مطابقة تامة للكلمة، مو «يحتوي على»: المطابقة الجزئية چانت تحسب
   unpaid و incomplete و unsuccessful كـ «مدفوع». أي حالة ما نعرفها
   تبقى pending — الغلط الآمن إن الطلب ينتظر، مو إنه ينحسب مدفوع.
   إذا Wayl يستعمل اسم حالة غير موجود هنا، ضيفيه للقائمة المناسبة. */
const PAID_WORDS = new Set(["complete", "completed", "paid", "success", "successful", "succeeded", "captured"]);
const FAILED_WORDS = new Set([
  "failed", "failure", "cancelled", "canceled", "expired", "rejected", "declined",
  "refunded", "voided", "void",
]);
function normStatus(raw: unknown): Status {
  const s = String(raw ?? "").trim().toLowerCase();
  if (PAID_WORDS.has(s)) return "paid";
  if (FAILED_WORDS.has(s)) return "failed";
  return "pending";
}

// ═══ ③ Wayl — كل اللي يخص API مالتهم هنا بس ═══
const WAYL_API = () => (env("WAYL_API") || "https://api.thewayl.com").replace(/\/$/, "");
const waylHeaders = () => ({
  "Content-Type": "application/json",
  "X-WAYL-AUTHENTICATION": env("WAYL_TOKEN"),
});

async function waylCreateLink(o: {
  ref: string; amount: number; label: string; webhookUrl: string; redirect: string;
}): Promise<{ url: string; raw: unknown }> {
  const res = await fetch(`${WAYL_API()}/api/v1/links`, {
    method: "POST",
    headers: waylHeaders(),
    body: JSON.stringify({
      referenceId: o.ref,
      total: o.amount,
      currency: "IQD",
      lineItem: [{ label: o.label.slice(0, 100), amount: o.amount, type: "increase" }],
      webhookUrl: o.webhookUrl,
      webhookSecret: env("WAYL_WEBHOOK_SECRET"),
      redirectionUrl: o.redirect,
    }),
  });
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`wayl ${res.status}: ${JSON.stringify(raw).slice(0, 300)}`);
  const d = (raw as Record<string, any>).data ?? raw;
  const url = d?.url ?? d?.link ?? d?.paymentUrl;
  if (typeof url !== "string" || !/^https:\/\//i.test(url)) throw new Error("wayl: no url in response");
  return { url, raw };
}

async function waylGetStatus(ref: string, amount: number): Promise<{ status: Status; raw: unknown }> {
  const res = await fetch(`${WAYL_API()}/api/v1/links/${encodeURIComponent(ref)}`, { headers: waylHeaders() });
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`wayl ${res.status}`);
  const d = (raw as Record<string, any>).data ?? raw;
  let status = normStatus(d?.status ?? d?.paymentStatus);
  /* «مدفوع» ما ينقبل إلا إذا الرد يخص هذا الطلب بالذات وبنفس المبلغ.
     الفحص يشتغل بس إذا Wayl رجّع الحقل — الحقل الناقص ما يمنع الدفع */
  if (status === "paid") {
    const gotRef = d?.referenceId ?? d?.reference;
    const gotTotal = d?.total ?? d?.amount;
    const refBad = gotRef != null && String(gotRef) !== ref;
    const totalBad = gotTotal != null && Number(gotTotal) !== amount;
    if (refBad || totalBad) {
      console.error(`wayl mismatch for ${ref}: ref=${gotRef} total=${gotTotal} expected=${amount}`);
      status = "pending";
    }
  }
  return { status, raw };
}

/* يسأل Wayl عن الطلب ويحدّث الصف — المصدر الوحيد للحقيقة.
   ما نرجّع طلب مدفوع لـ pending أبداً */
async function refreshOrder(order: Record<string, any>): Promise<Status> {
  if (order.status === "paid") return "paid";
  const { status, raw } = await waylGetStatus(order.wayl_ref || order.id, Number(order.amount));
  if (status !== order.status) {
    await db().from("orders").update({
      status,
      wayl_payload: raw,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    }).eq("id", order.id).neq("status", "paid");
  }
  return status;
}

// ═══ ④ الطلبات الثلاثة ═══
async function create(body: Record<string, unknown>, req: Request) {
  if (!env("WAYL_TOKEN") || !env("WAYL_WEBHOOK_SECRET")) return json({ error: "not_configured" }, 503);

  const back = safeBack(body.back);
  if (!back) return json({ error: "bad_origin" }, 400);

  const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
  const phone = latin(body.phone).replace(/[^\d+]/g, "");
  const lang = body.lang === "en" ? "en" : "ar";
  const idx = Number(body.plan);
  if (name.length < 2 || name.length > 80) return json({ error: "bad_name" }, 400);
  if (!/^\+?\d{10,15}$/.test(phone)) return json({ error: "bad_phone" }, 400);
  if (!Number.isInteger(idx) || idx < 0 || idx > 50) return json({ error: "bad_plan" }, 400);

  const sb = db();
  const { data: site, error: se } = await sb.from("site_info").select("plans, sections").eq("id", 1).single();
  if (se || !site) return json({ error: "site" }, 500);
  /* الكوتش طافية الدفع من اللوحة ← نرفض حتى لو أحد نادى الدالة مباشرة */
  if (!(site.sections && site.sections.pay === true)) return json({ error: "disabled" }, 403);
  const plan = Array.isArray(site.plans) ? site.plans[idx] : null;
  if (!plan) return json({ error: "bad_plan" }, 400);
  const amount = planAmount(plan);
  if (!(amount >= 1000)) return json({ error: "bad_amount" }, 400);
  const planName = bi(plan.name, "ar") || bi(plan.name, "en") || `#${idx + 1}`;

  /* حاجز بسيط ضد الإغراق: ٥ طلبات معلّقة لنفس الرقم خلال ١٠ دقايق */
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await sb.from("orders").select("id", { count: "exact", head: true })
    .eq("phone", phone).eq("status", "pending").gte("created_at", since);
  if ((count ?? 0) >= 5) return json({ error: "too_many" }, 429);

  const { data: order, error: oe } = await sb.from("orders").insert({
    plan_index: idx, plan_name: planName, amount, name, phone, lang,
  }).select().single();
  if (oe || !order) return json({ error: "order" }, 500);

  const self = new URL(req.url);
  const webhookUrl = `${self.origin}${self.pathname}?hook=1`;
  const redirect = `${back}?pay=back&order=${order.id}&k=${order.view_key}`;
  try {
    const { url, raw } = await waylCreateLink({
      ref: order.id, amount, label: `${planName} — ${name}`, webhookUrl, redirect,
    });
    await sb.from("orders").update({ wayl_ref: order.id, wayl_link: url, wayl_payload: raw }).eq("id", order.id);
    return json({ url, order: order.id });
  } catch (e) {
    console.error(e);
    await sb.from("orders").update({ status: "failed", note: String(e).slice(0, 300) }).eq("id", order.id);
    return json({ error: "wayl" }, 502);
  }
}

async function status(body: Record<string, unknown>) {
  const id = String(body.order ?? ""), key = String(body.key ?? "");
  if (!UUID.test(id) || !UUID.test(key)) return json({ error: "bad" }, 400);
  const { data: order } = await db().from("orders").select("*").eq("id", id).eq("view_key", key).maybeSingle();
  if (!order) return json({ error: "not_found" }, 404);
  let st: Status = order.status === "paid" ? "paid" : order.status === "pending" ? "pending" : "failed";
  if (st === "pending" && env("WAYL_TOKEN")) {
    try { st = await refreshOrder(order) } catch (e) { console.error(e) }
  }
  return json({ status: st });
}

async function webhook(req: Request) {
  const raw = await req.text();
  /* التوقيع: إذا Wayl دزّه، لازم يطابق. وحتى لو طابق، ما نصدّق الحالة
     المكتوبة بالإشعار — نسأل Wayl بنفسنا (refreshOrder). يعني إشعار مزيّف
     أقصى شي يسوّيه يخلّينا نسأل Wayl سؤال زايد. */
  const sig = req.headers.get("x-wayl-signature-256") ?? req.headers.get("x-wayl-signature") ?? "";
  if (sig) {
    const expect = await hmacHex(env("WAYL_WEBHOOK_SECRET"), raw);
    if (!sameText(sig.replace(/^sha256=/, "").toLowerCase(), expect)) return json({ error: "sig" }, 401);
  }
  let body: Record<string, any> = {};
  try { body = JSON.parse(raw) } catch { return json({ error: "json" }, 400) }
  const ref = String(body.referenceId ?? body.data?.referenceId ?? body.reference ?? "");
  if (!UUID.test(ref)) return json({ ok: true }); // مو طلب من عندنا — نتجاهله بهدوء
  const { data: order } = await db().from("orders").select("*").eq("id", ref).maybeSingle();
  if (!order) return json({ ok: true });
  try { await refreshOrder(order) } catch (e) { console.error(e); return json({ error: "verify" }, 502) }
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    if (new URL(req.url).searchParams.get("hook") === "1") return await webhook(req);
    const body = await req.json().catch(() => ({}));
    if (body && body.action === "status") return await status(body);
    return await create(body, req);
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
});
