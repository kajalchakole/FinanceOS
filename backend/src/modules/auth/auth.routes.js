import { Router } from "express";

import { requireAuth } from "../../middleware/requireAuth.js";
import {
  getAuthStatus,
  generateOrRotateRecoveryKey,
  getMe,
  login,
  loginPassword,
  loginPin,
  recoverAccount,
  logout,
  register
} from "./auth.controller.js";
import { loginPasswordRateLimiter, loginPinRateLimiter, recoverRateLimiter } from "./auth.rateLimit.js";

const authRouter = Router();

authRouter.get("/status", getAuthStatus);
authRouter.post("/register", register);
authRouter.post("/login-pin", loginPinRateLimiter, loginPin);
authRouter.post("/login-password", loginPasswordRateLimiter, loginPassword);
authRouter.post("/login", loginPasswordRateLimiter, login);
authRouter.post("/recovery-key/generate", requireAuth, generateOrRotateRecoveryKey);
authRouter.post("/recover", recoverRateLimiter, recoverAccount);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, getMe);

export default authRouter;
