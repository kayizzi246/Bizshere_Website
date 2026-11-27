import type { Config } from "tailwindcss";

// Neutral and tint colours read CSS variables (defined in globals.css), so the admin's
// dark mode can switch them in one place: `.theme-dark` redefines the variables.
// The public site never sets that class, so it always uses the light values.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // hover: styles apply only where a real pointer can hover. On touch screens a tap would otherwise
  // leave the hover look stuck on.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    // One step smaller than Tailwind's defaults (client, 27 Nov 2026: "reduce the font sizes of the all site").
    fontSize: {
      xs: ["0.719rem", { lineHeight: "1rem" }], // 11.5px
      sm: ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
      base: ["0.9375rem", { lineHeight: "1.5rem" }], // 15px
      lg: ["1.0625rem", { lineHeight: "1.6rem" }], // 17px
      xl: ["1.1875rem", { lineHeight: "1.7rem" }], // 19px
      "2xl": ["1.375rem", { lineHeight: "1.9rem" }], // 22px
      "3xl": ["1.625rem", { lineHeight: "2.1rem" }], // 26px
      "4xl": ["2rem", { lineHeight: "2.4rem" }], // 32px
      "5xl": ["2.5rem", { lineHeight: "1.1" }], // 40px
      "6xl": ["3.25rem", { lineHeight: "1.05" }], // 52px
      "7xl": ["4rem", { lineHeight: "1" }], // 64px
    },
    extend: {
      colors: {
        // GitHub (Primer) palette (client, 14 Nov 2026): blue #0969da (links/selected), green #1f883d (primary).
        // Blue is the main colour (buttons, links); orange is the accent.
        navy: "#0d1117", // GitHub dark canvas behind every hero (client, 14 Nov 2026)
        brand: {
          DEFAULT: "#0969da",
          dark: v("brand-dark"), // hover and blue text; white text on it 7:1 in light mode
          deep: "#0550ae", // darker GitHub blue: top bar, dark buttons, admin sidebar
          admin: "#0550ae",
          tint: v("brand-tint"),
          mint: "#F28C28", // logo orange accent
          sky: "#b6e3ff",
        },
        accent: {
          DEFAULT: "#F28C28", // logo orange: primary fills, icons
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
      // Inter is never heavier than Semibold (client, 24 Nov 2026). Manrope goes up to ExtraBold: see .font-display in globals.css.
      fontWeight: { medium: "500", semibold: "600", bold: "600", extrabold: "600", black: "600" },
      fontFamily: {
        // Two fonts (client, 24 Nov 2026): Inter for text, forms and buttons; "display" and "hero" are Manrope.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-heading)", "system-ui", "sans-serif"], // headings, nav, UI titles
        hero: ["var(--font-heading)", "system-ui", "sans-serif"], // hero headlines and footer wordmark
      },
      // Motion defaults: a strong ease-out and a short duration, so everything answers at once. "scale"
      // is included for the press feedback in globals.css.
      transitionTimingFunction: { DEFAULT: "cubic-bezier(0.23, 1, 0.32, 1)", out: "cubic-bezier(0.23, 1, 0.32, 1)" },
      transitionDuration: { DEFAULT: "160ms" },
      transitionProperty: {
        DEFAULT: "color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter, scale",
        colors: "color, background-color, border-color, text-decoration-color, fill, stroke, scale",
      },
      maxWidth: { site: "1440px" }, // content width up to 1,312px inside 64px margins (wide screens use the room)
      // Open/close movement for the Radix-based components in src/components/ui. Radix sets
      // data-state="open"/"closed" and keeps the element mounted until the animation ends, so a
      // panel can fade out instead of vanishing.
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        // A wide gradient slid back and forth behind a button, so its colour is always moving. The
        // element keeps one background and only its position changes, which the compositor handles.
        sheen: { "0%, 100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
      },
      animation: {
        "accordion-down": "accordion-down 160ms cubic-bezier(0.23, 1, 0.32, 1)",
        "accordion-up": "accordion-up 160ms cubic-bezier(0.23, 1, 0.32, 1)",
        // Slow on purpose: at this speed it reads as a living surface. Any faster and it draws the
        // eye away from the words on the button.
        sheen: "sheen 7s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
