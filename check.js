// Runs on GitHub Actions every hour. Checks each site and appends the result to status.json.
const fs = require("fs");

/* ====== CONFIG: edit this ====== */
const SITES = [
  { name: "JohnHost Website", url: "https://johndinglesin.github.io/JohnHostWebsite" },
];
const MARKER = "status-heartbeat";   // text the heartbeat snippet puts in your index.html
const TIMEOUT_MS = 15000;
const HISTORY_LEN = 168;             // 7 days of hourly checks
/* ================================ */

async function check(site) {
  try {
    const res = await fetch(site.url + (site.url.includes("?") ? "&" : "?") + "_c=" + Date.now(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Cache-Control": "no-cache", "User-Agent": "status-page-checker" },
    });
    const body = await res.text();
    return res.ok && body.includes(MARKER);
  } catch (e) {
    return false;
  }
}

(async () => {
  let data = { lastRun: 0, sites: {} };
  try { data = JSON.parse(fs.readFileSync("status.json", "utf8")); } catch (e) {}
  data.sites = data.sites || {};

  const now = Date.now();
  const results = await Promise.all(SITES.map(async s => ({ s, ok: await check(s) })));
  for (const { s, ok } of results) {
    const rec = data.sites[s.url] || (data.sites[s.url] = { name: s.name, history: [] });
    rec.name = s.name;
    rec.history.push({ t: now, ok });
    rec.history = rec.history.slice(-HISTORY_LEN);
    console.log(`${s.name}: ${ok ? "running" : "DOWN"}`);
  }
  data.lastRun = now;
  fs.writeFileSync("status.json", JSON.stringify(data));
})();
