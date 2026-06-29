import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { solicitarCodigo, verificarCodigo } from '../services/resetPasswordService';
import '../styles/cambiar-password.css';

/* ─────────────────────────────────────────
   Íconos SVG inline (sin dependencias extra)
───────────────────────────────────────── */
const Icon = {
  mail: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  lock: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  eyeOpen: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  eyeOff: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  arrowRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  check: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  checkLg: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  alert: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

/* ─────────────────────────────────────────
   Definición de pasos
───────────────────────────────────────── */
// Stepper horizontal (panel derecho) — etiquetas cortas
const STEPS_H = ['Correo', 'Código', 'Nueva contraseña'];
// Stepper vertical (panel izquierdo) — etiquetas descriptivas
const STEPS_V = ['Correo electrónico', 'Verifica el código', 'Nueva contraseña'];

/* ─────────────────────────────────────────
   Sub-componentes
───────────────────────────────────────── */

/** Stepper horizontal — panel derecho
 *  Estructura: grid de 5 columnas [item | linea | item | linea | item]
 *  Cada item ocupa 1fr, cada linea ocupa 2fr → lineas se estiran siempre igual
 */
const StepperH = ({ paso }) => (
  <div className="cp-stepper-h">
    {STEPS_H.map((label, i) => {
      const num    = i + 1;
      const done   = paso > num;
      const active = paso === num;
      const state  = done ? 'done' : active ? 'active' : 'pending';
      return (
        <>
          {/* Columna: círculo + label */}
          <div key={`step-${i}`} className="cp-sh-item">
            <div className={`cp-sh-circle cp-sh-circle--${state}`}>
              {done ? Icon.check : num}
            </div>
            <span className={`cp-sh-label cp-sh-label--${state}`}>{label}</span>
          </div>
          {/* Columna: línea entre pasos */}
          {i < STEPS_H.length - 1 && (
            <div
              key={`line-${i}`}
              className={`cp-sh-line${done ? ' cp-sh-line--done' : ''}`}
            />
          )}
        </>
      );
    })}
  </div>
);

/** Stepper vertical — panel izquierdo */
const StepperV = ({ paso }) => (
  <div className="cp-steps-v">
    {STEPS_V.map((label, i) => {
      const num    = i + 1;
      const done   = paso > num;
      const active = paso === num;
      const state  = done ? 'done' : active ? 'active' : 'pending';
      return (
        <div key={i}>
          <div className="cp-step-row">
            <div className={`cp-step-circle cp-step-circle--${state}`}>
              {done ? Icon.check : num}
            </div>
            <span className={`cp-step-label cp-step-label--${state}`}>{label}</span>
          </div>
          {i < STEPS_V.length - 1 && (
            <div className={`cp-step-line${done ? ' cp-step-line--done' : ''}`} />
          )}
        </div>
      );
    })}
  </div>
);

/** Campo con ícono y label — reutiliza tokens de login.css */
const InputField = ({ label, children }) => (
  <div className="cp-field">
    <label className="cp-label">{label}</label>
    {children}
  </div>
);

/** Mensaje de error */
const ErrorMsg = ({ msg }) =>
  msg ? (
    <div className="cp-error" role="alert">
      {Icon.alert} {msg}
    </div>
  ) : null;

/* ─────────────────────────────────────────
   Componente principal
───────────────────────────────────────── */
const CambiarPassword = () => {
  const navigate = useNavigate();

  const [paso, setPaso]                   = useState(1);
  const [correo, setCorreo]               = useState('');
  const [codigo, setCodigo]               = useState('');
  const [nuevaPass, setNuevaPass]         = useState('');
  const [confirmarPass, setConfirmarPass] = useState('');
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [showPass, setShowPass]           = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  /* ── Handlers (lógica original intacta) ── */
  const handleSolicitarCodigo = async () => {
    if (!correo) return setError('Ingresa tu correo electrónico.');
    setError('');
    setLoading(true);
    try {
      await solicitarCodigo(correo);
      setPaso(2);
    } catch (err) {
      setError(err.message || 'No pudimos enviar el código. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificar = async () => {
    if (!codigo)                      return setError('Ingresa el código de verificación.');
    if (!nuevaPass || !confirmarPass) return setError('Completa todos los campos.');
    if (nuevaPass !== confirmarPass)  return setError('Las contraseñas no coinciden.');
    setError('');
    setLoading(true);
    try {
      await verificarCodigo(correo, codigo, nuevaPass);
      setPaso(3);
    } catch (err) {
      setError(err.message || 'Código inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-page">
      <div className="cp-content">
        <div className="cp-card">

          {/* ══ PANEL IZQUIERDO ══ */}
          <div className="cp-left">
            {/* Brand — mismo patrón que navbar / footer */}
            <div className="cp-brand">
              <img
                src="/img/aseo-corp-logo.png"
                alt="AseoCorp logo"
                className="cp-brand-logo"
                onError={e => { e.target.style.display = 'none'; }}
              />
              <span className="cp-brand-text">
                <span className="cp-brand-aseo">Aseo</span>
                <span className="cp-brand-corp">Corp</span>
              </span>
            </div>

            <div className="cp-left-body">
              <h1 className="cp-left-title">
                Recupera tu<br />contraseña
              </h1>
              <p className="cp-left-sub">
                Te enviaremos un código a tu correo para que puedas
                crear una nueva contraseña de forma segura.
              </p>
              <StepperV paso={paso} />
            </div>

            {/* Puntos decorativos */}
            <div className="cp-dots" aria-hidden="true">
              {Array.from({ length: 15 }).map((_, i) => <span key={i} />)}
            </div>
          </div>

          {/* ══ PANEL DERECHO ══ */}
          <div className="cp-right">
            <StepperH paso={paso} />

            {/* ── Paso 1: Correo ── */}
            {paso === 1 && (
              <div className="cp-step-panel" key="paso1">
                <h2 className="cp-form-title">Cambiar contraseña</h2>
                <p className="cp-form-sub">
                  Ingresa el correo asociado a tu cuenta<br />
                  y te enviaremos un código de verificación.
                </p>

                <InputField label="Correo electrónico">
                  <div className="cp-input-wrap">
                    <span className="cp-input-icon">{Icon.mail}</span>
                    <input
                      type="email"
                      className="cp-input"
                      placeholder="tu@correo.com"
                      value={correo}
                      onChange={e => setCorreo(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSolicitarCodigo()}
                      autoFocus
                    />
                  </div>
                </InputField>

                <ErrorMsg msg={error} />

                <button
                  className="cp-btn-primary"
                  onClick={handleSolicitarCodigo}
                  disabled={loading}
                >
                  {loading ? 'Enviando código…' : <>{Icon.arrowRight}&nbsp;Enviar código</>}
                </button>

                <button className="cp-btn-link" onClick={() => navigate('/login')}>
                  ← Volver al inicio de sesión
                </button>
              </div>
            )}

            {/* ── Paso 2: Código + nueva contraseña ── */}
            {paso === 2 && (
              <div className="cp-step-panel" key="paso2">
                <h2 className="cp-form-title">Verifica tu identidad</h2>
                <p className="cp-form-sub">
                  Enviamos un código de 6 dígitos a{' '}
                  <strong style={{ color: '#4466ff' }}>{correo}</strong>
                </p>

                <InputField label="Código de verificación">
                  <input
                    className="cp-otp-input"
                    placeholder="000000"
                    value={codigo}
                    onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                    autoFocus
                  />
                </InputField>

                <InputField label="Nueva contraseña">
                  <div className="cp-input-wrap">
                    <span className="cp-input-icon">{Icon.lock}</span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="cp-input"
                      placeholder="Mínimo 6 caracteres"
                      value={nuevaPass}
                      onChange={e => setNuevaPass(e.target.value)}
                    />
                    <button
                      type="button"
                      className="cp-input-toggle"
                      onClick={() => setShowPass(p => !p)}
                      aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPass ? Icon.eyeOff : Icon.eyeOpen}
                    </button>
                  </div>
                </InputField>

                <InputField label="Confirmar contraseña">
                  <div className="cp-input-wrap">
                    <span className="cp-input-icon">{Icon.lock}</span>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className="cp-input"
                      placeholder="Repite la contraseña"
                      value={confirmarPass}
                      onChange={e => setConfirmarPass(e.target.value)}
                    />
                    <button
                      type="button"
                      className="cp-input-toggle"
                      onClick={() => setShowConfirm(p => !p)}
                      aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                    >
                      {showConfirm ? Icon.eyeOff : Icon.eyeOpen}
                    </button>
                  </div>
                </InputField>

                <ErrorMsg msg={error} />

                <button
                  className="cp-btn-primary"
                  onClick={handleVerificar}
                  disabled={loading}
                >
                  {loading ? 'Verificando…' : <>{Icon.arrowRight}&nbsp;Cambiar contraseña</>}
                </button>

                <button
                  className="cp-btn-link"
                  onClick={() => { setPaso(1); setError(''); }}
                >
                  ← Cambiar correo
                </button>
              </div>
            )}

            {/* ── Paso 3: Éxito ── */}
            {paso === 3 && (
              <div className="cp-step-panel" key="paso3">
                <div className="cp-success-wrap">
                  <div className="cp-success-ring">
                    <div className="cp-success-icon">{Icon.checkLg}</div>
                  </div>
                  <h2 className="cp-form-title">¡Contraseña actualizada!</h2>
                  <p className="cp-form-sub">
                    Tu contraseña fue cambiada con éxito.<br />
                    Ya puedes iniciar sesión.
                  </p>
                  <button
                    className="cp-btn-primary"
                    onClick={() => navigate('/login')}
                  >
                    {Icon.arrowRight}&nbsp;Ir al inicio de sesión
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* ══ fin panel derecho ══ */}

        </div>
        {/* fin card */}
      </div>

      {/* Footer — mismo patrón que .footer-bottom */}
      <p className="cp-page-footer">
        ¿Necesitas ayuda?{' '}
        <a
          href="https://mail.google.com/mail/?view=cm&fs=1&to=info.aseocorp@gmail.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Contáctanos
        </a>
      </p>
    </div>
  );
};

export default CambiarPassword;
