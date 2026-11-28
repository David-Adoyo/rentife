import type { MetadataRoute } from "next";

// Public address, set by NEXT_PUBLIC_SITE_URL (https://rentife.co.ke in production).
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rentife.co.ke";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/for-landlords", "/how-it-works", "/for-agents", "/for-diaspora-owners", "/pricing", "/security", "/book-setup"].map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: "monthly",
    priority: p === "" ? 1 : 0.7,
  }));
}
