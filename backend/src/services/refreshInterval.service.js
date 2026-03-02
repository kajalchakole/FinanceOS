export const shouldRecalculateByDays = (cachedAt, intervalDays) => {
  if (!cachedAt) {
    return true;
  }

  const now = new Date();
  const diffMs = now - new Date(cachedAt);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= intervalDays;
};
