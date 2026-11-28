import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // react-pdf's PDF engine (pdfkit) reads its built-in fonts from its own package folder at runtime,
  // so it must not be bundled, and those font files must ship with the server functions.
  serverExternalPackages: ["@react-pdf/renderer", "pdfkit"],
  outputFileTracingIncludes: { "/app/**": ["./node_modules/pdfkit/js/standard-fonts/**", "./node_modules/pdfkit/js/data/**"] },
  experimental: { optimizePackageImports: ["@phosphor-icons/react"] },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      { source: "/admin", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Frame-Options", value: "DENY" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
