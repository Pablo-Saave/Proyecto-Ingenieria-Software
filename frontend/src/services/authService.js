// src/services/authService.js

const API_URL = 'http://localhost:3000/api/auth';

// Solo administradores pueden iniciar sesión por ahora.
// Las páginas de trabajador y supervisor aún no están implementadas.
const TIPOS_CON_ACCESO = ['administrador'];

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

  // Bloquear acceso a tipos sin página aún implementada
  const tipo = data.data?.tipo_usuario;
  if (!TIPOS_CON_ACCESO.includes(tipo)) {
    throw new Error(
      `El acceso para "${tipo}" aún no está disponible. Por favor contacta al administrador.`
    );
  }

  return data;
};