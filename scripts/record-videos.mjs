/**
 * Woodoo DFW — Final Desktop (1280x720) & Mobile Portrait (390x844) 65s Film Video Recorder
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3099";
const ROOT = process.cwd();
const VERIFY_DIR = path.join(ROOT, "verification");
const TMP_REC = path.join(VERIFY_DIR, "tmp-vid");
fs.mkdirSync(TMP_REC, { recursive: true });

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu-sandbox",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });

  try {
    // 1. Desktop 1280x720 (Tier A)
    console.log("=== Recording final 62s desktop Film video (1280x720) ===");
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${BASE_URL}/?tier=A`, { waitUntil: "load" });
    await page.waitForFunction(
      () => Boolean(window.__filmControl && typeof window.__filmControl.setProgress === "function"),
      null,
      { timeout: 30000 }
    );
    await page.waitForTimeout(1600);

    const deskDir = path.join(TMP_REC, "desktop");
    fs.rmSync(deskDir, { recursive: true, force: true });
    fs.mkdirSync(deskDir, { recursive: true });
    const totalDeskFrames = 42;
    for (let f = 0; f < totalDeskFrames; f++) {
      let t = 0;
      if (f < 34) {
        t = f / 33;
      } else if (f < 36) {
        t = 1.0;
      } else {
        const rev = (f - 36) / (totalDeskFrames - 37);
        t = 0.78 - rev * 0.62;
      }
      await page.evaluate((val) => window.__filmControl?.setProgress(val), t);
      await page.waitForTimeout(15);
      await page.screenshot({
        path: path.join(deskDir, `f_${String(f).padStart(4, "0")}.jpg`),
        type: "jpeg",
        quality: 84,
      });
    }
    const deskVideo = path.join(VERIFY_DIR, "film-desktop.mp4");
    execFileSync("ffmpeg", [
      "-y",
      "-v", "error",
      "-framerate", "0.65",
      "-i", path.join(deskDir, "f_%04d.jpg"),
      "-vf", "minterpolate=fps=24:mi_mode=blend",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-crf", "23",
      "-movflags", "+faststart",
      "-an",
      deskVideo,
    ]);
    console.log(`Desktop video saved: ${(fs.statSync(deskVideo).size / 1024 / 1024).toFixed(2)} MB`);
    await page.close();

    // 2. Mobile Portrait 390x844 (Tier B)
    console.log("=== Recording final 62s mobile portrait Film video (390x844) ===");
    const mobPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await mobPage.goto(`${BASE_URL}/?tier=B`, { waitUntil: "load" });
    await mobPage.waitForFunction(
      () => Boolean(window.__filmControl && typeof window.__filmControl.setProgress === "function"),
      null,
      { timeout: 30000 }
    );
    await mobPage.waitForTimeout(1400);

    const mobDir = path.join(TMP_REC, "mobile");
    fs.rmSync(mobDir, { recursive: true, force: true });
    fs.mkdirSync(mobDir, { recursive: true });
    const totalMobFrames = 42;
    for (let f = 0; f < totalMobFrames; f++) {
      const t = f < 36 ? f / 35 : 0.76 - ((f - 36) / 5) * 0.58;
      await mobPage.evaluate((val) => window.__filmControl?.setProgress(val), t);
      await mobPage.waitForTimeout(15);
      await mobPage.screenshot({
        path: path.join(mobDir, `f_${String(f).padStart(4, "0")}.jpg`),
        type: "jpeg",
        quality: 82,
      });
    }
    const mobVideo = path.join(VERIFY_DIR, "film-mobile.mp4");
    execFileSync("ffmpeg", [
      "-y",
      "-v", "error",
      "-framerate", "0.65",
      "-i", path.join(mobDir, "f_%04d.jpg"),
      "-vf", "minterpolate=fps=24:mi_mode=blend",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-crf", "24",
      "-movflags", "+faststart",
      "-an",
      mobVideo,
    ]);
    console.log(`Mobile video saved: ${(fs.statSync(mobVideo).size / 1024 / 1024).toFixed(2)} MB`);
    await mobPage.close();
  } finally {
    await browser.close();
    fs.rmSync(TMP_REC, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
