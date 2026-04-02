const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const API_KEY = import.meta.env.VITE_API_KEY|| "YOUR_KEY_HERE";
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json",  "x-api-key": API_KEY,  ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

export const api = {
  getProducts: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== null) q.set(k, v); });
    return apiFetch(`/products?${q}`);
  },
  getProduct: (id) => apiFetch(`/products/${id}`),
  getPriceHistory: (id) => apiFetch(`/products/${id}/price-history`),
  getAnalytics: () => apiFetch("/analytics"),
  getPriceChanges: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
    return apiFetch(`/price-changes?${q}`);
  },
  refresh: () => apiFetch("/refresh", { method: "POST" }),
};