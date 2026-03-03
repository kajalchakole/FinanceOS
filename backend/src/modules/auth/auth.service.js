import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

export const ACCESS_COOKIE_NAME = "financeos_access";
export const REFRESH_COOKIE_NAME = "financeos_refresh";
export const PIN_COOKIE_NAME = "financeos_pin";

const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const PIN_COOKIE_MAX_AGE = 12 * 60 * 60 * 1000;

const getCookieOptions = (maxAge) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
  maxAge
});

const ensureSecret = (value, name) => {
  if (!value) {
    const error = new Error(`${name} is not set`);
    error.statusCode = 500;
    throw error;
  }
};

export const hashSecret = (value) => bcrypt.hash(value, BCRYPT_ROUNDS);
export const verifySecret = (value, hash) => bcrypt.compare(value, hash);

export const issueTokens = (userId) => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  ensureSecret(accessSecret, "JWT_ACCESS_SECRET");
  ensureSecret(refreshSecret, "JWT_REFRESH_SECRET");

  const subject = String(userId);
  const accessToken = jwt.sign({ sub: subject }, accessSecret, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ sub: subject, type: "refresh" }, refreshSecret, { expiresIn: "7d" });

  return { accessToken, refreshToken };
};

export const issueAccessToken = (userId) => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  ensureSecret(accessSecret, "JWT_ACCESS_SECRET");
  return jwt.sign({ sub: String(userId) }, accessSecret, { expiresIn: "1h" });
};

export const setSessionCookies = (res, tokens) => {
  res.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE));
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getCookieOptions(REFRESH_COOKIE_MAX_AGE));
};

export const setAccessCookie = (res, accessToken) => {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE));
};

export const setPinCookie = (res) => {
  res.cookie(PIN_COOKIE_NAME, "1", getCookieOptions(PIN_COOKIE_MAX_AGE));
};

export const clearAuthCookies = (res) => {
  const clearOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/"
  };

  res.clearCookie(ACCESS_COOKIE_NAME, clearOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, clearOptions);
  res.clearCookie(PIN_COOKIE_NAME, clearOptions);
};

export const verifyAccessToken = (token) => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  ensureSecret(accessSecret, "JWT_ACCESS_SECRET");
  return jwt.verify(token, accessSecret);
};

export const verifyRefreshToken = (token) => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  ensureSecret(refreshSecret, "JWT_REFRESH_SECRET");
  const payload = jwt.verify(token, refreshSecret);

  if (payload?.type !== "refresh") {
    const error = new Error("Invalid refresh token");
    error.statusCode = 401;
    throw error;
  }

  return payload;
};
