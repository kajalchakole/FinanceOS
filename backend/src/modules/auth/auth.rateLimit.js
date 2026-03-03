import rateLimit from "express-rate-limit";

const buildLimiter = (windowMs, max) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Try again later." }
});

export const loginPinRateLimiter = buildLimiter(10 * 60 * 1000, 10);
export const loginPasswordRateLimiter = buildLimiter(10 * 60 * 1000, 10);
export const recoverRateLimiter = buildLimiter(30 * 60 * 1000, 5);
