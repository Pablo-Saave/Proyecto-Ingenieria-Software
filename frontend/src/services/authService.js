const API_URL = 'http://146.83.198.35:1323/api/auth';

const TIPOS_CON_ACCESO = ['administrador', 'supervisor', 'trabajador'];

export const loginRequest = async (correo, password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al iniciar sesión');
  }

  const tipo = data.data?.tipo_usuario;
  if (!TIPOS_CON_ACCESO.includes(tipo)) {
    throw new Error(
      `El acceso para "${tipo}" aún no está disponible.`
    );
  }

  // Guardar token y usuario completo en localStorage
  localStorage.setItem('token', data.token);
  localStorage.setItem('usuario', JSON.stringify(data.data));

  return data;
};

export const logoutClean = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
};

// Leer usuario guardado (usado por cualquier página)
export const getUsuarioLocal = () => {
  try {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};