# 🎮 2048-EAN

Versión personalizada del clásico juego **2048**, adaptada para mostrar **puntajes globales** guardados en AWS.  

Arquitectura **serverless**:  
- **Frontend** en AWS Amplify (HTML, CSS, JS).  
- **Backend** con API Gateway + Lambda (Node.js 22.x).  
- **Base de datos** DynamoDB para puntajes.  

---

## 📦 Parte A — Solo el juego (Frontend)

### ✅ Requisitos mínimos
- Navegador moderno (Chrome/Edge/Firefox).
- **Git** (para clonar el fork).
- Un servidor estático local:
  - `npx http-server` (Node.js)
  - `python -m http.server 8080` (Python)
  - Extensión **Live Server** en VS Code

---

### 1) Haz **Fork** y clona tu copia
1. Haz fork de este repositorio en tu cuenta de GitHub.  
2. Clona tu fork:
   ```bash
   git clone https://github.com/<tu-usuario>/2048-EAN.git
   cd 2048-EAN
   ```

---

### 2) Estructura del proyecto
```
2048-EAN/
├─ index.html
├─ styles/estilos.css
└─ juego.js          # lógica del juego + llamadas a la API
```

---

### 3) Configura el endpoint del backend
El juego necesita saber a qué API llamar para guardar/leer puntajes.
- Edita en `juego.js`:
```js
const API_BASE = "https://<tu-id>.execute-api.<region>.amazonaws.com";
```

---

### 4) Ejecuta el juego en local
- Abriendo el index.html en tu navegador de confianza o con un metodo HTTP

---

### 5) Controles del juego
- **Mover fichas**: Flechas o `W/A/S/D`
- **Deshacer**: `Ctrl+Z` / `R` / `Delete`
- **Reiniciar**: botón o `Ctrl+R`
- **Sonido**: tecla `M`
- **🏆 Puntajes**: muestra el Top 5 desde la API (`GET /scores/top`)

---

### 6) Verificación rápida
1. Abre F12 → pestaña **Network**.  
2. Juega una partida.  
3. Debes ver:
   - `POST /scores` → status 200  
   - `GET /scores/top?limit=5` → status 200  

## Parte B organizacion de arquitectura en AWS

### 0) Requisitos
- Cuenta AWS activa
- Permisos: DynamoDB, Lambda, API Gateway
- Región sugerida: `us-east-1`

---

### 1) Amplify — Repositorio de Aplicacion front

- Ingresar al servicio AWS Amplify

#### 1.1 `Boton morado "Create New app"`

- Al ingresar a esta apartado van los siguientes 4 pasos

#### 1.1.1 `Elige el proveedor del codigo fuente`

- En este caso vamos a agregar el repositorio que anteriormente se a forkeado y clonado
- Elegimos `GitHub` en este caso y le damos siguiente

#### 1.1.2 `Agregar Repositorio y rama`

- Se dan los respectivos premisos de `AWS` a `GitHub` y buscamos nuestro repositorio, `(usuario/2048-EAN)`
- elegimos la rama principal y le damos proximo

#### 1.1.3 `Configurar aplicacion`

- si así desea configurar comandos para compilacion de front y directorio de salida de compilacion configurarlo, en este caso no lo hicimos, entonces le dimos proximo

#### 1.1.4 `Revisar y crear`

- Se revisa toda la configuracion hecha anteriormente y se le da `Guardar e implementar`

#### 1.2 `Esperar a que se implemente la aplicacion`

- Esperar a que se despliege la aplicacion y este listo el dominio de la aplicacion
--- 

### 2) DynamoDB — Tabla de puntajes
- **Nombre**: `Scores2048`  
- **Partition key**: `id` (String)  
- **Capacidad**: On-demand  
- Atributos:
  - `id` (string, timestamp)
  - `nombre` (string)
  - `puntaje` (number)
  - `fecha` (string ISO)

---

### 3) Lambda Functions

#### 3.1 `postScore` — Guardar puntaje
- **Runtime**: Node.js 22.x  
- **Archivo**: `index.mjs`  
- **Handler**: `index.handler`  
- **Variable de entorno**: `TABLE_NAME=Scores2048`  

---

#### 3.2 `getTopScores` — Consultar puntajes
- **Runtime**: Node.js 22.x  
- **Archivo**: `index.mjs`  
- **Handler**: `index.handler`  
- **Variable de entorno**: `TABLE_NAME=Scores2048`  

---

### 4) API Gateway — Endpoints
- **Tipo**: HTTP API  
- **Stage**: `$default` (auto-deploy)  
- **Rutas**:
  - `POST /scores` → Lambda `postScore`
  - `GET /scores/top` → Lambda `getTopScores`

**CORS**:  
- Origins: `*` y `API_BASE` (pruebas) o dominio Amplify (producción).  
- Methods: `GET, POST, OPTIONS`  
- Headers: `Content-Type`

---

### 5) Conexión Frontend ↔ Backend
En `juego.js` define:

```js
const API_BASE = "https://<id>.execute-api.<region>.amazonaws.com";
```

## 🧰 Troubleshooting
- **404 en `/scores/top`** → revisa rutas en API Gateway.  
- **CORS bloqueado** → revisa CORS en API Gateway y headers en Lambda.  
- **Top vacío** → revisa que `POST /scores` inserte datos en DynamoDB.  

---

## 📜 Licencia

- FrontEnd y logica del Juego creado por `Brian Pérez` @Lavadora720
- Backend y arquitectura en AWS creado por `David Barrera` @sebasgao05 y `Daniela Coavas` @dannysophi17

Uso educativo y demostrativo.
