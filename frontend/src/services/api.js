import axios from "axios";

const DEFAULT_API_BASE_URL = "http://localhost:5000/api";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

export const authApi = {
  status: () => api.get("/auth/status"),
  register: (payload) => api.post("/auth/register", payload),
  loginPin: (payload) => api.post("/auth/login-pin", payload),
  loginPassword: (payload) => api.post("/auth/login-password", payload),
  login: (payload) => api.post("/auth/login-password", payload),
  generateRecoveryKey: (payload = {}) => api.post("/auth/recovery-key/generate", payload),
  recover: (payload) => api.post("/auth/recover", payload),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me")
};

export const auditLogApi = {
  list: (limit = 50) => api.get(`/audit-logs?limit=${limit}`)
};

export const settingsApi = {
  get: () => api.get("/settings"),
  updateFDInterval: (intervalDays) => api.patch("/settings/fd-interval", { intervalDays }),
  updateEPFInterval: (intervalDays) => api.patch("/settings/epf-interval", { intervalDays }),
  updateNPSInterval: (intervalDays) => api.patch("/settings/nps-interval", { intervalDays }),
  updatePPFInterval: (intervalDays) => api.patch("/settings/ppf-interval", { intervalDays }),
  updateBackupSettings: (payload) => api.patch("/settings/backup", payload),
  updateSecuritySettings: (payload) => api.patch("/settings/security", payload),
  setBackupPassphrase: (passphrase) => api.put("/settings/backup/passphrase", { passphrase }),
  clearBackupPassphrase: () => api.delete("/settings/backup/passphrase")
};

export const backupApi = {
  create: (password) => api.post("/backup", { password }),
  status: () => api.get("/backup/status"),
  latest: () => api.get("/backup/latest"),
  downloadLatest: () => api.get("/backup/download/latest", { responseType: "blob" }),
  restore: (formData) => api.post("/backup/restore", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  })
};

export default api;
