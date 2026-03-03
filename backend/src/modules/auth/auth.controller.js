import User from "../../models/User.js";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  hashSecret,
  issueTokens,
  setPinCookie,
  setSessionCookies,
  verifyAccessToken,
  verifyRefreshToken,
  verifySecret
} from "./auth.service.js";
import { generateRecoveryKey, normalizeRecoveryKey } from "./recoveryKey.service.js";
import { logEvent } from "../../services/auditLog.service.js";

const LOGIN_LOCK_MINUTES = 10;
const RECOVERY_LOCK_MINUTES = 30;
const MAX_FAILED_ATTEMPTS = 5;
const PASSWORD_MIN_LENGTH = 10;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const PIN_REGEX = /^[0-9]{4}$/;

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const unauthorized = (message) => {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
};

const tooMany = (message) => {
  const error = new Error(message);
  error.statusCode = 429;
  return error;
};

const isLocked = (user) => user?.lockUntil && user.lockUntil.getTime() > Date.now();
const isRecoveryLocked = (user) => user?.recoveryLockUntil && user.recoveryLockUntil.getTime() > Date.now();
const normalizeUsername = (value) => String(value || "").trim();
const isValidUsername = (value) =>
  value.length >= USERNAME_MIN_LENGTH && value.length <= USERNAME_MAX_LENGTH;

const incrementFailure = async (user) => {
  const nextCount = Number(user.failedLoginCount || 0) + 1;
  const updates = { failedLoginCount: nextCount };
  let lockUntil = null;

  if (nextCount >= MAX_FAILED_ATTEMPTS) {
    lockUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000);
    updates.lockUntil = lockUntil;
  }

  await User.updateOne({ _id: user._id }, updates);
  return { nextCount, lockUntil };
};

const clearLockState = async (userId) => {
  await User.updateOne(
    { _id: userId },
    {
      failedLoginCount: 0,
      lockUntil: null,
      lastLoginAt: new Date()
    }
  );
};

const incrementRecoveryFailure = async (user) => {
  const nextCount = Number(user.recoveryFailedCount || 0) + 1;
  const updates = { recoveryFailedCount: nextCount };

  if (nextCount >= MAX_FAILED_ATTEMPTS) {
    updates.recoveryLockUntil = new Date(Date.now() + RECOVERY_LOCK_MINUTES * 60 * 1000);
  }

  await User.updateOne({ _id: user._id }, updates);
};

const clearRecoveryLockState = async (userId) => {
  await User.updateOne(
    { _id: userId },
    {
      recoveryFailedCount: 0,
      recoveryLockUntil: null
    }
  );
};

export const getAuthStatus = async (req, res, next) => {
  try {
    const user = await User.findOne({}).select("username");
    if (!user) {
      return res.status(200).json({
        hasUser: false,
        isAuthenticated: false
      });
    }

    let isAuthenticated = false;
    const accessToken = req.cookies?.[ACCESS_COOKIE_NAME];
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (accessToken) {
      try {
        verifyAccessToken(accessToken);
        isAuthenticated = true;
      } catch {
        isAuthenticated = false;
      }
    }

    if (!isAuthenticated && refreshToken) {
      try {
        verifyRefreshToken(refreshToken);
        isAuthenticated = true;
      } catch {
        isAuthenticated = false;
      }
    }

    return res.status(200).json({
      hasUser: true,
      isAuthenticated,
      username: user.username
    });
  } catch (error) {
    return next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const existingUser = await User.findOne({});
    if (existingUser) {
      throw badRequest("Setup already completed");
    }

    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || "");
    const pin = String(req.body?.pin || "");

    if (!isValidUsername(username)) {
      throw badRequest("Username must be between 3 and 30 characters");
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      throw badRequest("Password must be at least 10 characters");
    }

    if (!PIN_REGEX.test(pin)) {
      throw badRequest("PIN must be exactly 4 digits");
    }

    const [passwordHash, pinHash] = await Promise.all([hashSecret(password), hashSecret(pin)]);
    const user = await User.create({ username, passwordHash, pinHash, lastLoginAt: new Date() });
    const tokens = issueTokens(user._id);

    setSessionCookies(res, tokens);
    setPinCookie(res);

    return res.status(201).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

export const loginPassword = async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || "");

    if (!password) {
      throw badRequest("Password is required");
    }

    if (username && !isValidUsername(username)) {
      throw badRequest("Username must be between 3 and 30 characters");
    }

    const user = username
      ? await User.findOne({ username })
      : await User.findOne({});
    if (!user) {
      await logEvent("LOGIN_PASSWORD_FAIL", req, { reason: "USER_NOT_FOUND" });
      throw unauthorized("Invalid credentials");
    }

    if (isLocked(user)) {
      await logEvent("AUTH_LOCKED", req, { username: user.username, lockUntil: user.lockUntil?.toISOString() });
      throw tooMany("Locked, try later");
    }

    const passwordMatches = await verifySecret(password, user.passwordHash);
    if (!passwordMatches) {
      const failureState = await incrementFailure(user);
      await logEvent("LOGIN_PASSWORD_FAIL", req, { username: user.username });
      if (failureState.lockUntil) {
        await logEvent("AUTH_LOCKED", req, { username: user.username, lockUntil: failureState.lockUntil.toISOString() });
      }
      throw unauthorized("Invalid credentials");
    }

    const tokens = issueTokens(user._id);
    await clearLockState(user._id);

    setSessionCookies(res, tokens);
    setPinCookie(res);
    await logEvent("LOGIN_PASSWORD_SUCCESS", req, { username: user.username });

    return res.status(200).json({
      ok: true,
      username: user.username
    });
  } catch (error) {
    return next(error);
  }
};

export const loginPin = async (req, res, next) => {
  try {
    const pin = String(req.body?.pin || "");
    if (!PIN_REGEX.test(pin)) {
      throw badRequest("PIN must be exactly 4 digits");
    }

    const user = await User.findOne({});
    if (!user) {
      await logEvent("LOGIN_PIN_FAIL", req, { reason: "USER_NOT_FOUND" });
      throw unauthorized("Invalid credentials");
    }

    if (isLocked(user)) {
      await logEvent("AUTH_LOCKED", req, { username: user.username, lockUntil: user.lockUntil?.toISOString() });
      throw tooMany("Locked, try later");
    }

    const pinMatches = await verifySecret(pin, user.pinHash);
    if (!pinMatches) {
      const failureState = await incrementFailure(user);
      await logEvent("LOGIN_PIN_FAIL", req, { username: user.username });
      if (failureState.lockUntil) {
        await logEvent("AUTH_LOCKED", req, { username: user.username, lockUntil: failureState.lockUntil.toISOString() });
      }
      throw unauthorized("Invalid credentials");
    }

    const tokens = issueTokens(user._id);
    await clearLockState(user._id);

    setSessionCookies(res, tokens);
    setPinCookie(res);
    await logEvent("LOGIN_PIN_SUCCESS", req, { username: user.username });

    return res.status(200).json({
      ok: true,
      username: user.username
    });
  } catch (error) {
    return next(error);
  }
};

export const login = loginPassword;

export const logout = async (req, res, next) => {
  try {
    clearAuthCookies(res);
    await logEvent("LOGOUT", req);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("username lastLoginAt");
    if (!user) {
      throw unauthorized("UNAUTHENTICATED");
    }

    return res.status(200).json({
      username: user.username,
      lastLoginAt: user.lastLoginAt
    });
  } catch (error) {
    return next(error);
  }
};

export const generateOrRotateRecoveryKey = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw badRequest("User not found");
    }

    if (user.recoveryKeyHash) {
      const password = String(req.body?.password || "");
      if (!password) {
        throw badRequest("Password is required to rotate recovery key");
      }

      const passwordMatches = await verifySecret(password, user.passwordHash);
      if (!passwordMatches) {
        throw unauthorized("Invalid credentials");
      }
    }

    const { recoveryKey, normalizedRecoveryKey } = generateRecoveryKey();
    const recoveryKeyHash = await hashSecret(normalizedRecoveryKey);

    await User.updateOne(
      { _id: user._id },
      {
        recoveryKeyHash,
        recoveryKeyCreatedAt: user.recoveryKeyHash ? user.recoveryKeyCreatedAt || new Date() : new Date(),
        recoveryKeyRotatedAt: user.recoveryKeyHash ? new Date() : null,
        recoveryFailedCount: 0,
        recoveryLockUntil: null
      }
    );

    return res.status(200).json({ recoveryKey });
  } catch (error) {
    return next(error);
  }
};

export const recoverAccount = async (req, res, next) => {
  try {
    const recoveryKeyInput = normalizeRecoveryKey(req.body?.recoveryKey);
    const newPassword = String(req.body?.newPassword || "");
    const newPin = String(req.body?.newPin || "");

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      throw badRequest("Password must be at least 10 characters");
    }

    if (!PIN_REGEX.test(newPin)) {
      throw badRequest("PIN must be exactly 4 digits");
    }

    const user = await User.findOne({});
    if (!user) {
      await logEvent("RECOVERY_FAIL", req, { reason: "USER_NOT_FOUND" });
      throw unauthorized("Invalid recovery key");
    }

    if (!user.recoveryKeyHash) {
      await logEvent("RECOVERY_FAIL", req, { username: user.username, reason: "RECOVERY_NOT_SET" });
      throw badRequest("Recovery key not set");
    }

    if (isRecoveryLocked(user)) {
      await logEvent("RECOVERY_FAIL", req, { username: user.username, reason: "LOCKED" });
      throw tooMany("Locked, try later");
    }

    const isMatch = await verifySecret(recoveryKeyInput, user.recoveryKeyHash);
    if (!isMatch) {
      await incrementRecoveryFailure(user);
      await logEvent("RECOVERY_FAIL", req, { username: user.username });
      throw unauthorized("Invalid recovery key");
    }

    const [passwordHash, pinHash] = await Promise.all([
      hashSecret(newPassword),
      hashSecret(newPin)
    ]);
    const { recoveryKey: newRecoveryKey, normalizedRecoveryKey } = generateRecoveryKey();
    const newRecoveryKeyHash = await hashSecret(normalizedRecoveryKey);

    await User.updateOne(
      { _id: user._id },
      {
        passwordHash,
        pinHash,
        recoveryKeyHash: newRecoveryKeyHash,
        recoveryKeyRotatedAt: new Date(),
        failedLoginCount: 0,
        lockUntil: null,
        recoveryFailedCount: 0,
        recoveryLockUntil: null
      }
    );

    clearAuthCookies(res);
    await clearRecoveryLockState(user._id);
    await logEvent("RECOVERY_SUCCESS", req, { username: user.username });

    return res.status(200).json({
      ok: true,
      newRecoveryKey
    });
  } catch (error) {
    return next(error);
  }
};
