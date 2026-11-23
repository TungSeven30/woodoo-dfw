import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";
import sharp from "sharp";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3099";
const ROOT = process.cwd();
const TIER_C_DIR = path.join(ROOT, "public", "tier-c");
const OG_DIR = path.join(ROOT, "public", "og");
const TMP_DIR = path.join(ROOT, "verification", "tmp-export");

fs.mkdirSync(TIER_C_DIR, { recursive: true });
fs.mkdirSync(OG_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const SCENE_T = [0.015, 0.10, 0.285, 0.355, 0.445, 0.61, 0.75, 0.87, 0.975];

async function run() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu-sandbox",
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
    ],
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${BASE_URL}/?tier=A`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__filmControl), { timeout: 20000 });
  // Give KTX2 / WebP textures & HDRI time to load into GPU
  await page.waitForTimeout(2600);

  // 1. Export all 9 Tier C Scene Stills directly from live WebGL canvas (clean artwork, no UI overlay)
  for (let i = 0; i < SCENE_T.length; i++) {
    const t = SCENE_T[i];
    await page.evaluate((val) => {
      window.__filmControl?.setProgress(val);
    }, t);
    await page.waitForTimeout(260);
    const dataUrl = await page.evaluate(() => window.__filmControl?.capture() || "");
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const buf = Buffer.from(base64, "base64");
    const outPath = path.join(TIER_C_DIR, `scene-${i}.webp`);
    await sharp(buf).resize(1280, 800, { fit: "cover" }).webp({ quality: 82 }).toFile(outPath);
    console.log(`Exported Tier C still: scene-${i}.webp (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
  }

  // 2. Export Tier C Muted Video Loops (<= 1.5 MB each!) directly from live WebGL canvas
  const exportLoop = async (name, tStart, tEnd, frames) => {
    const frameDir = path.join(TMP_DIR, name);
    fs.rmSync(frameDir, { recursive: true, force: true });
    fs.mkdirSync(frameDir, { recursive: true });
    for (let f = 0; f < frames; f++) {
      const frac = f / Math.max(1, frames - 1);
      const t = tStart + (tEnd - tStart) * frac;
      await page.evaluate((val) => window.__filmControl?.setProgress(val), t);
      await page.waitForTimeout(25);
      const dataUrl = await page.evaluate(() => {
        const c = document.querySelector("canvas");
        return c ? c.toDataURL("image/jpeg", 0.86) : "";
      });
      const buf = Buffer.from(dataUrl.replace(/^data:image\/jpeg;base64,/, ""), "base64");
      const jpgPath = path.join(frameDir, `f_${String(f).padStart(4, "0")}.jpg`);
      fs.writeFileSync(jpgPath, buf);
    }
    const mp4Out = path.join(TIER_C_DIR, `${name}.mp4`);
    execFileSync("ffmpeg", [
      "-y",
      "-v", "error",
      "-framerate", "12",
      "-i", path.join(frameDir, "f_%04d.jpg"),
      "-vf", "scale=960:600:force_original_aspect_ratio=increase,crop=960:600",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-crf", "26",
      "-movflags", "+faststart",
      "-an",
      mp4Out,
    ]);
    console.log(`Exported Tier C loop: ${name}.mp4 (${(fs.statSync(mp4Out).size / 1024).toFixed(1)} KB)`);
  };

  await exportLoop("loop-flight", 0.14, 0.30, 36);
  await exportLoop("loop-reconfig", 0.65, 0.815, 42);

  // 3. Export Open Graph Images (1200x630) directly from live 3D renders
  const writeOg = async (rawPngBuf, outName, label, subtitle) => {
    const svg = Buffer.from(`
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#131110" stop-opacity="0.15"/>
            <stop offset="55%" stop-color="#131110" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="#131110" stop-opacity="0.88"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#g)"/>
        <rect x="56" y="472" width="4" height="96" fill="#d18d43"/>
        <text x="80" y="514" fill="#f1eee7" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="600" letter-spacing="-1.5" font-size="54">${label}</text>
        <text x="80" y="556" fill="#cfc8bd" font-family="sans-serif" font-size="24">${subtitle}</text>
        <text x="1144" y="592" text-anchor="end" fill="#b6aea3" font-family="monospace" font-size="16" letter-spacing="2">CONCEPT RENDER · DALLAS–FORT WORTH</text>
      </svg>
    `);
    const outPath = path.join(OG_DIR, `${outName}.png`);
    await sharp(rawPngBuf)
      .resize(1200, 630, { fit: "cover" })
      .composite([{ input: svg }])
      .png({ compressionLevel: 8 })
      .toFile(outPath);
    console.log(`Exported OG image: ${outName}.png (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
  };

  // Home OG from Scene 5 L-Shape Oak
  await page.evaluate(() => window.__filmControl?.setProgress(0.61));
  await page.waitForTimeout(200);
  const homePng = Buffer.from(
    (await page.evaluate(() => window.__filmControl?.capture() || "")).replace(/^data:image\/png;base64,/, ""),
    "base64"
  );
  await writeOg(homePng, "home", "It arrives flat. It leaves whole.", "Frameless European RTA cabinetry for Dallas–Fort Worth");
  await writeOg(homePng, "traditional-shaker", "Traditional Shaker", "Premium Oak · Classic Walnut · Iron Black · Frosty White");

  // Slim Shaker OG from Scene 6 Beat 2 Iron Black Galley
  await page.evaluate(() => window.__filmControl?.setProgress(0.705));
  await page.waitForTimeout(200);
  const slimPng = Buffer.from(
    (await page.evaluate(() => window.__filmControl?.capture() || "")).replace(/^data:image\/png;base64,/, ""),
    "base64"
  );
  await writeOg(slimPng, "slim-shaker", "Slim Shaker", "Premium Oak · Iron Black · Frosty White");

  // Flat & Island OG from Scene 6 Beat 3 Classic Walnut 10ft Island
  await page.evaluate(() => window.__filmControl?.setProgress(0.765));
  await page.waitForTimeout(200);
  const flatPng = Buffer.from(
    (await page.evaluate(() => window.__filmControl?.capture() || "")).replace(/^data:image\/png;base64,/, ""),
    "base64"
  );
  await writeOg(flatPng, "flat", "Flat Collection", "Ivory Oak · Classic Walnut · Frosty White");
  await writeOg(flatPng, "island", "Compose Your Kitchen", "Five finishes · Three door styles · 8, 9, and 10 ft ceilings");

  await browser.close();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  console.log("All Tier C stills, video loops, and OG images exported successfully.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
