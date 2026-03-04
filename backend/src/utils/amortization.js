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

export const round2 = (value) => Number(Number(value || 0).toFixed(2));

export const monthsBetween = (startDate, endDate = new Date()) => {
  const start = toDate(startDate);
  const end = toDate(endDate);

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

const clampMonths = (months, tenureMonths) => Math.max(0, Math.min(months, Number(tenureMonths || 0)));

export const computeOutstanding = ({
  principalAmount,
  interestRateAnnual,
  emiAmount,
  startDate,
  tenureMonths,
  asOfDate = new Date()
}) => {
  const principal = Math.max(0, Number(principalAmount || 0));
  const annualRate = Number(interestRateAnnual || 0);
  const emi = Math.max(0, Number(emiAmount || 0));
  const monthsElapsedRaw = monthsBetween(startDate, asOfDate);
  const monthsElapsed = clampMonths(monthsElapsedRaw, tenureMonths);
  const monthlyRate = (annualRate / 100) / 12;

  let outstanding = principal;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let isNegativeAmortization = false;

  for (let index = 0; index < monthsElapsed; index += 1) {
    const interest = outstanding * monthlyRate;
    totalInterestPaid += interest;

    const principalPaidRaw = emi - interest;
    const principalPaid = principalPaidRaw > 0 ? principalPaidRaw : 0;

    if (principalPaidRaw <= 0 && outstanding > 0) {
      isNegativeAmortization = true;
      outstanding += interest;
    } else {
      outstanding = Math.max(0, outstanding - principalPaid);
      totalPrincipalPaid += principalPaid;
    }

    if (outstanding <= 0) {
      outstanding = 0;
      break;
    }
  }

  const isClosed = outstanding <= 0;
  const monthsRemaining = Math.max(0, Number(tenureMonths || 0) - monthsElapsed);

  return {
    outstanding,
    monthsElapsed,
    monthsRemaining,
    totalInterestPaid,
    totalPrincipalPaid,
    isClosed,
    isNegativeAmortization
  };
};

export const computeSchedulePreview = ({
  principalAmount,
  interestRateAnnual,
  emiAmount,
  startDate,
  tenureMonths,
  asOfDate = new Date(),
  months = 6
}) => {
  const snapshot = computeOutstanding({
    principalAmount,
    interestRateAnnual,
    emiAmount,
    startDate,
    tenureMonths,
    asOfDate
  });

  const previewMonths = Math.max(0, Number(months || 6));
  const monthlyRate = (Number(interestRateAnnual || 0) / 100) / 12;
  const emi = Math.max(0, Number(emiAmount || 0));
  let outstanding = Number(snapshot.outstanding || 0);
  const rows = [];

  const previewStart = toDate(asOfDate);

  for (let index = 0; index < previewMonths; index += 1) {
    const interest = outstanding * monthlyRate;
    const principalPaidRaw = emi - interest;
    const principalPaid = principalPaidRaw > 0 ? principalPaidRaw : 0;
    const opening = outstanding;

    if (principalPaidRaw <= 0 && outstanding > 0) {
      outstanding += interest;
    } else {
      outstanding = Math.max(0, outstanding - principalPaid);
    }

    const date = new Date(previewStart);
    date.setMonth(date.getMonth() + index + 1);

    rows.push({
      monthIndex: snapshot.monthsElapsed + index + 1,
      date,
      opening,
      interest,
      principalPaid,
      closing: outstanding
    });

    if (outstanding <= 0) {
      break;
    }
  }

  return rows;
};
