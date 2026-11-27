/** Probe TTFB and weight for key URLs (mobile UA + desktop UA). */
const https = require("https");
const { performance } = require("perf_hooks");

const URLS = [
  "https://granit-karel.ru/",
  "https://granit-karel.ru/produkciya.html",
  "https://granit-karel.ru/galereya.html",
  "https://granit-karel.ru/kontakty.html",
  "https://granit-karel.ru/css/styles.css",
  "https://granit-karel.ru/js/lead.js",
  "https://granit-karel.ru/images/products/bruschatka/002_kubiki-v-cehe.webp"
];

const UA = {
  desktop:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  mobile:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
};

function fetchOnce(url, ua) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    let ttfb = null;
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": ua,
          Accept: "*/*",
          "Accept-Encoding": "identity"
        },
        timeout: 20000
      },
      (res) => {
        ttfb = performance.now() - start;
        let bytes = 0;
        res.on("data", (chunk) => {
          bytes += chunk.length;
        });
        res.on("end", () => {
          resolve({
            url,
            status: res.statusCode,
            ttfbMs: Math.round(ttfb),
            totalMs: Math.round(performance.now() - start),
            bytes,
            kb: Math.round(bytes / 1024),
            type: res.headers["content-type"] || ""
          });
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
  });
}

async function run(label, ua) {
  console.log(`\n=== ${label} ===`);
  const rows = [];
  for (const url of URLS) {
    const row = await fetchOnce(url, ua);
    rows.push(row);
    console.log(
      `${row.status} TTFB ${row.ttfbMs}ms total ${row.totalMs}ms ${row.kb}KB  ${url.replace("https://granit-karel.ru", "") || "/"}`
    );
  }
  return rows;
}

(async () => {
  const desktop = await run("desktop", UA.desktop);
  const mobile = await run("mobile", UA.mobile);
  const out = { at: new Date().toISOString(), desktop, mobile };
  require("fs").writeFileSync(
    require("path").join(__dirname, "speed-probe-report.json"),
    JSON.stringify(out, null, 2)
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
