# Proyecto - Ingeniería de Software  
Sistema de Gestión para Servicio de Aseo

Este repositorio contiene el código fuente y las evidencias del proyecto final para la asignatura de **Ingeniería de Software**.  
El sistema está orientado a la administración de personal, contratos, pagos y cobertura de servicios de aseo, integrando funcionalidades de gestión y un dashboard de control.

---

## Sobre el Proyecto

Aplicación web full-stack para la gestión de servicios de aseo.  
Incluye módulos de asignación de personal, gestión de ausencias, contratos, pagos y un tablero de control con métricas en tiempo real.

---

## Características Principales

- **Asignación de Personal**: Registro, reasignación y control de trabajadores.  
- **Gestión de Ausencias**: Justificación de ausencias programadas y espontáneas.  
- **Gestión de Contratos**: Creación, edición y seguimiento de contratos.  
- **Pagos y Cumplimiento**: Control de pagos pendientes y validaciones.  
- **Dashboard General**: Vista consolidada de turnos activos, cobertura y alertas.  
- **Roles y Permisos**: Administración de accesos según perfil de usuario.  

---

## Tecnologías y Herramientas Utilizadas

### Backend
- Framework: Node.js con Express.js  
- Base de Datos: PostgreSQL  
- ORM: TypeORM  
- Autenticación: JSON Web Tokens (JWT) y Bcrypt  
- Variables de Entorno: Dotenv  

### Frontend
- Framework/Librería: React.js  
- Bundler: Vite  
- Estilos: Tailwind CSS  
- Peticiones HTTP: Axios  
- Routing: React Router DOM  

---

## Evidencias y Artefactos

- Reporte de Git: contribuciones en el tiempo, cantidad y frecuencia.  
- Reportes semanales de avance y cumplimiento de tareas.  
- Instrumento para estudio del contexto.  
- Propuestas de solución.  
- Requisitos funcionales y no funcionales.  
- Modelos de Casos de Uso y Modelo de Datos.  
- Reporte de pruebas.  
- Informe final.  
- Avance de software (individual y grupal).  
- Software final (individual y grupal).  

---

## Guía de Instalación y Uso Local

### Prerrequisitos
- Node.js (v18.x o superior)  
- npm (v9.x o superior)  
- PostgreSQL  

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TU_USUARIO/Proyecto-Servicio-Aseo.git
   cd Proyecto-Servicio-Aseo
2. **Configurar el Backend:**
   cd backend
   npm install
3. **Configurar el Frontend:**
   cd ../frontend
   npm install
4. **Iniciar la base de datos:**
   Asegúrate de que tu servidor de PostgreSQL esté corriendo.
   Crea una base de datos con el nombre especificado en el .env del backend.
5. **Ejecutar el proyecto:**
   Backend:
   npm run dev
   Frontend:
   npm run dev

Miembros del equipo:

Maximiliano De Gregorio
Pablo Saavedra Araneda 
Kevin Romero
Francisco Díaz   
