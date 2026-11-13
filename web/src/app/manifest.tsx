import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Liane",
    short_name: "Liane",
    description: "Covoiturage rural et solidaire",
    start_url: "/",
    display: "standalone",
    background_color: "#1f2937",
    theme_color: "#10b981",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
