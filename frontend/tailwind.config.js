/** @type {import("tailwindcss").Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "rgb(var(--color-brand-bg) / <alpha-value>)",
          panel: "rgb(var(--color-brand-panel) / <alpha-value>)",
          text: "rgb(var(--color-brand-text) / <alpha-value>)",
          muted: "rgb(var(--color-brand-muted) / <alpha-value>)",
          line: "rgb(var(--color-brand-line) / <alpha-value>)"
        }
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.04)"
      }
    }
  },
  plugins: []
};
