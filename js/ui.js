/**
 * ui.js  (js/ui.js)
 * Helpers compartidos de UI reutilizables entre páginas.
 *
 * ── PROPÓSITO ──────────────────────────────────────────────
 * Centraliza funciones de interfaz que pueden ser usadas por
 * juego.js, tutorial.js o menu.js sin duplicar código.
 * Es el punto de extensión principal para la fusión futura
 * con otro proyecto.
 *
 * ── CÓMO USAR ──────────────────────────────────────────────
 * Agregar <script src="js/ui.js"></script> ANTES del script
 * principal de cada página que lo necesite.
 *
 * ── SECCIONES ──────────────────────────────────────────────
 *  1. Formato de datos      → números, fechas, textos
 *  2. Notificaciones        → toasts / mensajes temporales
 *  3. Helpers de animación  → utilidades para clases CSS
 *  4. Helpers de DOM        → atajos para operaciones comunes
 */

// =====================================================
// 1. Formato de datos
// =====================================================

/**
 * Formatea un número con separadores de miles.
 * Ejemplo: formatearPuntaje(12345) → "12.345"
 * @param {number} n
 * @returns {string}
 */
function formatearPuntaje(n) {
  return Number(n).toLocaleString('es-CO');
}

/**
 * Formatea una fecha ISO a formato legible en español.
 * Ejemplo: formatearFecha("2025-06-01T12:00:00Z") → "1 jun 2025"
 * @param {string} isoString
 * @returns {string}
 */
function formatearFecha(isoString) {
  try {
    return new Date(isoString).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch {
    return isoString;
  }
}

/**
 * Trunca un texto a maxLen caracteres agregando "…" si es necesario.
 * Ejemplo: truncarTexto("Jugador EAN", 8) → "Jugador…"
 * @param {string} texto
 * @param {number} maxLen
 * @returns {string}
 */
function truncarTexto(texto, maxLen = 15) {
  if (!texto) return '';
  return texto.length > maxLen ? texto.slice(0, maxLen - 1) + '…' : texto;
}

// =====================================================
// 2. Notificaciones (toast)
// =====================================================

/**
 * Muestra un mensaje temporal flotante en pantalla.
 * Se auto-elimina después de `duracion` ms.
 * No depende de ninguna librería externa.
 *
 * @param {string} mensaje  - Texto a mostrar
 * @param {'info'|'exito'|'error'} tipo - Estilo visual
 * @param {number} duracion - Milisegundos antes de desaparecer (default 2500)
 */
function mostrarToast(mensaje, tipo = 'info', duracion = 2500) {
  // Reutilizar contenedor si ya existe
  let contenedor = document.getElementById('ui-toast-contenedor');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'ui-toast-contenedor';
    Object.assign(contenedor.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '99999',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'center',
      pointerEvents: 'none',
    });
    document.body.appendChild(contenedor);
  }

  const colores = {
    info:  { bg: '#776e65', color: '#fff' },
    exito: { bg: '#3bac53', color: '#fff' },
    error: { bg: '#c0392b', color: '#fff' },
  };
  const estilo = colores[tipo] || colores.info;

  const toast = document.createElement('div');
  toast.textContent = mensaje;
  Object.assign(toast.style, {
    background: estilo.bg,
    color: estilo.color,
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    opacity: '0',
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none',
  });

  contenedor.appendChild(toast);

  // Fade in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
  });

  // Fade out y eliminar
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 350);
  }, duracion);
}

// =====================================================
// 3. Helpers de animación
// =====================================================

/**
 * Agrega una clase CSS a un elemento y la quita automáticamente
 * cuando termina la animación (evento animationend).
 *
 * @param {HTMLElement} el
 * @param {string} clase
 */
function animarUnaVez(el, clase) {
  if (!el) return;
  el.classList.add(clase);
  el.addEventListener('animationend', () => el.classList.remove(clase), { once: true });
}

/**
 * Hace un "pulso" suave en cualquier elemento del DOM.
 * Útil para resaltar cambios de puntaje, fichas, etc.
 *
 * @param {HTMLElement} el
 */
function pulsarElemento(el) {
  animarUnaVez(el, 'fusion'); // reutiliza la animación fusion-pop de animations.css
}

// =====================================================
// 4. Helpers de DOM
// =====================================================

/**
 * Selecciona un elemento por ID con verificación silenciosa.
 * Devuelve null sin lanzar error si no existe.
 *
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function porId(id) {
  return document.getElementById(id) || null;
}

/**
 * Agrega un event listener solo si el elemento existe.
 * Evita el patrón repetitivo "if (el) el.addEventListener(...)".
 *
 * @param {string} id
 * @param {string} evento
 * @param {Function} callback
 */
function alClick(id, callback) {
  const el = porId(id);
  if (el) el.addEventListener('click', callback);
}

/**
 * Muestra u oculta un elemento usando la clase CSS dada.
 *
 * @param {HTMLElement|string} elOId - Elemento o ID
 * @param {boolean} visible
 * @param {string} clase - Clase que controla visibilidad (default 'mostrar')
 */
function toggleVisible(elOId, visible, clase = 'mostrar') {
  const el = typeof elOId === 'string' ? porId(elOId) : elOId;
  if (!el) return;
  el.classList.toggle(clase, visible);
}