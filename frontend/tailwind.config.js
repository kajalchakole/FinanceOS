/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#f8fafc",
          panel: "#ffffff",
          text: "#0f172a",
          muted: "#64748b",
          line: "#e2e8f0"
        }
      },
      boxShadow: {
        soft: "0 8px 24px -12px rgba(15, 23, 42, 0.18)"
      }
    }
  },
  plugins: []
};
