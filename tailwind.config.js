/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#0d1021",
          900: "#11152c",
          850: "#171b33",
          800: "#1d2242",
          700: "#272d55",
          600: "#363e73",
        },
        amber: {
          glow: "#f5b942",
          deep: "#d99a26",
          soft: "#ffd98a",
        },
        parchment: {
          50: "#faf6ea",
          100: "#f5efe2",
          200: "#ece4cf",
          300: "#d9cfb2",
          400: "#b3a888",
        },
      },
      fontFamily: {
        display: ["\"DM Serif Display\"", "Georgia", "serif"],
        body: ["\"Public Sans\"", "Inter", "system-ui", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(245,185,66,0.35), 0 8px 32px rgba(245,185,66,0.18)",
        card: "0 10px 30px rgba(2,4,16,0.45)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
