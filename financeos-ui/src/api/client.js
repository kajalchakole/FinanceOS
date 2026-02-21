import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

function normalizeApiError(error) {
  if (error.response) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      `Request failed with status ${error.response.status}`;
    const apiError = new Error(message);
    apiError.status = error.response.status;
    apiError.payload = error.response.data;
    return apiError;
  }

  if (error.request) {
    return new Error("Network error: unable to reach FinanceOS API");
  }

  return new Error(error.message || "Unexpected API client error");
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizedError = normalizeApiError(error);
    console.error("[FinanceOS API Error]", {
      message: normalizedError.message,
      status: normalizedError.status,
      payload: normalizedError.payload,
    });
    return Promise.reject(normalizedError);
  }
);

export function getPortfolioSummary() {
  return client.get("/portfolio").then((response) => response.data);
}

export function getPositions() {
  return client.get("/positions").then((response) => response.data);
}

export function getTransactions() {
  return client.get("/transactions").then((response) => response.data);
}

export default client;
