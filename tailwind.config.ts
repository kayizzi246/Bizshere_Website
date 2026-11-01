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
        // Client style guide: blue #157EC2 and orange #F28C28.
        // Blue is the main colour (buttons, links); orange is the accent.
        brand: {
          DEFAULT: "#157EC2",
          dark: v("brand-dark"), // hover and blue text; white text on it 7:1 in light mode
          deep: "#0E5E94", // darker brand blue: top bar, dark buttons, admin sidebar
          admin: "#0E5E94",
          tint: v("brand-tint"),
          mint: "#F28C28", // orange accent on blue panels
          sky: "#CDE4F4",
        },
        accent: {
          DEFAULT: "#F28C28", // fills, icons, large text; too light for small text on white
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
        // Client style guide: Inter for body text, Manrope for headings, navigation and titles.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "var(--font-inter)", "system-ui", "sans-serif"], // headings, nav, UI titles
        hero: ["var(--font-manrope)", "var(--font-inter)", "system-ui", "sans-serif"], // hero headlines and footer wordmark
      },
      maxWidth: { site: "1440px" }, // content width up to 1,312px inside 64px margins (wide screens use the room)
    },
  },
  plugins: [],
};

export default config;
