import React, { useEffect, useState } from "react";

const STORAGE_KEYS = ["financeos-theme", "theme"];

const getStoredTheme = () => {
  for (const key of STORAGE_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value === "dark" || value === "light") {
      return value;
    }
  }
  return "";
};

const persistTheme = (theme) => {
  STORAGE_KEYS.forEach((key) => {
    window.localStorage.setItem(key, theme);
  });
};

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
      const nextIsDark = storedTheme === "dark";
      document.documentElement.classList.toggle("dark", nextIsDark);
      document.body.classList.toggle("dark", nextIsDark);
      setIsDark(nextIsDark);
      return;
    }
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const handleToggle = () => {
    const nextIsDark = !isDark;
    document.documentElement.classList.toggle("dark", nextIsDark);
    document.body.classList.toggle("dark", nextIsDark);
    persistTheme(nextIsDark ? "dark" : "light");
    setIsDark(nextIsDark);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:bg-gray-100 dark:border-[#1F2937] dark:bg-[#161D26] dark:text-[#F3F4F6] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)] dark:hover:bg-[#1A222C]"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2.5v2.25M12 19.25v2.25M4.22 4.22l1.6 1.6M18.18 18.18l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.22 19.78l1.6-1.6M18.18 5.82l1.6-1.6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}

export default ThemeToggle;
