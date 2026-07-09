const API_BASE = "http://localhost:3000";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

export const getClientes = async () => {
  try {
    return await apiFetch("/api/clientes");
  } catch (e) {
    // El backend responde 404 cuando la tabla está vacía; lo tratamos como lista vacía
    if (e.message?.toLowerCase().includes("no se encontraron")) return [];
    throw e;
  }
};

export const createCliente = (data) =>
  apiFetch("/api/clientes", { method: "POST", body: JSON.stringify(data) });

export const updateCliente = (id, data) =>
  apiFetch(`/api/clientes/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteCliente = (id) =>
  apiFetch(`/api/clientes/${id}`, { method: "DELETE" });