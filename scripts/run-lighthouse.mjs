import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3099";
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "verification");
fs.mkdirSync(OUT_DIR, { recursive: true });

function runAudit(url, name, formFactor) {
  const jsonPath = path.join(OUT_DIR, `lighthouse-${name}.json`);
  const chromeFlags = [
    "--headless=new",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-gpu-sandbox",
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ].join(" ");

  const args = [
    path.join(ROOT, "node_modules", ".bin", "lighthouse"),
    url,
    "--output=json",
    `--output-path=${jsonPath}`,
    `--chrome-flags=${chromeFlags}`,
    "--quiet",
    "--only-categories=performance,accessibility,best-practices,seo",
  ];
  if (formFactor === "desktop") {
    args.push("--preset=desktop");
  }

  console.log(`Running Lighthouse (${formFactor}) on ${url}...`);
  execFileSync("node", args, {
    env: { ...process.env, CHROME_PATH: "/usr/bin/google-chrome" },
    stdio: "inherit",
  });

  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const scores = {
    performance: Math.round((data.categories.performance?.score || 0) * 100),
    accessibility: Math.round((data.categories.accessibility?.score || 0) * 100),
    bestPractices: Math.round((data.categories["best-practices"]?.score || 0) * 100),
    seo: Math.round((data.categories.seo?.score || 0) * 100),
    lcpMs: Math.round(data.audits["largest-contentful-paint"]?.numericValue || 0),
    tbtMs: Math.round(data.audits["total-blocking-time"]?.numericValue || 0),
    cls: +(data.audits["cumulative-layout-shift"]?.numericValue || 0).toFixed(4),
  };
  console.log(`Lighthouse ${name} (${formFactor}):`, JSON.stringify(scores));
  return scores;
}

const summary = {
  timestamp: new Date().toISOString(),
  homeMobile: runAudit(`${BASE_URL}/`, "home-mobile", "mobile"),
  homeDesktop: runAudit(`${BASE_URL}/`, "home-desktop", "desktop"),
  collectionsMobile: runAudit(`${BASE_URL}/collections`, "collections-mobile", "mobile"),
  collectionsDesktop: runAudit(`${BASE_URL}/collections`, "collections-desktop", "desktop"),
};

fs.writeFileSync(
  path.join(OUT_DIR, "lighthouse-summary.json"),
  JSON.stringify(summary, null, 2)
);
console.log("Lighthouse summary saved.");
