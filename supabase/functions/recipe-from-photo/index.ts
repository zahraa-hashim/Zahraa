// ═══════════════════════════════════════════════════════════════
//  recipe-from-photo — صورة وجبة ← مسودة وصفة
// ═══════════════════════════════════════════════════════════════
//  لوحة التحكم تدز الصورة (base64) واسم الموديل، والفنكشن:
//    ١. تتأكد إن الطالب أدمن (is_admin() بتوكن المستخدم نفسه)
//    ٢. تدز الصورة لـ Claude ويّا مخطط JSON بنفس شكل جدول recipes
//    ٣. ترجّع الوصفة للوحة — ما تكتب بالداتابيس، الحفظ يبقى بيد زهراء
//
//  المفتاح ANTHROPIC_API_KEY يُقرا من Secrets المشروع، وما يطلع للمتصفح.
//  النشر: لوحة Supabase ← Edge Functions ← Deploy a new function ← Via Editor
//  منشورة باسم smart-processor (اللوحة تطلبها بـ AI_FN)، و Verify JWT شغّال.
// ═══════════════════════════════════════════════════════════════
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/* الموديلات المسموحة فقط — اللوحة تختار منها، وأي قيمة ثانية تنرفض.
   effort: عمق التفكير. Haiku 4.5 ما يقبل effort فنتركه بدون.
   fallbacks: إذا الموديل رفض الطلب، السيرفر يعيده على موديل ثاني تلقائياً
   (Opus 5.5 و Sonnet 5.5 بس) */
const MODELS: Record<string, { effort?: "medium"; fallbacks: boolean }> = {
  "claude-opus-5-5":   { effort: "medium", fallbacks: true },
  "claude-sonnet-5-5": { effort: "medium", fallbacks: true },
  "claude-haiku-4-5":  { fallbacks: false },
};

const TAGS = ["فطور", "غداء", "عشاء", "سناك"];
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_B64 = 7_000_000; // ~٥ ميغا صورة — اللوحة تصغّرها قبل، فهذا حاجز بس

/* نفس أعمدة recipes. كل الحقول مطلوبة وماكو حقول زايدة،
   فالـ JSON اللي يرجع مضمون يطابق الفورم */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_food", "title", "tag", "duration", "servings", "kcal", "protein", "carbs", "fat",
             "ingredients", "steps", "notes"],
  properties: {
    is_food:  { type: "boolean", description: "false إذا الصورة مو أكل" },
    title:    { type: "string" },
    tag:      { type: "string", enum: TAGS },
    duration: { type: "string", description: "مثل: ٣٠ دقيقة" },
    servings: { type: "integer" },
    kcal:     { type: "integer", description: "سعرات الحصة الوحدة" },
    protein:  { type: "number", description: "غرام للحصة الوحدة" },
    carbs:    { type: "number", description: "غرام للحصة الوحدة" },
    fat:      { type: "number", description: "غرام للحصة الوحدة" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["q", "u", "n", "alt"],
        properties: {
          q:   { type: "number", description: "الكمية لكل الوصفة" },
          u:   { type: "string", description: "الوحدة: غم، مل، كوب، ملعقة كبيرة، ملعقة صغيرة، حبة…" },
          n:   { type: "string", description: "اسم المكوّن" },
          alt: { type: "array", items: { type: "string" }, description: "بدائل صحية اختيارية" },
        },
      },
    },
    steps: { type: "array", items: { type: "string" } },
    notes: { type: "string", description: "الافتراضات اللي بنيت عليها التقدير، بجملة أو جملتين" },
  },
};

const SYSTEM = `إنتِ مساعدة لمدربة لياقة وتغذية عراقية تنشر وصفات صحية بموقعها.
تستلمين صورة وجبة وترجعين وصفة كاملة تكدر المدربة تراجعها وتنشرها.

- اكتبي كل النصوص بالعربي، بأسلوب بسيط وقريب من اللهجة العراقية مثل باقي وصفات الموقع.
- السعرات والماكروز للحصة الوحدة، ومحسوبة من المكوّنات والكميات اللي كتبتيها، حتى تكون متّسقة ويّاها.
- الكميات بالغرام أو المل قدر الإمكان، وإلا بوحدات بيتية واضحة.
- قدّري الكميات من حجم الصحن والحصة الظاهرة. الزيوت والصوصات والسكر المخفي غالباً تنحسب أقل من الحقيقة، فانتبهي إلها.
- الخطوات قصيرة ومرتّبة، كل خطوة جملة أو جملتين.
- البدائل (alt) اختيارية: حطّي بديل صحي أو متوفر بالعراق بس إذا مفيد، وإلا خلّيها فارغة.
- بـ notes اكتبي باختصار شنو افترضتي (مثلاً: افترضت صدر دجاج ١٥٠ غم مشوي بملعقة زيت).
- إذا الصورة مو أكل، رجّعي is_food=false وباقي الحقول فارغة أو صفر.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  /* ── أدمن بس ── التوكن نفسه اللي ويّا الطلب، فـ auth.uid() جوّا is_admin() هو المستخدم الحقيقي */
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: isAdmin, error: adminErr } = await sb.rpc("is_admin");
  if (adminErr || isAdmin !== true) return json({ error: "forbidden" }, 403);

  let body: { image?: string; media_type?: string; model?: string; hint?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const { image = "", media_type = "", hint = "" } = body;
  const model = body.model && MODELS[body.model] ? body.model : "claude-opus-5-5";
  if (!image || image.length > MAX_B64) return json({ error: "bad_image" }, 400);
  if (!TYPES.includes(media_type)) return json({ error: "bad_type" }, 400);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "no_key" }, 500);
  const client = new Anthropic({ apiKey: key });
  const cfg = MODELS[model];

  const text = "حلّلي هالوجبة وطلّعي وصفتها." +
    (hint.trim() ? `\nملاحظة من المدربة: ${hint.trim().slice(0, 500)}` : "");

  /* ── الجواب يبدي فوراً ──
     تحليل Opus ممكن ياخذ دقيقة أو أكثر، والطريق بين المتصفح والفنكشن
     (Cloudflare) يكطع الاتصال إذا ما وصل شي خلال ~١٠٠ ثانية. فنرجّع
     الهيدرات هسه، وندز مسافة كل ٥ ثواني لحد ما يخلص التحليل، وبالأخير
     الـ JSON. المسافات قبل الـ JSON مقبولة بـ JSON.parse. الأخطاء هنا
     ترجع بـ 200 وحقل error، واللوحة تقراها من الجسم */
  const t0 = Date.now();
  console.log(`start model=${model} bytes=${image.length}`);
  const analyze = async (): Promise<Record<string, unknown>> => {
    try {
      const res = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: media_type as "image/jpeg", data: image } },
            { type: "text", text },
          ],
        }],
        output_config: {
          format: { type: "json_schema", schema: SCHEMA },
          ...(cfg.effort ? { effort: cfg.effort } : {}),
        },
        ...(cfg.fallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
      } as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming);

      if (res.stop_reason === "refusal") return { error: "refusal" };
      if (res.stop_reason === "max_tokens") return { error: "too_long" };

      const out = res.content.find((b) => b.type === "text");
      if (!out || out.type !== "text") return { error: "empty" };
      const recipe = JSON.parse(out.text);
      if (!recipe.is_food) return { error: "not_food" };

      return { recipe, model: res.model, usage: res.usage };
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return { error: "rate_limit" };
      if (e instanceof Anthropic.AuthenticationError) return { error: "bad_key" };
      if (e instanceof Anthropic.APIError) {
        // رسالة Anthropic نفسها — مثلاً «رصيدك خلص» — حتى يبين السبب الحقيقي باللوحة
        return { error: "api", status: e.status, message: e.message };
      }
      return { error: "server", message: String(e) };
    }
  };

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      ctl.enqueue(enc.encode(" "));
      const tick = setInterval(() => { try { ctl.enqueue(enc.encode(" ")); } catch { /* انسد */ } }, 5000);
      const result = await analyze();
      clearInterval(tick);
      console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`, result.error ? `error=${result.error} ${result.message ?? ""}` : "ok");
      ctl.enqueue(enc.encode(JSON.stringify(result)));
      ctl.close();
    },
  });
  return new Response(stream, { headers: { ...CORS, "Content-Type": "application/json" } });
});
