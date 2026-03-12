/**
 * tutorial.js  (js/tutorial.js)
 * Lógica completa del tutorial interactivo.
 *
 * Responsabilidades:
 *  - Detectar móvil vs desktop (< 1024px)
 *  - Carrusel móvil: botones prev/next, swipe táctil, teclado
 *  - Carrusel desktop: clona slides de #carrusel-movil a #carrusel-desk
 *  - Indicadores de posición (bolitas)
 *  - Renderizar mini-tableros con estados predefinidos (9 estados)
 *  - Slider de deshacer interactivo (demo, no guarda estado real)
 *  - Recarga de página al cambiar entre móvil y desktop
 */

document.addEventListener("DOMContentLoaded", () => {

  // ── Detección de dispositivo ────────────────────────────────
  const slides    = document.querySelectorAll("#carrusel-movil .carrusel-item");
  let index       = 0;
  let esMobile    = window.innerWidth < 1024;

  function detectarDispositivo() {
    const nuevoEsMobile = window.innerWidth < 1024;
    if (nuevoEsMobile !== esMobile) {
      esMobile = nuevoEsMobile;
      location.reload();
    }
  }
  window.addEventListener("resize", detectarDispositivo);

  // ── Selección de controles según dispositivo ─────────────────
  let btnPrev, btnNext, indicadores, carruselActivo;

  if (esMobile) {
    btnPrev        = document.getElementById("btn-prev");
    btnNext        = document.getElementById("btn-next");
    indicadores    = document.querySelector(".carrusel-indicadores");
    carruselActivo = document.getElementById("carrusel-movil");

    // Ocultar elementos exclusivos de desktop
    document.querySelector(".controles-tutorial").style.display = "none";
    document.querySelector(".carrusel-centro").style.display    = "none";
    document.querySelector(".meli-tutorial").style.display      = "none";

  } else {
    btnPrev        = document.getElementById("btn-prev-desk");
    btnNext        = document.getElementById("btn-next-desk");
    indicadores    = document.getElementById("indicadores-desk");
    carruselActivo = document.getElementById("carrusel-desk");

    // Clonar slides al carrusel desktop
    slides.forEach(slide => {
      carruselActivo.appendChild(slide.cloneNode(true));
    });

    // Ocultar elementos exclusivos de móvil
    document.getElementById("carrusel-movil").style.display        = "none";
    document.querySelector(".carrusel-controles").style.display     = "none";
    document.querySelector(".meli-contenedor").style.display        = "none";
    document.querySelector(".botones-menu").style.display           = "none";
  }

  // ── Validación de elementos ──────────────────────────────────
  if (!btnPrev || !btnNext || !indicadores || !carruselActivo) {
    console.error("[tutorial.js] No se encontraron elementos del carrusel");
    return;
  }

  const slidesActivos = carruselActivo.querySelectorAll(".carrusel-item");

  // ── Crear indicadores (bolitas) ──────────────────────────────
  indicadores.innerHTML = "";
  slidesActivos.forEach((_, i) => {
    const span = document.createElement("span");
    span.classList.add("indicador");
    if (i === 0) span.classList.add("activo");
    indicadores.appendChild(span);
  });

  const dots = indicadores.querySelectorAll(".indicador");

  // ── Mostrar slide por índice ─────────────────────────────────
  function mostrarSlide(i) {
    slidesActivos.forEach((s, idx) => s.classList.toggle("activo", idx === i));
    dots.forEach((d, idx)          => d.classList.toggle("activo", idx === i));
    btnPrev.disabled = i === 0;
    btnNext.disabled = i === slidesActivos.length - 1;
  }

  // ── Botones prev / next ──────────────────────────────────────
  btnPrev.addEventListener("click", () => {
    if (index > 0) { index--; mostrarSlide(index); }
  });

  btnNext.addEventListener("click", () => {
    if (index < slidesActivos.length - 1) { index++; mostrarSlide(index); }
  });

  // ── Teclado ──────────────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" && index > 0) {
      index--;
      mostrarSlide(index);
      e.preventDefault();
    } else if (e.key === "ArrowRight" && index < slidesActivos.length - 1) {
      index++;
      mostrarSlide(index);
      e.preventDefault();
    }
  });

  // ── Swipe táctil (solo móvil) ────────────────────────────────
  if (esMobile) {
    let inicioX = null;

    carruselActivo.addEventListener("touchstart", (e) => {
      inicioX = e.touches[0].clientX;
    }, { passive: true });

    carruselActivo.addEventListener("touchend", (e) => {
      if (inicioX === null) return;
      const dx = e.changedTouches[0].clientX - inicioX;
      if (Math.abs(dx) > 40) {
        if (dx < 0 && index < slidesActivos.length - 1) index++;
        else if (dx > 0 && index > 0) index--;
        mostrarSlide(index);
      }
      inicioX = null;
    }, { passive: true });
  }

  // Mostrar primer slide
  mostrarSlide(index);

  // ── Mini-tableros: estados predefinidos ──────────────────────
  // Cada número representa el valor de la ficha (0 = vacío)
  const estados = {
    1: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,0,2]],
    2: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,2,0,4]],
    3: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,4,4]],
    4: [[0,0,0,0],[2,0,0,0],[0,0,0,0],[0,4,8,16]],
    5: [[0,0,0,2],[0,0,0,0],[2,0,0,0],[4,8,16,32]],
    6: [[0,0,0,0],[0,0,0,0],[8,4,2,0],[16,32,64,128]],
    7: [[0,0,0,0],[0,0,2,4],[64,32,16,8],[128,256,512,1024]],
    8: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,0,2048]],
    9: [[2,4,8,16],[32,64,128,256],[512,1024,2048,4096],[8192,16384,32768,65536]],
  };

  function renderMiniTablero(contenedor, estado) {
    contenedor.innerHTML = "";
    const tablero = estados[estado];
    if (!tablero) return;

    tablero.flat().forEach(valor => {
      const celda = document.createElement("div");
      celda.className = "mini-celda";
      if (valor) {
        celda.textContent = valor;
        celda.classList.add("v" + valor);
      }
      contenedor.appendChild(celda);
    });
  }

  document.querySelectorAll(".mini-tablero").forEach(div => {
    const estado = parseInt(div.getAttribute("data-estado"));
    if (estado && estados[estado]) renderMiniTablero(div, estado);
  });

  console.log("[tutorial.js] Inicializado →", {
    dispositivo: esMobile ? "móvil" : "desktop",
    slides: slidesActivos.length,
  });
});

// ── Slider de deshacer (demo interactivo en el tutorial) ──────
document.addEventListener("DOMContentLoaded", () => {
  const rango = document.getElementById("rango-deshacer");
  const val   = document.getElementById("valor-deshacer");

  if (rango && val) {
    val.textContent = rango.value;
    rango.addEventListener("input", e => {
      val.textContent = e.target.value;
    });
  }
});