import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  issueAccessToken,
  setAccessCookie,
  verifyAccessToken,
  verifyRefreshToken
} from "../modules/auth/auth.service.js";

const unauthorizedResponse = (res) => res.status(401).json({ error: "UNAUTHENTICATED" });

export const requireAuth = (req, res, next) => {
  const accessToken = req.cookies?.[ACCESS_COOKIE_NAME];
  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);
      req.userId = payload.sub;
      return next();
    } catch {
      // Continue to refresh token fallback.
    }
  }

  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    return unauthorizedResponse(res);
  }

  try {
    const refreshPayload = verifyRefreshToken(refreshToken);
    req.userId = refreshPayload.sub;

    const renewedAccessToken = issueAccessToken(refreshPayload.sub);
    setAccessCookie(res, renewedAccessToken);

    return next();
  } catch {
    return unauthorizedResponse(res);
  }
};
