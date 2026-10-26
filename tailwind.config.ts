import type { Config } from "tailwindcss";

// Brand tokens from the approved UI designs. Replace once the client sends
// final brand colours and fonts (see the client information request, items A1-A5).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1D6B45",
          dark: "#14502F",
          deep: "#0F3D27",
          admin: "#0F2A1D",
          tint: "#E5F2EA",
          mint: "#9FD3B3",
        },
        ink: { DEFAULT: "#16201A", soft: "#2A352F", muted: "#55605A" },
        line: { DEFAULT: "#E3E6E1", strong: "#C9CEC7" },
        page: "#F6F7F4",
        warn: { bg: "#FFF1D6", fg: "#7A4E00" },
        bad: { bg: "#FBE7E4", fg: "#8A2A1C" },
        info: { bg: "#E6EEF8", fg: "#1F4778" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: { site: "1320px" },
    },
  },
  plugins: [],
};

export default config;
