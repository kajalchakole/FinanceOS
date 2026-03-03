import React from "react";

const variantStyles = {
  hero: {
    container: "app-surface-card h-full p-6 transition-all duration-200 ease-out hover:-translate-y-[2px]",
    label: "text-sm text-gray-500 dark:text-[#9CA3AF]",
    value: "mt-2 text-2xl font-semibold text-gray-900 dark:text-[#F3F4F6]",
    helper: "mt-1 text-xs text-gray-400 dark:text-[#6B7280]"
  },
  compact: {
    container: "app-surface-card h-full p-6 transition-all duration-200 ease-out hover:-translate-y-[2px]",
    label: "text-sm text-gray-500 dark:text-[#9CA3AF]",
    value: "mt-2 text-2xl font-semibold text-gray-900 dark:text-[#F3F4F6]",
    helper: "mt-1 text-xs text-gray-400 dark:text-[#6B7280]"
  }
};

function MetricCard({ variant = "hero", label, value, helper, valueClassName = "" }) {
  const styles = variantStyles[variant] || variantStyles.hero;

  return (
    <article className={styles.container}>
      <p className={styles.label}>{label}</p>
      <p className={`${styles.value} ${valueClassName}`}>{value}</p>
      {helper ? <p className={styles.helper}>{helper}</p> : null}
    </article>
  );
}

export default MetricCard;
