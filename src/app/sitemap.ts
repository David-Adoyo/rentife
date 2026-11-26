import type { MetadataRoute } from "next";

// TODO: replace with the production domain once {{DOMAIN}} is confirmed.
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/for-landlords", "/how-it-works", "/for-agents", "/for-diaspora-owners", "/pricing", "/security", "/book-setup"].map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: "monthly",
    priority: p === "" ? 1 : 0.7,
  }));
}
