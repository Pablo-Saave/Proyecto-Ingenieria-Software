import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';

function Landing({ onLoginSuccess }) {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleContactClick = () => {
    const contactSection = document.getElementById('contacto');
    if (contactSection) {
      const targetPosition = contactSection.offsetTop;
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = 1000; // 1 segundo para un scroll más rápido pero suave
      let start = null;

      const ease = (t) => {
        // Función de easing suave (ease-in-out-cubic)
        return t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };

      const animation = (currentTime) => {
        if (start === null) start = currentTime;
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease_progress = ease(progress);
        
        window.scrollTo(0, startPosition + distance * ease_progress);
        
        if (progress < 1) {
          requestAnimationFrame(animation);
        }
      };

      requestAnimationFrame(animation);
    }
  };

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-navbar">
        <div className="navbar-container">
          <div className="navbar-logo">
            <img src="/img/aseo-corp-logo.png" alt="AseoCorp" className="logo-img" />
            <span className="logo-text">
              <span className="logo-aseo">Aseo</span><span className="logo-corp">Corp</span>
            </span>
          </div>
          <div className="navbar-actions">
            <button 
              className="nav-btn nav-login-btn" 
              onClick={handleLoginClick}
            >
              Iniciar sesión
            </button>
            <button 
              className="nav-btn nav-contact-btn" 
              onClick={handleContactClick}
            >
              Contacto
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-logo">
            <img src="/img/aseo-corp-logo.png" alt="AseoCorp" className="hero-logo-img" />
          </div>
          <div className="hero-brand">
            <span className="hero-aseo">Aseo</span><span className="hero-corp">Corp</span>
          </div>
          <h1 className="hero-title">Espacios limpios, ambientes mejores.</h1>
          <p className="hero-description">
            En Aseo Corp nos dedicamos a la limpieza profesional<br />
            para crear espacios más limpios y agradables para todos.
          </p>
        </div>
      </section>

      {/* Confianza Section */}
      <section className="landing-confianza">
        <div className="confianza-container">
          <div className="confianza-image">
            <img src="/img/Confianza.png" alt="Confianza" className="confianza-img" />
          </div>
          <div className="confianza-content">
            <span className="confianza-label">ASEOCORP</span>
            <h2 className="confianza-title">
              Confianza que se ve,<br />
              <span className="confianza-blue">espacios</span> que se sienten.
            </h2>
            <p className="confianza-description">
              En AseoCorp nos dedicamos a brindar servicios de limpieza profesional que transforman espacios y mejoran entornos. Hemos trabajado con miles de empresas y personas que confían en nosotros para mantener sus espacios impecables.
            </p>
            <ul className="confianza-list">
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Equipos capacitados y comprometidos
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Productos de calidad y seguros
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Resultados que superan expectativas
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Estadísticas Section */}
      <section className="landing-stats">
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className="stat-number">+2500</h3>
            <p className="stat-label">EMPRESAS</p>
            <p className="stat-description">Han confiado en AseoCorp para el cuidado de sus espacios.</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h3 className="stat-number">+15.000</h3>
            <p className="stat-label">PERSONAS</p>
            <p className="stat-description">Disfrutan cada día de espacios más limpios y agradables.</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="9"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
            </div>
            <h3 className="stat-number">+20.000.000</h3>
            <p className="stat-label">M² LIMPIADOS</p>
            <p className="stat-description">De espacios cuidados con dedicación, compromiso y excelencia.</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <h3 className="stat-number">100%</h3>
            <p className="stat-label">COMPROMETIDOS</p>
            <p className="stat-description">Con la calidad, la confianza y tu satisfacción.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer" id="contacto">
        <div className="footer-container">
          <div className="footer-section footer-brand">
            <div className="footer-logo">
              <img src="/img/aseo-corp-logo.png" alt="AseoCorp" className="footer-logo-img" />
              <span className="footer-logo-text">
                <span className="footer-aseo">Aseo</span><span className="footer-corp">Corp</span>
              </span>
            </div>
            <p className="footer-description">
              Transformamos espacios con<br />
              limpieza profesional y compromiso.<br />
              Espacios limpios, ambientes mejores.
            </p>
            <div className="footer-socials">
              <a href="#" className="social-link">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7"></path>
                </svg>
              </a>
              <a href="#" className="social-link">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="white"></path>
                  <circle cx="17.5" cy="6.5" r="1.5" fill="white"></circle>
                </svg>
              </a>
              <a href="#" className="social-link">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"></path>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h3 className="footer-section-title">Contacto</h3>
            <ul className="footer-links">
              <li>
                <svg className="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                info@aseocorp.com
              </li>
              <li>
                <svg className="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
                </svg>
                +57 300 123 4567
              </li>
              <li>
                <svg className="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Calle 123 # 45-67<br />Concepción, Chile
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-section-title">Servicios</h3>
            <ul className="footer-links">
              <li><a href="#">Limpieza de oficinas</a></li>
              <li><a href="#">Limpieza comercial</a></li>
              <li><a href="#">Limpieza residencial</a></li>
              <li><a href="#">Desinfección</a></li>
              <li><a href="#">Mantenimiento</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-section-title">Empresa</h3>
            <ul className="footer-links">
              <li><a href="#">Nosotros</a></li>
              <li><a href="#">Nuestros servicios</a></li>
              <li><a href="#">Clientes</a></li>
              <li><a href="#">Contacto</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 AseoCorp. Todos los derechos reservados.</p>
        </div>
      </footer>

    </div>
  );
}

export default Landing;
