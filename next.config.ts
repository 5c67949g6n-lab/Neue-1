import type { NextConfig } from "next";

// Cache Components sind bewusst aus: Fast jede Seite ist nutzerbezogen (Auth + RLS),
// das klassische dynamische Rendering ist hier einfacher und robuster.
const nextConfig: NextConfig = {
  experimental: {
    // erlaubt forbidden() für Admin-Bereiche (rendert src/app/forbidden.tsx)
    authInterrupts: true,
    serverActions: {
      // Einzelne Ausweis-/Fotouploads (werden im Browser vorab verkleinert)
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
