import React from "react";

const variantStyles = {
  hero: {
    container: "rounded-2xl border border-brand-line bg-brand-panel p-6 shadow-soft h-full",
    label: "text-sm text-brand-muted",
    value: "mt-3 text-3xl font-semibold tracking-tight text-brand-text",
    helper: "mt-1 text-xs text-brand-muted"
  },
  compact: {
    container: "rounded-2xl border border-brand-line bg-slate-50 p-4 h-full",
    label: "text-xs text-brand-muted",
    value: "mt-2 text-xl font-medium tracking-tight text-brand-text",
    helper: "mt-1 text-xs text-brand-muted"
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
