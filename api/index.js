export const config = { runtime: "edge" };

const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

const STRIP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

export default async function handler(req) {
  // ارور ۴۰۴ خالی به جای ارور ۵۰۰ تابلو
  if (!TARGET_BASE) {
    return new Response(null, { status: 404 });
  }

  try {
    const pathStart = req.url.indexOf("/", 8);
    const targetUrl =
      pathStart === -1 ? TARGET_BASE + "/" : TARGET_BASE + req.url.slice(pathStart);

    const out = new Headers();  
    let clientIp = null;  
    
    for (const [k, v] of req.headers) {  
      const lowerK = k.toLowerCase();
      if (STRIP_HEADERS.has(lowerK)) continue;  
      if (lowerK.startsWith("x-vercel-")) continue;  
      if (lowerK === "x-real-ip") {  
        clientIp = v;  
        continue;  
      }  
      if (lowerK === "x-forwarded-for") {  
        if (!clientIp) clientIp = v;  
        continue;  
      }  
      out.set(k, v);  
    }  
    
    if (clientIp) out.set("x-forwarded-for", clientIp);  

    // شبیه‌سازی مرورگر عادی در صورتی که کلاینت (مثل V2ray) یوزر-ایجنت ارسال نکند
    if (!out.has("user-agent")) {
      out.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    }

    const method = req.method;  
    const hasBody = method !== "GET" && method !== "HEAD";  

    return await fetch(targetUrl, {  
      method,  
      headers: out,  
      body: hasBody ? req.body : undefined,  
      duplex: "half",  
      redirect: "manual",  
    });

  } catch (err) {
    // حذف کامل لاگ کنسول برای جلوگیری از ثبت در سیستم مانیتورینگ
    // برگرداندن ارور ۴۰۴ (پیدا نشد) به جای ۵۰۲ (خطای گیت‌وی)
    return new Response(null, { status: 404 });
  }
}
