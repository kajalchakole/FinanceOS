import React from "react";

const formatAmount = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return `\u20B9${parsed.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen"
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

const convertBelowThousand = (number) => {
  const n = Number(number || 0);
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const parts = [];

  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} hundred`);
  }

  if (remainder > 0) {
    if (remainder < 20) {
      parts.push(ONES[remainder]);
    } else {
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;
      parts.push(one > 0 ? `${TENS[ten]} ${ONES[one]}` : TENS[ten]);
    }
  }

  return parts.join(" ").trim();
};

const numberToWords = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  const absolute = Math.abs(parsed);
  const integerPart = Math.floor(absolute);
  const decimalPart = Math.round((absolute - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return "zero";
  }

  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const remainder = integerPart % 1000;
  const parts = [];

  if (crore > 0) {
    parts.push(`${convertBelowThousand(crore)} crore`);
  }
  if (lakh > 0) {
    parts.push(`${convertBelowThousand(lakh)} lakh`);
  }
  if (thousand > 0) {
    parts.push(`${convertBelowThousand(thousand)} thousand`);
  }
  if (remainder > 0) {
    parts.push(convertBelowThousand(remainder));
  }

  let words = parts.join(" ").trim();
  if (decimalPart > 0) {
    words = `${words} point ${convertBelowThousand(decimalPart)}`;
  }

  return parsed < 0 ? `minus ${words}` : words;
};

function AmountHint({ value, label = "Entered amount" }) {
  const formattedAmount = formatAmount(value);
  const amountInWords = numberToWords(value);

  if (!formattedAmount || !amountInWords) {
    return null;
  }

  return (
    <p className="mt-1 text-xs text-brand-muted">
      {label}: {amountInWords}
    </p>
  );
}

export default AmountHint;
