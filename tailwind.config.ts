import type { Config } from "tailwindcss";

// Brand tokens from the approved UI designs. Replace once the client sends
// final brand colours and fonts (see the client information request, items A1-A5).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Orange, black and white. Token names are kept from the original theme.
        // brand.DEFAULT is the brightest orange that still gives white text 4.5:1 contrast.
        brand: {
          DEFAULT: "#E05A00",
          dark: "#B84A00",
          deep: "#0A0A0A", // black: dark buttons, hero panel
          admin: "#0A0A0A",
          tint: "#FFF3EA",
          mint: "#FFC9A3", // light orange accent, used on black or orange
          sky: "#FFE4D1",
        },
        ink: { DEFAULT: "#0A0A0A", soft: "#2B2B2B", muted: "#6B6B6B" },
        line: { DEFAULT: "#E9E7E4", strong: "#D6D3CF" },
        page: "#FAF9F7",
        warn: { bg: "#FFF1D6", fg: "#7A4E00" },
        bad: { bg: "#FBE7E4", fg: "#8A2A1C" },
        info: { bg: "#F2F1EF", fg: "#2B2B2B" },
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
