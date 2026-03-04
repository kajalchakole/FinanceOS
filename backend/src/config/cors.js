const splitOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set([
  ...splitOrigins(process.env.APP_BASE_URLS),
  ...splitOrigins(process.env.APP_BASE_URL),
  ...splitOrigins(process.env.FRONTEND_URL)
]);

const isPrivateLanOrigin = (origin) => {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") {
      return false;
    }

    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) {
      return true;
    }

    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }

    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }

    return /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);
  } catch {
    return false;
  }
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.size === 0 || allowedOrigins.has(origin) || isPrivateLanOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true
};
