import type { Config } from "tailwindcss";

// Neutral and tint colours read CSS variables (defined in globals.css), so the admin's
// dark mode can switch them in one place: `.theme-dark` redefines the variables.
// The public site never sets that class, so it always uses the light values.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Blue and orange sampled from the client logo (public/brand/logo-full.png), on white.
        // Blue is the main colour (buttons, links); orange is the accent.
        brand: {
          DEFAULT: "#0072CE",
          dark: v("brand-dark"), // hover and blue text; white text on it 7:1 in light mode
          deep: "#005BA6", // darker logo blue: top bar, dark buttons, admin sidebar
          admin: "#005BA6",
          tint: v("brand-tint"),
          mint: "#FE8302", // orange accent on blue panels
          sky: "#CFE5F7",
        },
        accent: {
          DEFAULT: "#FE8302", // fills, icons, large text; too light for small text on white
          dark: v("accent-dark"), // orange small text (5:1 on white)
          tint: v("accent-tint"),
        },
        surface: v("surface"), // cards and panels (white in light mode)
        heading: v("heading"), // headings (near-black in light mode)
        ink: { DEFAULT: v("ink"), soft: v("ink-soft"), muted: v("ink-muted") },
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        page: v("page"), // light panels and hovers; the body itself is white (globals.css)
        warn: { bg: v("warn-bg"), fg: v("warn-fg") },
        bad: { bg: v("bad-bg"), fg: v("bad-fg") },
        info: { bg: v("info-bg"), fg: v("info-fg") },
      },
      fontFamily: {
        // Inter for everything; `font-display` (headings and titles) is kept as a name for heavier, tighter settings.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"], // headings use Inter too; the class name stays
        hero: ["var(--font-hero)", "var(--font-inter)", "system-ui", "sans-serif"], // hero headlines and footer wordmark
      },
      maxWidth: { site: "1440px" }, // content width up to 1,312px inside 64px margins (wide screens use the room)
    },
  },
  plugins: [],
};

export default config;
