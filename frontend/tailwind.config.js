/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#F8FAFC",
          panel: "#ffffff",
          text: "#111827",
          muted: "#6b7280",
          line: "#e5e7eb"
        }
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.04)"
      }
    }
  },
  plugins: []
};
