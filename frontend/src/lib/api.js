import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const formatNumber = (v, type = "int") => {
  if (v === null || v === undefined) return "—";
  if (type === "percent") return `${Number(v).toFixed(2)}%`;
  if (type === "score") return `${Math.round(Number(v))}`;
  if (type === "duration") {
    const n = Number(v);
    const m = Math.floor(n / 60);
    const s = Math.round(n % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
  const n = Number(v);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

export const formatSignedPercent = (v) => {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
};
