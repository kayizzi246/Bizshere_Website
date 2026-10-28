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
          DEFAULT: "#0172CE",
          dark: v("brand-dark"), // hover and blue text; white text on it 7:1 in light mode
          deep: "#06294A", // navy: top bar, hero, footer, dark buttons
          admin: "#06294A",
          tint: v("brand-tint"),
          mint: "#FD7C04", // orange accent on navy panels
          sky: "#CFE5F7",
        },
        accent: {
          DEFAULT: "#FD7C04", // fills, icons, large text; too light for small text on white
          dark: v("accent-dark"), // orange small text (5:1 on white)
          tint: v("accent-tint"),
        },
        surface: v("surface"), // cards and panels (white in light mode)
        heading: v("heading"), // headings (navy in light mode)
        ink: { DEFAULT: v("ink"), soft: v("ink-soft"), muted: v("ink-muted") },
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        page: v("page"), // light panels and hovers; the body itself is white (globals.css)
        warn: { bg: v("warn-bg"), fg: v("warn-fg") },
        bad: { bg: v("bad-bg"), fg: v("bad-fg") },
        info: { bg: v("info-bg"), fg: v("info-fg") },
      },
      fontFamily: {
        // Inter for body copy and UI controls; Manrope (`font-display`) for headings and titles.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      maxWidth: { site: "1320px" },
    },
  },
  plugins: [],
};

export default config;
