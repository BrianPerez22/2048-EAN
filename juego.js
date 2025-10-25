// =====================================================
// Configuración base
// =====================================================
const TAM = 4;
const CLAVE_ESTADO   = '2048_ean_estado';
const CLAVE_MEJOR    = '2048_ean_mejor';
const CLAVE_HISTORIAL = '2048_scores';   // Fallback local para el miniscore

// =====================================================
// Filtro de palabras inapropiadas
// =====================================================
const PALABRAS_PROHIBIDAS = [
  // Las que ya tienes
  'puto', 'puta', 'mierda', 'joder', 'coño', 'cabrón', 'cabron', 'pene',
  'pendejo', 'pendeja', 'idiota', 'estúpido', 'estupido', 'imbécil', 'imbecil',
  'marica', 'maricon', 'maricón', 'negro', 'negra', 'gordo', 'gorda', 'feo', 'fea',
  'hitler', 'nazi', 'drogas', 'cocaína', 'cocaina', 'marihuana',
  'p3nd3j0', 'p3nd3ja', 'm13rd4', 'c4br0n', 'put0', 'put4',

  'culero', 'culo', 'chingar', 'chingada', 'chingado',
  'zorra', 'perra', 'perro', 'basura',
  'gilipollas', 'tarado', 'baboso', 'asqueroso', 'asquerosa',

  'gonorrea', 'pirobo', 'piroba', 'carechimba', 'hijueputa', 'hijueputas',
  'hp', 'güevón', 'guevon', 'weon', 'weona', 'gonorreita',
  'malparido', 'malparida', 'sapoperra', 'cacorro', 'chimbo',
  'maricada', 'lagarto', 'ñero', 'ñera',

  'universidad ean', 'uaniversidad ean', 'uan ean', 'ean hijueputa', 'ean gonorrea',
  'ean mierda', 'muerte ean', 'fuck ean', 'ean basura'
];

function limpiarTexto(texto) {
  return texto.toLowerCase()
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[0]/g, 'o').replace(/[1]/g, 'i').replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a').replace(/[5]/g, 's').replace(/[7]/g, 't')
    .replace(/[@]/g, 'a').replace(/[!]/g, 'i').replace(/[$]/g, 's')
    .replace(/[^a-z\s]/g, '');
}

function esNombreInapropiado(nombre) {
  const nombreLimpio = limpiarTexto(nombre.trim());
  if (nombreLimpio.length === 0 || nombreLimpio.length > 20) return true;
  return PALABRAS_PROHIBIDAS.some(palabra => 
    nombreLimpio.includes(palabra) || nombreLimpio.replace(/\s/g, '').includes(palabra)
  );
}

function solicitarNombreValido() {
  let intentos = 0;
  while (intentos < 3) {
    let nombre = prompt(
      intentos === 0 ? "Escribe tu nombre:" : "Nombre no válido. Intenta con otro nombre:",
      "Jugador"
    );
    if (!nombre) return "Jugador";
    nombre = nombre.trim();
    if (!esNombreInapropiado(nombre)) return nombre;
    intentos++;
  }
  return "Jugador" + Math.floor(Math.random() * 1000);
}

// =====================================================
// 🔗 AWS API (CAMBIA ESTA URL)
// =====================================================
const API_BASE = "https://9g0v6cib0g.execute-api.us-east-1.amazonaws.com";

async function apiGuardarPuntajeAWS({ nombre, puntaje }) {
  const res = await fetch(`${API_BASE}/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, puntaje })
  });
  if (!res.ok) throw new Error(`POST /scores -> ${res.status}`);
  return res.json();
}

async function apiObtenerTopAWS(limit = 5) {
  const res = await fetch(`${API_BASE}/scores/top?limit=${limit}`);
  if (!res.ok) throw new Error(`GET /scores/top -> ${res.status}`);
  return res.json();
}

// =====================================================
// Utilidades
// =====================================================
function copiarMatriz(m) { return m.map(f => f.slice()); }
function matrizVacia()  { return Array.from({ length: TAM }, () => Array(TAM).fill(0)); }
function limitar(v, min, max) { return Math.max(min, Math.min(max, v)); }
function generarId()    { return 'id-' + Date.now() + '-' + Math.floor(Math.random() * 100000); }

// =====================================================
// Clase principal del juego
// =====================================================
class Juego2048 {
  constructor() {
    this.tablero = matrizVacia();
    this.puntaje = 0;
    this.mejor = Number(localStorage.getItem(CLAVE_MEJOR) || 0);
    this.ganado = false;
    this.terminado = false;
    this.perdidoTemporal = false; // Nuevo estado: perdió pero aún puede deshacer
    this.historial = [];
    this.maxDeshacer = 6;
    this.sonidoActivo = true;
    this.continuarDespuesVictoria = false;

    // Referencias UI
    this.domTablero = document.getElementById('tablero-juego');
    this.domPuntaje = document.getElementById('puntaje');
    this.domMejor = document.getElementById('mejor');
    this.domFichas = document.getElementById('fichas');
    this.domFin = document.getElementById('fin-juego');
    this.domPuntajeFinal = document.getElementById('puntaje-final');
    this.botonDeshacer = document.getElementById('btn-deshacer');

    // Miniscore
    this.listaScores = document.getElementById('lista-scores');
    this.btnVerMas = document.getElementById('btn-ver-mas');
    this.mostrandoTodo = false;

    this.inicioToque = null;

    this.iniciar();
  }

  // ---------------------------------------------------
  // Inicialización
  // ---------------------------------------------------
  iniciar() {
    this.iniciarAudio();
    this.configurarUI();
    this.configurarEventos();

    if (!this.cargar()) {
      this.nuevo();
    } else {
      const mejorGuardado = Number(localStorage.getItem(CLAVE_MEJOR) || 0);
      this.mejor = Math.max(this.mejor, mejorGuardado);
    }

    this.actualizarVista();
    this.actualizarBotones();
    this.cargarHistorialMiniScore(); // Carga Top 5 al iniciar
  }

  iniciarAudio() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { this.ctx = null; }
  }

  // ---------------------------------------------------
  // Eventos de UI
  // ---------------------------------------------------
// Reemplaza la función configurarEventos() en tu juego.js

configurarEventos() {
  // Teclado con controles mejorados para PC
  document.addEventListener('keydown', (e) => {
    // Deshacer con Ctrl+Z, R o Supr/Delete
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      this.deshacer(); 
      e.preventDefault(); 
      return;
    }
    
    // Nuevos controles de deshacer para PC
    if (e.key === 'r' || e.key === 'R' || e.key === 'Delete') {
      this.deshacer();
      e.preventDefault();
      return;
    }
    
    // Reiniciar con Ctrl+R (opcional)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) {
      this.reiniciar();
      e.preventDefault();
      return;
    }
    
    // Movimientos (mantenemos los existentes)
    const mapa = {
      'ArrowLeft':'izq','a':'izq','A':'izq',
      'ArrowRight':'der','d':'der','D':'der',
      'ArrowUp':'arr','w':'arr','W':'arr',
      'ArrowDown':'aba','s':'aba','S':'aba'
    };
    
    const dir = mapa[e.key];
    if (dir) { 
      e.preventDefault(); 
      this.mover(dir); 
    }
    
    // Control extra para PC - Espacio para nuevo juego
    if (e.key === ' ' || e.key === 'Spacebar') {
      if (this.terminado || confirm('¿Iniciar nueva partida?')) {
        this.reiniciar();
      }
      e.preventDefault();
      return;
    }
    
    // Escape para cerrar overlay
    if (e.key === 'Escape') {
      if (this.domFin.classList.contains('mostrar')) {
        if (this.ganado && !this.terminado) {
          // Si ganó pero puede continuar
          this.ocultarFin();
          this.ganado = false;
          this.continuarDespuesVictoria = true;
        } else if (this.perdidoTemporal) {
          // Si perdió temporalmente, permitir cerrar con Escape
          this.ocultarFin();
        }
      }
      e.preventDefault();
      return;
    }
    
    // Toggle sonido con M
    if (e.key === 'm' || e.key === 'M') {
      this.toggleSonido();
      e.preventDefault();
      return;
    }
  });

  // Gestos touch (mantener igual)
  if (this.domTablero) {
    this.domTablero.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) return;
      const t = e.touches[0];
      this.inicioToque = { x: t.clientX, y: t.clientY };
    }, { passive: true });

    this.domTablero.addEventListener('touchend', (e) => {
      if (!this.inicioToque) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.inicioToque.x;
      const dy = t.clientY - this.inicioToque.y;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      const umbral = Math.max(20, Math.min(window.innerWidth * 0.04, 40));
      if (Math.max(adx, ady) < umbral) { this.inicioToque = null; return; }
      const dir = (adx > ady) ? (dx > 0 ? 'der' : 'izq') : (dy > 0 ? 'aba' : 'arr');
      this.mover(dir); this.inicioToque = null;
    }, { passive: true });
  }

  // Botones (mantener igual)
  if (this.botonDeshacer) this.botonDeshacer.addEventListener('click', () => this.deshacer());

  const btnReiniciar = document.getElementById("btn-reiniciar");
  if (btnReiniciar) {
    btnReiniciar.addEventListener("click", () => {
      this.reiniciar();
    });
  }

  // 🆕 Botón continuar modificado - ahora también funciona como "deshacer" cuando perdió temporalmente
  const btnContinuar = document.getElementById('btn-continuar');
  if (btnContinuar) {
    btnContinuar.addEventListener('click', () => {
      if (this.perdidoTemporal) {
        // Si perdió temporalmente, usar deshacer
        this.deshacer();
      } else if (this.ganado) {
        // Continuar después de ganar
        this.ocultarFin();
        this.ganado = false;
        this.continuarDespuesVictoria = true;
      }
    });
  }

  // 🆕 Botón reiniciar2 modificado - ahora maneja la confirmación final
  const btnReiniciar2 = document.getElementById("btn-reiniciar2");
  if (btnReiniciar2) {
    btnReiniciar2.addEventListener("click", () => {
      if (this.perdidoTemporal) {
        // Si perdió temporalmente, confirmar fin y agregar al historial
        this.terminado = true;
        this.perdidoTemporal = false;
        this.agregarAlHistorial(this.puntaje);
        // Actualizar el modal para mostrar fin definitivo
        this.mostrarFin();
      } else {
        // Reinicio normal
        this.nuevo();
        this.actualizarVista();
        this.actualizarBotones();
        this.ocultarFin();
        this.guardar();
      }
    });
  }

  // Miniscore
  if (this.btnVerMas) {
    this.btnVerMas.addEventListener('click', () => {
      this.mostrandoTodo = !this.mostrandoTodo;
      this.renderMiniScore();
      this.btnVerMas.textContent = this.mostrandoTodo ? 'Ver menos' : 'Ver más';
    });
  }

  window.addEventListener('beforeunload', () => this.guardar());
}


  configurarUI() {
    // tablero
    this.domTablero.innerHTML = '';
    for (let i = 0; i < TAM * TAM; i++) {
      const celda = document.createElement('div');
      celda.className = 'celda';
      this.domTablero.appendChild(celda);
    }
    // overlay
    const overlay = document.createElement('div');
    overlay.id = 'fin-juego';
    overlay.className = 'fin-juego';
overlay.innerHTML = `
  <div class="modal-victoria">
    <h2 id="texto-superior">¡Llegaste a 2048 🎉!</h2>
    <p id="mensaje-fin">Puntaje final: <span id="puntaje-final">0</span></p>
    <div class="botones-fin">
      <button class="btn-juego" id="btn-continuar">Continuar</button>
      <button class="btn-juego" id="btn-reiniciar2">Reiniciar</button>
    </div>
  </div>`;

    this.domTablero.appendChild(overlay);
    this.domFin = document.getElementById('fin-juego');
    this.domPuntajeFinal = document.getElementById('puntaje-final');

    const rango = document.getElementById('rango-deshacer');
    const val = document.getElementById('valor-deshacer');
    if (rango && val) {
      rango.value = this.maxDeshacer; val.textContent = this.maxDeshacer;
      rango.addEventListener('input', e => {
        const valor = parseInt(e.target.value);
        val.textContent = valor;
        this.maxDeshacer = limitar(valor, 1, 12);
        if (this.historial.length > this.maxDeshacer) {
          this.historial = this.historial.slice(-this.maxDeshacer);
        }
      });
    }
  }

  // ---------------------------------------------------
  // Lógica de tablero
  // ---------------------------------------------------
  guardarEstado() {
    this.historial.push({ tablero: copiarMatriz(this.tablero), puntaje: this.puntaje });
    if (this.historial.length > this.maxDeshacer) this.historial.shift();
  }

deshacer() {
  if (this.historial.length === 0) return;
  const previo = this.historial.pop();
  this.tablero = copiarMatriz(previo.tablero);
  this.puntaje = previo.puntaje;
  this.ganado = false; 
  this.terminado = false;
  this.perdidoTemporal = false; // Resetear estado de pérdida temporal
  this.ocultarFin(); // Ocultar overlay si estaba visible
  this.actualizarVista(); 
  this.actualizarBotones(); 
  this.guardar();
  this.sonido(200, 0.04);
}
nuevo() {
  this.tablero = matrizVacia(); this.puntaje = 0;
  this.ganado = false; this.terminado = false; this.perdidoTemporal = false; this.historial = [];
  this.agregarFicha(); this.agregarFicha();
}

reiniciar() {
  if (this.puntaje > 0) {
    const confirmar = confirm('¿Reiniciar partida actual?');
    if (!confirmar) return;

    // Guardar puntaje en historial SOLO si confirma
    this.agregarAlHistorial(this.puntaje);
  }

  this.nuevo(); 
  this.actualizarVista(); 
  this.actualizarBotones();
  this.ocultarFin(); 
  this.guardar();
}


  toggleSonido() {
    this.sonidoActivo = !this.sonidoActivo;
    const btn = document.getElementById('btn-sonido');
    if (btn) btn.textContent = this.sonidoActivo ? '🔊 SONIDO' : '🔇 SONIDO';
  }

  agregarFicha() {
    const vacias = [];
    for (let r = 0; r < TAM; r++) for (let c = 0; c < TAM; c++) if (this.tablero[r][c] === 0) vacias.push({ r, c });
    if (vacias.length) {
      const azar = vacias[Math.floor(Math.random() * vacias.length)];
      this.tablero[azar.r][azar.c] = Math.random() < 0.9 ? 2 : 4;
      return true;
    }
    return false;
  }

// -----------------------
// Reemplazar por esta versión de mover(dir)
// -----------------------
mover(dir) {
  // Si perdió temporalmente, no permitir movimientos (solo deshacer)
if (this.perdidoTemporal) return;
  this.guardarEstado();
  let movido = false;
  const mergedValues = []; // guardará los valores resultantes de fusiones para animar después

  for (let idx = 0; idx < TAM; idx++) {
    let linea = [];
    for (let j = 0; j < TAM; j++) {
      switch (dir) {
        case 'izq': linea.push(this.tablero[idx][j]); break;
        case 'der': linea.push(this.tablero[idx][TAM - 1 - j]); break;
        case 'arr': linea.push(this.tablero[j][idx]); break;
        case 'aba': linea.push(this.tablero[TAM - 1 - j][idx]); break;
      }
    }

    const compacta = linea.filter(x => x !== 0);
    for (let i = 0; i < compacta.length - 1; i++) {
      if (compacta[i] === compacta[i + 1]) {
        compacta[i] *= 2;
        this.puntaje += compacta[i];
        // registrar valor fusionado para animar después
        mergedValues.push(compacta[i]);
        compacta.splice(i + 1, 1);
      }
    }

    while (compacta.length < TAM) compacta.push(0);

    for (let j = 0; j < TAM; j++) {
      const valor = compacta[j];
      let actual;
      switch (dir) {
        case 'izq':
          actual = this.tablero[idx][j];
          if (actual !== valor) movido = true;
          this.tablero[idx][j] = valor;
          break;
        case 'der':
          actual = this.tablero[idx][TAM - 1 - j];
          if (actual !== valor) movido = true;
          this.tablero[idx][TAM - 1 - j] = valor;
          break;
        case 'arr':
          actual = this.tablero[j][idx];
          if (actual !== valor) movido = true;
          this.tablero[j][idx] = valor;
          break;
        case 'aba':
          actual = this.tablero[TAM - 1 - j][idx];
          if (actual !== valor) movido = true;
          this.tablero[TAM - 1 - j][idx] = valor;
          break;
      }
    }
  }

  if (!movido) { this.historial.pop(); return; }

  this.agregarFicha();
  if (this.puntaje > this.mejor) {
    this.mejor = this.puntaje;
    localStorage.setItem(CLAVE_MEJOR, String(this.mejor));
  }

  this.sonido(300, 0.04);

  // Actualiza vista primero (esto reposiciona y crea nodos)
  this.actualizarVista();
  this.actualizarBotones();
  this.guardar();
  this.verificarEstado();

  // Después de renderizar, dispara la animación de fusión sobre los .ficha-inner correspondientes.
  // Intentamos animar una ficha por cada valor fusionado (evita animar demasiadas).
  if (mergedValues.length) {
    // usar un pequeño timeout para asegurarnos que el DOM terminó de aplicar estilos
    setTimeout(() => {
      for (const val of mergedValues) {
        const el = this.domTablero.querySelector(`.ficha-inner.v${val}`);
        if (el) {
          el.classList.add("fusion");
          el.addEventListener("animationend", () => el.classList.remove("fusion"), { once: true });
        }
      }
    }, 30);
  }
}


verificarEstado() {
  const hay2048 = this.tablero.some(f => f.includes(2048));

  // Solo mostrar victoria la primera vez
  if (hay2048 && !this.continuarDespuesVictoria && !this.ganado) {
    this.ganado = true;
    setTimeout(() => this.mostrarFin(), 300);
    return;
  }

  // Si no hay más movimientos, pérdida temporal (aún puede deshacer)
  if (this.esFin()) {
    this.perdidoTemporal = true; // Marcar como pérdida temporal
    setTimeout(() => this.mostrarFin(), 300);
  }
}



  esFin() {
    for (let r = 0; r < TAM; r++) for (let c = 0; c < TAM; c++) if (this.tablero[r][c] === 0) return false;
    for (let r = 0; r < TAM; r++) for (let c = 0; c < TAM; c++) {
      const v = this.tablero[r][c];
      if ((r > 0 && this.tablero[r - 1][c] === v) ||
          (r < TAM - 1 && this.tablero[r + 1][c] === v) ||
          (c > 0 && this.tablero[r][c - 1] === v) ||
          (c < TAM - 1 && this.tablero[r][c + 1] === v)) return false;
    }
    return true;
  }
mostrarFin() {
  const texto = document.getElementById('texto-superior');
  const mensaje = document.getElementById('mensaje-fin');
  const btnContinuar = document.getElementById('btn-continuar');
  const btnReiniciar = document.getElementById('btn-reiniciar2');
  
  if (this.ganado) {
    texto.textContent = '¡Llegaste a 2048 🎉!';
    mensaje.textContent = 'Puedes seguir jugando o reiniciar.';
    btnContinuar.style.display = 'inline-block';
    btnContinuar.textContent = 'Continuar';
    btnReiniciar.textContent = 'Reiniciar';
  } else if (this.perdidoTemporal) {
    // Estado de pérdida temporal - aún puede deshacer
    texto.textContent = '¡Sin movimientos disponibles!';
    mensaje.innerHTML = `¿Quieres deshacer o finalizar?<br>Puntaje actual: <span>${this.puntaje}</span>`;
    btnContinuar.style.display = 'inline-block';
    btnContinuar.textContent = 'Deshacer último movimiento';
    btnReiniciar.textContent = 'Finalizar partida';
  } else {
    // Fin definitivo (cuando ya confirmó)
    texto.textContent = '¡Fin del juego!';
    mensaje.innerHTML = `Puntaje final: <span id="puntaje-final">${this.puntaje}</span>`;
    btnContinuar.style.display = 'none';
    btnReiniciar.textContent = 'Nueva partida';
  }
  
  this.domFin.classList.add('mostrar');
}

  ocultarFin() { this.domFin.classList.remove('mostrar'); }

// -----------------------

// -----------------------
// -----------------------

// -----------------------
actualizarVista() {
  const rect = this.domTablero.getBoundingClientRect();
  const tamTab = rect.width;
  const hueco = 10;
  const lado = (tamTab - hueco * (TAM + 1)) / TAM;

  // Mapa de fichas DOM actuales por su position actual "r-c"
  const fichasActuales = new Map();
  this.domTablero.querySelectorAll('.ficha').forEach(f => {
    const pos = f.dataset.pos;
    if (pos) fichasActuales.set(pos, f);
  });

  let totalFichas = 0;

  // Recorre el tablero y actualiza/crea fichas
  for (let r = 0; r < TAM; r++) {
    for (let c = 0; c < TAM; c++) {
      const v = this.tablero[r][c];

      if (v !== 0) totalFichas++;

      const targetPos = `${r}-${c}`;
      const x = hueco + c * (lado + hueco);
      const y = hueco + r * (lado + hueco);

      if (v === 0) {
        // si hay una ficha DOM en esa posición que ya no corresponde, bórrala
        const exist = fichasActuales.get(targetPos);
        if (exist) {
          exist.remove();
          fichasActuales.delete(targetPos);
        }
        continue;
      }

      // Si ya existe una ficha exactamente en esa posición, solo actualiza inner si cambió
      let ficha = fichasActuales.get(targetPos);

      if (!ficha) {
        // No existe ficha en la posición objetivo: intentar reutilizar alguna ficha vieja (mejor animación)
        // Buscamos una ficha DOM cuyo inner tenga el mismo valor para "moverla" visualmente
        let reutilizar = null;
        for (const [posKey, node] of fichasActuales.entries()) {
          const innerNode = node.querySelector('.ficha-inner');
          if (innerNode && innerNode.textContent == String(v)) { reutilizar = { posKey, node }; break; }
        }

        if (reutilizar) {
          // reasignar ese nodo al nuevo targetPos
          ficha = reutilizar.node;
          fichasActuales.delete(reutilizar.posKey);
          ficha.dataset.pos = targetPos;

          // asegurarse que el inner tenga la clase correcta y el texto actualizado
          const inner = ficha.querySelector('.ficha-inner');
          if (inner) {
            inner.textContent = String(v);
            inner.className = `ficha-inner v${v}`;
          }
        } else {
          // crear nueva ficha (aparecer)
          ficha = this.crearFicha(v, r, c);
          // crearFicha ya añade elemento al DOM y pone data-pos
        }
      } else {
        // Si existe, actualizamos inner si cambió
        const inner = ficha.querySelector('.ficha-inner');
        const currentVal = inner ? Number(inner.textContent) || 0 : 0;
        if (currentVal !== v) {
          if (inner) {
            inner.textContent = String(v);
            inner.className = `ficha-inner v${v}`;
          }
        }
        // quitamos del mapa porque ya está procesada
        fichasActuales.delete(targetPos);
      }

      // Asegurar que dataset.pos esté correcto
      ficha.dataset.pos = targetPos;

      // Posicionar con transform para aprovechar transition en CSS
      ficha.style.width = `${lado}px`;
      ficha.style.height = `${lado}px`;
      ficha.style.position = 'absolute';
      ficha.style.transform = `translate(${x}px, ${y}px)`;
      // quitar left/top si existían (evita conflicto)
      ficha.style.left = '';
      ficha.style.top = '';
    }
  }

  // Eliminar cualquier ficha DOM que haya quedado "sobrante" (esto limpia merges/antiguas)
  fichasActuales.forEach(node => node.remove());

  // Actualizar marcadores
  this.domPuntaje.textContent = this.puntaje;
  this.domMejor.textContent = this.mejor;

  // Actualizar contador de fichas (si existe el elemento)
  if (this.domFichas) this.domFichas.textContent = totalFichas;

  // Resplandor según cantidad de fichas (usa totalFichas calculado)
  this.domTablero.classList.remove("alerta14", "alerta15", "alerta16");
  if (totalFichas === 14) {
    this.domTablero.classList.add("alerta14");
  } else if (totalFichas === 15) {
    this.domTablero.classList.add("alerta15");
  } else if (totalFichas === 16) {
    this.domTablero.classList.add("alerta16");
  }
}





// -----------------------
crearFicha(valor, fila, col) {
  const ficha = document.createElement("div");
  ficha.className = "ficha";

  const inner = document.createElement("div");
  inner.className = `ficha-inner v${valor}`;
  inner.textContent = valor;
  ficha.appendChild(inner);

  // Identificador de posición
  ficha.dataset.pos = `${fila}-${col}`;

  // Calcular medidas
  const rect = this.domTablero.getBoundingClientRect();
  const tamTab = rect.width;
  const hueco = 10;
  const lado = (tamTab - hueco * (TAM + 1)) / TAM;

  ficha.style.width = `${lado}px`;
  ficha.style.height = `${lado}px`;
  ficha.style.position = 'absolute';

  // Posición inicial con transform
  const x = hueco + col * (lado + hueco);
  const y = hueco + fila * (lado + hueco);
  ficha.style.transform = `translate(${x}px, ${y}px)`;

  this.domTablero.appendChild(ficha);

  // 🔥 animación de aparición en el inner
  inner.style.transform = "scale(0.8)";
  inner.style.opacity = "0";
  requestAnimationFrame(() => {
    inner.style.transition = "transform 0.15s ease-in-out, opacity 0.12s ease";
    inner.style.transform = "scale(1)";
    inner.style.opacity = "1";
  });

  return ficha;
}





  actualizarBotones() { this.botonDeshacer.disabled = this.historial.length === 0; }

  sonido(freq, dur = 0.06) {
    if (!this.sonidoActivo || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq; gain.gain.value = 0.0001;
    osc.connect(gain); gain.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    osc.start(now); gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.stop(now + dur + 0.02);
  }

  guardar() {
    try {
      const estado = {
        perdidoTemporal: this.perdidoTemporal, // Guardar estado de pérdida temporal
        tablero: this.tablero, puntaje: this.puntaje, mejor: this.mejor,
        historial: this.historial, maxDeshacer: this.maxDeshacer, sonidoActivo: this.sonidoActivo
      };
      localStorage.setItem(CLAVE_ESTADO, JSON.stringify(estado));
    } catch (e) { console.warn('No se pudo guardar:', e); }
  }

  cargar() {
    try {
      const guardado = localStorage.getItem(CLAVE_ESTADO);
      if (!guardado) return false;
      const estado = JSON.parse(guardado);
      this.tablero = estado.tablero || matrizVacia();
      this.puntaje = estado.puntaje || 0;
      this.mejor = estado.mejor || this.mejor;
      this.historial = estado.historial || [];
      this.perdidoTemporal = estado.perdidoTemporal || false; // Cargar estado de pérdida temporal
      if (estado.maxDeshacer) this.maxDeshacer = estado.maxDeshacer;
      if (estado.sonidoActivo !== undefined) this.sonidoActivo = estado.sonidoActivo;
      return true;
    } catch { return false; }
  }

   // =========================
  // Guardar puntaje en AWS (con filtro)
  // =========================
  agregarAlHistorial(puntos) {
    const nombre = solicitarNombreValido();

    // Solo nube
    apiGuardarPuntajeAWS({ nombre, puntaje: puntos })
      .then(() => this.cargarHistorialMiniScore())
      .catch((e) => console.error("Error guardando en AWS:", e));
  }

  // =========================
  // Cargar ranking desde AWS
  // =========================
  cargarHistorialMiniScore() {
    apiObtenerTopAWS(5)
      .then((datos) => {
        this.datosMiniScore = Array.isArray(datos)
          ? datos.map(d => ({ nombre: d.nombre, puntaje: d.puntaje }))
          : [];
        this.renderMiniScore();
      })
      .catch((e) => {
        console.error("Error cargando Top 5 desde AWS:", e);
        this.datosMiniScore = [];
        this.renderMiniScore();
      });
  }

  renderMiniScore() {
    if (!this.listaScores) return;
    this.listaScores.innerHTML = '';
    const limite = this.mostrandoTodo ? 10 : 5;

    this.datosMiniScore.slice(0, limite).forEach((item, index) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${index + 1}° ${item.nombre}</span><span>${item.puntaje} pts</span>`;
      this.listaScores.appendChild(li);
    });

    this.btnVerMas.style.display = (this.datosMiniScore.length > 5) ? 'inline-block' : 'none';
  }
}

// -----------------------------------------------------
// Inicialización
// -----------------------------------------------------
let juego;
document.addEventListener('DOMContentLoaded', () => {
  juego = new Juego2048();
});

// --- Código de Meli Switch ---
const meli = document.getElementById("meliSwitch");
const texto = document.getElementById("textoInstrucciones");

if (meli && texto) {
  const mensaje1 = "Junta las fichas del mismo número para que se fusionen, llega al 2048 para ganar.";
  const mensaje2 = "Mueve las fichas con WASD, flechas en PC o desliza en el celular.";

  let encendido = false;

  meli.addEventListener("click", () => {
    encendido = !encendido;
    meli.classList.toggle("brillante", encendido);
    texto.textContent = encendido ? mensaje2 : mensaje1;
  });
}