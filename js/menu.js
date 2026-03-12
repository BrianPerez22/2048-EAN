/**
 * menu.js
 * Maneja el acordeón informativo del menú principal (index.html).
 * Antes estaba como <script> inline en index.html.
 *
 * Dependencias HTML:
 *   #btn-info         → botón del acordeón
 *   #flecha-info      → SVG flecha dentro del botón
 *   #contenido-info   → contenedor del texto desplegable
 */

document.addEventListener("DOMContentLoaded", () => {
  const btnInfo      = document.getElementById("btn-info");
  const flechaInfo   = document.getElementById("flecha-info");
  const contenidoInfo = document.getElementById("contenido-info");

  if (!btnInfo || !flechaInfo || !contenidoInfo) return;

  let abierto = false;

  btnInfo.addEventListener("click", () => {
    abierto = !abierto;
    contenidoInfo.classList.toggle("expandido", abierto);
    flechaInfo.classList.toggle("arriba", abierto);
  });
});