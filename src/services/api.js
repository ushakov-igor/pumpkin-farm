const config = window.__PUMPKIN_CONFIG__ || { apiBase: "/api" };

export const apiFetch = async (path, options = {}) => {
  const url = `${config.apiBase}${path}`;
  const headers = {
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
};
