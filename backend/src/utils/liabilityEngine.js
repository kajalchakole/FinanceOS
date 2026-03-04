const toDate = (value, fallback = new Date()) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed;
};

const clampMonths = (months, tenureMonths) => Math.max(0, Math.min(months, Math.max(0, Number(tenureMonths || 0))));

export const round2 = (value) => Number(Number(value || 0).toFixed(2));

export const monthsBetween = (startDate, asOfDate = new Date()) => {
  const start = toDate(startDate);
  const end = toDate(asOfDate);

  if (end <= start) {
    return 0;
  }

  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();

  const monthAnchor = new Date(start);
  monthAnchor.setMonth(start.getMonth() + months);
  if (monthAnchor > end) {
    months -= 1;
  }

  return Math.max(0, months);
};

export const computeOutstandingReducing = ({
  principalAmount,
  interestRateAnnual,
  emiAmount,
  startDate,
  tenureMonths,
  asOfDate = new Date()
}) => {
  const principal = Math.max(0, Number(principalAmount || 0));
  const emi = Math.max(0, Number(emiAmount || 0));
  const monthlyRate = (Number(interestRateAnnual || 0) / 100) / 12;
  const monthsElapsed = clampMonths(monthsBetween(startDate, asOfDate), tenureMonths);

  let outstanding = principal;

  for (let index = 0; index < monthsElapsed; index += 1) {
    const interest = outstanding * monthlyRate;
    const principalPaid = Math.max(0, emi - interest);
    outstanding = Math.max(0, outstanding - principalPaid);

    if (outstanding <= 0) {
      outstanding = 0;
      break;
    }
  }

  return {
    outstanding,
    monthsElapsed,
    monthsRemaining: Math.max(0, Number(tenureMonths || 0) - monthsElapsed),
    isClosed: outstanding <= 0
  };
};

export const computeOutstandingFlat = ({
  principalAmount,
  interestRateAnnual,
  startDate,
  tenureMonths,
  asOfDate = new Date()
}) => {
  const principal = Math.max(0, Number(principalAmount || 0));
  const tenure = Math.max(0, Number(tenureMonths || 0));
  const years = tenure / 12;
  const totalInterest = principal * (Number(interestRateAnnual || 0) / 100) * years;
  const totalPayable = principal + totalInterest;
  const monthlyPrincipalReduction = tenure > 0 ? principal / tenure : principal;
  const monthsElapsed = clampMonths(monthsBetween(startDate, asOfDate), tenure);
  const outstanding = Math.max(0, principal - (monthlyPrincipalReduction * monthsElapsed));

  return {
    outstanding,
    monthsElapsed,
    monthsRemaining: Math.max(0, tenure - monthsElapsed),
    isClosed: outstanding <= 0,
    totalInterest,
    totalPayable
  };
};

export const computeLiability = (liability, asOfDate = new Date()) => {
  const manualOverride = liability?.manualOutstandingOverride;
  const tenure = Math.max(0, Number(liability?.tenureMonths || 0));
  const monthsElapsed = clampMonths(monthsBetween(liability?.startDate, asOfDate), tenure);

  if (manualOverride !== null && manualOverride !== undefined) {
    const outstanding = Math.max(0, Number(manualOverride || 0));
    return {
      outstanding,
      monthsElapsed,
      monthsRemaining: Math.max(0, tenure - monthsElapsed),
      isClosed: outstanding <= 0
    };
  }

  if ((liability?.interestCalculationType || "reducing") === "flat") {
    return computeOutstandingFlat({ ...liability, asOfDate });
  }

  return computeOutstandingReducing({ ...liability, asOfDate });
};

