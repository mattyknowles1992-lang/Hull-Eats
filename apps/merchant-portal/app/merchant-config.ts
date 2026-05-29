const defaultApiBaseUrl =
  process.env.NODE_ENV === "production" ? "https://hull-eats-api.onrender.com" : "http://localhost:4000";

export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl).replace(/\/$/, "");

export const customerWebBaseUrl = (process.env.NEXT_PUBLIC_CUSTOMER_WEB_URL ?? "https://hull-eats.onrender.com").replace(
  /\/$/,
  "",
);
