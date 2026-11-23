import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_CONFIG.SITE_URL.replace(/\/$/, "");
  const routes = [
    "",
    "/collections",
    "/collections/traditional-shaker",
    "/collections/slim-shaker",
    "/collections/flat",
    "/compose",
    "/precision",
    "/trade",
    "/trade/send-a-plan",
    "/showroom",
    "/process",
    "/about",
    "/faq",
    "/contact",
    "/legal/privacy",
    "/legal/terms",
  ];
  const now = new Date();
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/compose" ? "weekly" : "monthly",
    priority: route === "" ? 1.0 : route.startsWith("/trade") || route === "/compose" ? 0.9 : 0.8,
  }));
}
