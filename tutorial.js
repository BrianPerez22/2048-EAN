document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll(".carrusel-item");
  let index = 0;

  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const indicadores = document.querySelector(".carrusel-indicadores");

  // Crear burbujitas
  slides.forEach((_, i) => {
    const span = document.createElement("span");
    span.classList.add("indicador");
    if (i === 0) span.classList.add("activo");
    indicadores.appendChild(span);
  });
  const dots = indicadores.querySelectorAll(".indicador");

  function mostrarSlide(i) {
    slides.forEach((s, idx) => s.classList.toggle("activo", idx === i));
    dots.forEach((d, idx) => d.classList.toggle("activo", idx === i));
    btnPrev.disabled = i === 0;
    btnNext.disabled = i === slides.length - 1;
  }

  btnPrev.addEventListener("click", () => {
    if (index > 0) { index--; mostrarSlide(index); }
  });

  btnNext.addEventListener("click", () => {
    if (index < slides.length - 1) { index++; mostrarSlide(index); }
  });

  // Swipe táctil
  let inicioX = null;
  const carrusel = document.querySelector(".carrusel");
  carrusel.addEventListener("touchstart", (e) => inicioX = e.touches[0].clientX);
  carrusel.addEventListener("touchend", (e) => {
    if (inicioX === null) return;
    let dx = e.changedTouches[0].clientX - inicioX;
    if (Math.abs(dx) > 40) {
      if (dx < 0 && index < slides.length - 1) index++;
      else if (dx > 0 && index > 0) index--;
      mostrarSlide(index);
    }
    inicioX = null;
  });

  mostrarSlide(index);

  // Tableros tutorial
const estados = {
  1: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,0,0]],
  2: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,2,0,0]],
  3: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,2,4,0]],
  4: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[4,8,16,0]],
  5: [[0,0,0,0],[0,0,0,0],[0,0,2,0],[4,8,16,32]],
  6: [[0,0,0,0],[0,0,0,0],[0,0,4,0],[8,16,32,64]],
  7: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[128,256,512,1024]],
  8: [[0,0,0,0],[0,2,4,8],[16,32,64,128],[256,512,1024,2048]]

};


  function renderMiniTablero(contenedor, estado) {
    contenedor.innerHTML = "";
    estados[estado].flat().forEach(valor => {
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
    const estado = div.getAttribute("data-estado");
    renderMiniTablero(div, estado);
  });
});
