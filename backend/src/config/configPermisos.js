// config/configPermisos.js

export const PERMISOS = {

  trabajador: [
    'ausencias:crear',
    'ausencias:ver_propias',
    'asignaciones:ver_propias',
    'pagos:ver_propios',
    'contratos:ver_propios',
    'canales:ver',
    'dashboard:personal',
  ],

  supervisor: [
    'ausencias:crear',
    'ausencias:ver_propias',
    'ausencias:ver_todas',
    'ausencias:revisar',
    'asignaciones:ver_propias',
    'asignaciones:gestionar',
    'trabajadores:ver',
    'pagos:ver_propios',
    'contratos:ver_todos',
    'contratos:ver_propios',
    'canales:ver',
    'canales:publicar',
    'dashboard:personal',
    'dashboard:supervisor',
  ],

  administrador: [
    'ausencias:crear',
    'ausencias:ver_propias',
    'ausencias:ver_todas',
    'ausencias:revisar',
    'ausencias:eliminar',
    'asignaciones:ver_propias',
    'asignaciones:gestionar',
    'trabajadores:ver',
    'trabajadores:crear',
    'trabajadores:editar',
    'trabajadores:eliminar',
    'pagos:ver_propios',
    'pagos:ver_todos',
    'pagos:gestionar',
    'contratos:ver_todos',
    'contratos:ver_propios',
    'contratos:crear',
    'contratos:editar',
    'contratos:eliminar',
    'canales:ver',
    'canales:publicar',
    'etiquetas:gestionar',
    'dashboard:personal',
    'dashboard:supervisor',
    'dashboard:admin',
  ],

};

export const getPermisosPorRol = (tipo_usuario) => {
  return PERMISOS[tipo_usuario] ?? [];
};