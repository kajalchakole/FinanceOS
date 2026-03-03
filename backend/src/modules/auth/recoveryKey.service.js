import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PREFIX = "FOS";

const toBase32 = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

const groupBy = (value, size) => {
  const groups = [];
  for (let index = 0; index < value.length; index += size) {
    groups.push(value.slice(index, index + size));
  }
  return groups.join("-");
};

export const normalizeRecoveryKey = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");

export const generateRecoveryKey = () => {
  const entropy = toBase32(crypto.randomBytes(32));
  const formatted = `${PREFIX}-${groupBy(entropy, 4)}`;
  const normalized = normalizeRecoveryKey(formatted);

  return {
    recoveryKey: formatted,
    normalizedRecoveryKey: normalized
  };
};
