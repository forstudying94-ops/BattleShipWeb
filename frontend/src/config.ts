export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? "";

export const HUB_URL = `${API_URL}/hub`;
