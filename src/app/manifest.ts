import type { MetadataRoute } from "next";

/**
 * Makes the site installable: "Add to home screen" puts BizSphere-Ug on the phone like an app, with its
 * icon, opening full screen in the site's navy (client request, 9 Nov 2026). The invitation to install
 * is src/components/InstallPrompt.tsx; iPhones use apple-icon.png next to this file.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BizSphere-Ug: B2B Information Portal",
    short_name: "BizSphere-Ug",
    description: "Market prices, business ideas, suppliers, machines, funding and experts for business in Uganda.",
    start_url: "/?from=app",
    scope: "/",
    display: "standalone",
    background_color: "#0d1117",
    theme_color: "#0d1117",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
