import type { MetadataRoute } from "next";
import { BACKGROUND_COLOR, THEME_COLOR } from "./theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Liane",
    short_name: "Liane",
    description: "Covoiturage rural et solidaire",
    start_url: "/",
    display: "standalone",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
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
      {
        src: "/web-app-manifest-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
