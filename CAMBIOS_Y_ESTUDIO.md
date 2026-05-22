# Gamefy — Registro de cambios y guía de estudio
> Documento técnico para programadores junior. Explica cada cambio realizado, la lógica detrás, las funciones involucradas y los conceptos clave.

---

## Índice
1. [Seguridad del repositorio — `.gitignore`](#1-seguridad-del-repositorio--gitignore)
2. [Refactorización de `InputHandler.js`](#2-refactorización-de-inputhandlerjs)
   - 2.1 [MarqueeSelector.js](#21-marqueeselectorjs)
   - 2.2 [SelectionHandler.js](#22-selectionhandlerjs)
   - 2.3 [NodeEditor.js](#23-nodeeditorjs)
   - 2.4 [KeyboardShortcuts.js](#24-keyboardshortcutsjs)
   - 2.5 [InputHandler.js — nuevo coordinador](#25-inputhandlerjs--nuevo-coordinador)
3. [Corrección de estado duplicado en `Editor.js`](#3-corrección-de-estado-duplicado-en-editorjs)
4. [Corrección de feedback asíncrono en `AICharacterPanel.js`](#4-corrección-de-feedback-asíncrono-en-aicharacterpaneljs)
5. [Hardening del servidor proxy](#5-hardening-del-servidor-proxy)
   - 5.1 [CORS restringido](#51-cors-restringido)
   - 5.2 [Rate Limiting](#52-rate-limiting)
   - 5.3 [Validación de inputs](#53-validación-de-inputs)
   - 5.4 [Sanitización de errores](#54-sanitización-de-errores)
   - 5.5 [Validación del parámetro de ruta](#55-validación-del-parámetro-de-ruta)

---

## 1. Seguridad del repositorio — `.gitignore`

### Qué se hizo
Se creó el archivo `.gitignore` en la raíz del proyecto con el siguiente contenido:
```
.env
node_modules/
proxy/node_modules/
proxy/models/
.vscode/
*.glb
.DS_Store
```

### Por qué era necesario
Git rastrea todos los archivos de un proyecto a menos que se le indique lo contrario. El archivo `.env` contiene el token privado de la API de Replicate. Si este archivo se sube a GitHub, cualquier persona que acceda al repositorio puede ver ese token y usarlo para generar modelos 3D a tu costa.

### Cómo funciona `.gitignore`
Cada línea del archivo es un patrón. Git ignora cualquier archivo o carpeta que coincida con algún patrón:

| Patrón | Qué ignora |
|---|---|
| `.env` | El archivo de variables de entorno con el token |
| `node_modules/` | Las dependencias instaladas (pesan cientos de MB, no deben subirse) |
| `*.glb` | Cualquier archivo con extensión `.glb` (modelos 3D generados, son binarios grandes) |
| `.DS_Store` | Archivo que macOS crea automáticamente en cada carpeta |

### Concepto clave: variables de entorno
Un archivo `.env` sigue el formato `CLAVE=valor`. El servidor lo carga con la librería `dotenv`:
```js
import dotenv from "dotenv";
dotenv.config(); // Lee .env y carga cada línea como process.env.CLAVE

const TOKEN = process.env.REPLICATE_API_TOKEN; // "r8_xxx..."
```
Esto evita hardcodear secretos directamente en el código fuente.

---

## 2. Refactorización de `InputHandler.js`

### El problema
El archivo original `InputHandler.js` tenía **1083 líneas** y mezclaba cinco responsabilidades completamente distintas en una sola clase:
- Routing de eventos del mouse y teclado
- Lógica de selección por rectángulo (marquee)
- Lógica de selección de objetos, caras y bordes
- Edición de nodos 2D
- Atajos de teclado

### El principio aplicado: Single Responsibility Principle (SRP)
> Cada módulo o clase debe tener **una sola razón para cambiar**.

Cuando una clase tiene múltiples responsabilidades, un cambio en una de ellas puede romper las demás sin que sea obvio. La solución es separar cada responsabilidad en su propio archivo.

### Resultado final
```
js/tools/
  InputHandler.js      ← coordinador (~220 líneas)
  MarqueeSelector.js   ← selección por rectángulo
  SelectionHandler.js  ← selección de objetos/caras/bordes
  NodeEditor.js        ← edición de nodos 2D
  KeyboardShortcuts.js ← atajos de teclado
```

`InputHandler` se convirtió en un **coordinador**: su único trabajo es escuchar eventos del DOM y delegar cada uno al módulo correcto.

---

### 2.1 `MarqueeSelector.js`

**Responsabilidad:** Gestionar la selección de múltiples objetos dibujando un rectángulo con el mouse.

#### Variables de instancia
```js
this.marqueeMode = false;        // Si el modo marquee está activo o no
this.isMarqueeDragging = false;  // Si el usuario está arrastrando en este momento
this.marqueeStart = null;        // Coordenadas {x, y} donde empezó el arrastre
this.marqueeEnd = null;          // Coordenadas {x, y} donde está el mouse ahora
this.marqueeDiv = null;          // El elemento <div> que dibuja el rectángulo en pantalla
```

#### Métodos públicos
| Método | Qué hace |
|---|---|
| `setMode(active)` | Activa/desactiva el modo marquee y actualiza el botón en la UI |
| `start(event)` | Registra el punto inicial y crea el div visual |
| `update(event)` | Actualiza la posición del rectángulo mientras el mouse se mueve |
| `cancel()` | Cancela el arrastre sin seleccionar nada |
| `finish(event, propertiesPanel)` | Aplica la selección final con los modificadores Shift/Ctrl |

#### Métodos privados (prefijo `_`)
| Método | Qué hace |
|---|---|
| `_createDiv()` | Crea el `<div>` verde con borde punteado que se ve en pantalla |
| `_updateDiv()` | Recalcula posición y tamaño del div según `marqueeStart` y `marqueeEnd` |
| `_getObjectsInRect(start, end)` | Proyecta objetos 3D a pantalla y comprueba si están dentro del rectángulo |

#### Concepto clave: proyección 3D → 2D
Los objetos en Three.js existen en un espacio 3D. El rectángulo de selección existe en coordenadas de pantalla (2D). Para saber si un objeto 3D está "dentro" del rectángulo hay que proyectarlo:

```js
const vector = vertice3D.clone().project(camera);
// .project() convierte coordenadas 3D → NDC (Normalized Device Coordinates)
// NDC va de -1 a +1 en X e Y

const x = (vector.x * 0.5 + 0.5) * domElement.clientWidth;
const y = -(vector.y * 0.5 - 0.5) * domElement.clientHeight;
// Convertimos NDC → píxeles de pantalla
```

Se comprueban los 8 vértices del bounding box (caja contenedora) del objeto. Si alguno cae dentro del rectángulo, el objeto se selecciona.

#### Concepto clave: modificadores Shift y Ctrl
```js
if (event.shiftKey) {
  // SUMAR al a selección actual
  newSelection = [...(this.editor.selectedObjects || []), ...objects];
} else if (event.ctrlKey) {
  // TOGGLE: agregar si no está, quitar si ya está
  objects.forEach((obj) => {
    const index = newSelection.indexOf(obj);
    if (index === -1) newSelection.push(obj);
    else newSelection.splice(index, 1);
  });
} else {
  // REEMPLAZAR la selección
  newSelection = objects;
}
```

---

### 2.2 `SelectionHandler.js`

**Responsabilidad:** Todo lo relacionado con hacer click para seleccionar objetos, caras o bordes.

#### Variables de instancia
```js
this.selectionMode = "marquee"; // Modo activo: 'marquee', 'face', 'edge'
this.selectedFaceInfo = null;   // Info de la cara seleccionada {object, faceIndex, face}
this.selectedEdgeInfo = null;   // Info del borde seleccionado {object, edgeIndex, vertices}
this.faceHelper = null;         // Mesh temporal que resalta la cara seleccionada
this.edgeHelper = null;         // Line temporal que resalta el borde seleccionado
```

#### Concepto clave: Raycasting
Raycasting es la técnica para saber qué objeto 3D está bajo el cursor del mouse. Funciona lanzando un "rayo" invisible desde la cámara, en la dirección donde apunta el mouse, y comprobando con qué objetos intersecta:

```js
_getRaycaster(event) {
  const mouse = this._getMouseVector(event);
  // mouse.x y mouse.y van de -1 a +1 (NDC)

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, this.editor.camera);
  // Configura el rayo: origen en la cámara, dirección hacia mouse
  return raycaster;
}
```

```js
const intersects = raycaster.intersectObjects(this.editor.getAllObjects());
// intersects es un array ordenado por distancia
// intersects[0] es el objeto más cercano a la cámara
```

#### Concepto clave: traversal de padres (bubble up)
En Three.js los objetos se organizan en jerarquías. Un cubo puede ser hijo de un grupo que tiene `userData.type`. Cuando el raycaster golpea el mesh interno, hay que "subir" hasta encontrar el objeto lógico (el grupo):

```js
_resolveTarget(obj) {
  let target = obj;
  while (target.parent && !target.userData?.type) {
    target = target.parent;
    // Sube un nivel en la jerarquía
  }
  return target.userData?.type ? target : obj;
  // Si encontró tipo, retorna ese; sino, el original
}
```

#### `_syncAfterSelection()` — el conector central
Este método privado sincroniza todos los sistemas después de cualquier cambio de selección. Es el "pegamento" entre módulos:

```js
_syncAfterSelection() {
  const sel = this.editor.selectedObjects;
  if (sel.length === 1) {
    this.transformManager?.attach(sel[0]);   // Muestra el gizmo de transformación
    this.propertiesPanel?.updateForObject(sel[0]); // Actualiza el panel derecho
    this.assetsPanel?.setCurrentObject(sel[0]);    // Actualiza el panel de assets
  } else {
    this.transformManager?.detach();
    this.propertiesPanel?.updateForObject(null);
    this.assetsPanel?.setCurrentObject(null);
  }
}
```

El operador `?.` (optional chaining) llama al método solo si el objeto existe. Evita errores si algún módulo no está inicializado.

---

### 2.3 `NodeEditor.js`

**Responsabilidad:** Permitir editar los puntos de control (nodos) de las formas 2D como rectángulos y líneas.

#### Variables de instancia
```js
this.selectedNode = null;         // El nodo (esfera pequeña) actualmente seleccionado
this.selectedNodeGroup = null;    // El grupo padre de ese nodo
this.nodeDragging = false;        // Si el usuario está arrastrando un nodo
this.nodeDragStartMouse = null;   // Posición del mouse al iniciar el arrastre {x, y}
this.nodeDragStartPos = null;     // Posición 3D del nodo al iniciar el arrastre
this.nodeDragAxis = null;         // Eje bloqueado: 'x' o 'z'
this.nodeGizmo = null;            // Las dos líneas (roja/verde) que indican los ejes
```

#### Concepto clave: axis locking (bloqueo de eje)
El arrastre de nodos está bloqueado a un solo eje. El eje se determina automáticamente según la dirección inicial del movimiento:

```js
if (!this.nodeDragAxis) {
  this.nodeDragAxis = Math.abs(dx) > Math.abs(dz) ? "x" : "z";
  // Si el movimiento horizontal (dx) supera al vertical (dz), bloquea en X
  // Si el vertical (dz) supera al horizontal (dx), bloquea en Z
}
```

Luego se aplica el desplazamiento solo en el eje bloqueado:
```js
const newPos = this.nodeDragStartPos.clone();
if (this.nodeDragAxis === "x") newPos.x += dx;
else newPos.z += dz;
```

#### `_updateShapeFromNodes(group)` — reconstruir geometría
Cuando un nodo se mueve, hay que reconstruir la geometría de la forma completa:

```js
_updateShapeFromNodes(group) {
  const nodes = group.userData.nodes; // Array de meshes que son los nodos
  const points = nodes
    .slice()                          // Copia del array (no mutar el original)
    .sort((a, b) => a.userData.nodeIndex - b.userData.nodeIndex) // Orden correcto
    .map((node) => node.position.clone()); // Extrae posiciones 3D

  const oldGeom = group.userData.lineObject.geometry;
  oldGeom.dispose(); // MUY IMPORTANTE: liberar memoria de GPU antes de reemplazar
  group.userData.lineObject.geometry = new THREE.BufferGeometry().setFromPoints(points);
  group.userData.points = points;
}
```

> **Por qué `dispose()`:** Three.js sube geometrías a la memoria de la GPU (VRAM). Si simplemente reemplazas la referencia en JS, la geometría vieja queda en VRAM para siempre (memory leak). `dispose()` le dice a Three.js que libere esa memoria.

---

### 2.4 `KeyboardShortcuts.js`

**Responsabilidad:** Escuchar eventos de teclado y traducirlos en acciones del editor.

#### Constructor con objeto de opciones
En lugar de recibir N parámetros individuales, recibe un objeto:
```js
constructor({ editor, gridConfig, transformManager, inputHandler }) {
  // Destructuring: extrae las propiedades del objeto pasado
}
```
Esto es más legible que `constructor(editor, gridConfig, transformManager, inputHandler)` y el orden de los parámetros no importa.

#### `attach()` / `detach()` — ciclo de vida
```js
attach() {
  window.addEventListener("keydown", this._onKeyDown);
}
detach() {
  window.removeEventListener("keydown", this._onKeyDown);
}
```

Siempre que agregues un event listener debes poder quitarlo. Si no, el listener sigue vivo aunque el objeto que lo creó ya no exista (memory leak).

#### Guardia para inputs de texto
```js
const target = event.target;
if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
```
Sin esta guardia, presionar `Delete` mientras escribes en un campo de texto borraría el objeto seleccionado. Se verifica el elemento que tiene el foco antes de procesar cualquier tecla.

#### El mapa de formas — objeto como lookup table
En lugar de un `switch` largo, se usa un objeto como tabla de búsqueda:
```js
const shapeMap = {
  b: ["cube", "3d"],
  n: ["sphere", "3d"],
  j: ["rect2d", "2d"],
  // ...
};
const shape = shapeMap[key]; // O(1) lookup
if (shape) this.inputHandler.setTool(shape[0], shape[1]);
```

---

### 2.5 `InputHandler.js` — nuevo coordinador

**Responsabilidad:** Solo routing de eventos. No contiene lógica de negocio.

#### Getters de re-exportación
Para que el código externo (`main.js`, paneles) siga funcionando sin cambios, `InputHandler` expone getters que apuntan a sus sub-módulos:
```js
get selectionMode() { return this.selection.selectionMode; }
get marqueeMode()    { return this.marquee.marqueeMode; }
```
Quien lea `inputHandler.marqueeMode` no sabe (ni necesita saber) que el valor viene de `this.marquee`.

#### Patrón: Dependency Injection
Los sub-módulos no crean sus propias dependencias — las reciben como parámetros:
```js
this.marquee    = new MarqueeSelector(editor, transformManager);
this.selection  = new SelectionHandler(editor, transformManager, propertiesPanel, assetsPanel);
this.nodeEditor = new NodeEditor(editor, transformManager);
this.keyboard   = new KeyboardShortcuts({ editor, gridConfig, transformManager, inputHandler: this });
```
Esto hace el código testeable: en un test puedes pasar objetos falsos (mocks) en lugar de los reales.

---

## 3. Corrección de estado duplicado en `Editor.js`

### El problema original
```js
this.selectedObject = null;   // El objeto seleccionado principal
this.selectedObjects = [];    // Array de todos los objetos seleccionados
```

Dos variables representando información relacionada. En `InputHandler.js` existía código como:
```js
this.editor.selectedObject = null;  // ← solo limpia uno
// ...olvidó limpiar selectedObjects también
```
Resultado: `selectedObject` era `null` pero `selectedObjects` seguía teniendo el objeto. El sistema quedaba en estado inconsistente.

### La solución: getter y setter
Un **getter** es un método que se llama como si fuera una propiedad (sin paréntesis). Un **setter** es lo mismo pero para asignación.

```js
get selectedObject() {
  return this.selectedObjects[0] ?? null;
  // ?? es el "nullish coalescing operator"
  // Si selectedObjects[0] es undefined, retorna null
}

set selectedObject(obj) {
  if (obj === null) {
    this.selectedObjects = []; // Limpiar todo
  } else if (this.selectedObjects[0] !== obj) {
    // Poner obj primero, conservar el resto sin duplicarlo
    this.selectedObjects = [obj, ...this.selectedObjects.filter((o) => o !== obj)];
  }
}
```

#### Por qué `...this.selectedObjects.filter((o) => o !== obj)`
El operador spread `...` "expande" un array dentro de otro. `filter` retorna un nuevo array sin el objeto `obj` (por si ya estaba). El resultado es: `obj` primero, luego los demás sin repetirlo.

#### Cómo se usa ahora
El código externo no cambió en absoluto. Cuando alguien escribe:
```js
editor.selectedObject = null; // Llama al setter → selectedObjects = []
editor.selectedObject;        // Llama al getter → retorna selectedObjects[0]
```
La sincronización es automática e imposible de olvidar.

---

## 4. Corrección de feedback asíncrono en `AICharacterPanel.js`

### El problema original
```js
try {
  const response = await fetch("http://localhost:3001/api/generate", { ... });
  const data = await response.json();

  const loader = new GLTFLoader();
  loader.load(
    data.url,
    (gltf) => {
      // callback: se ejecuta cuando el modelo termina de cargar
      this.previewModel = gltf.scene;
    },
    undefined,
    (error) => { /* ... */ }
  );

  progressMsg.style.display = "none"; // ← SE EJECUTA AQUÍ, ANTES QUE EL CALLBACK
  alert("¡Personaje generado con éxito!"); // ← TAMBIÉN AQUÍ
}
```

`loader.load()` es **asíncrono con callbacks** (no usa `await`). El código continúa ejecutándose inmediatamente después de llamarlo, sin esperar a que el modelo cargue. El spinner desaparecía y el alert aparecía mientras el modelo aún se estaba descargando.

### Concepto clave: asincronía con callbacks vs async/await
```
FLUJO INCORRECTO (original):
1. fetch() → espera respuesta ✓
2. response.json() → espera parseo ✓
3. loader.load() → lanza descarga en segundo plano, NO espera
4. progressMsg.style.display = "none" ← se ejecuta AQUÍ, modelo aún cargando
5. alert("éxito") ← se ejecuta AQUÍ, modelo aún cargando
6. ... (más tarde) callback onLoad se ejecuta con el modelo listo
```

```
FLUJO CORRECTO (después del fix):
1. fetch() → espera respuesta ✓
2. response.json() → espera parseo ✓  
3. loader.load() → lanza descarga en segundo plano
4. ... (más tarde) callback onLoad se ejecuta:
   → guarda el modelo
   → progressMsg.style.display = "none" ✓
   → alert("éxito") ✓
```

### La corrección
```js
loader.load(
  data.url,
  (gltf) => {
    // Todo lo que depende del modelo cargado va AQUÍ DENTRO
    this.previewModel = gltf.scene;
    this.previewScene.add(this.previewModel);
    this.applyModifiers();
    this.generatedModel = { url: data.url, name: "AI_Character" };
    progressMsg.style.display = "none";  // ← Movido aquí
    alert("¡Personaje generado con éxito!"); // ← Movido aquí
  },
  undefined,
  (error) => {
    progressMsg.style.display = "none";  // ← También en el error
    this.createParametricCharacter();
  }
);
```

---

## 5. Hardening del servidor proxy

El servidor proxy actúa como intermediario entre el navegador y la API de Replicate. Su trabajo es proteger el token de API y controlar qué peticiones se procesan.

### 5.1 CORS restringido

#### Qué es CORS
CORS (Cross-Origin Resource Sharing) es un mecanismo de seguridad del navegador. Por defecto, los navegadores **bloquean** peticiones de JavaScript a un dominio diferente al de la página actual. El servidor puede indicar qué orígenes tienen permitido el acceso.

#### El problema original
```js
app.use(cors()); // Sin parámetros = permite CUALQUIER origen
```
Cualquier sitio web en internet podía hacer fetch a `http://localhost:3001/api/generate` y consumir tu quota de Replicate.

#### La corrección
```js
const ALLOWED_ORIGINS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);  // null = sin error, true = permitir
    } else {
      callback(new Error("CORS: origen no permitido"));
    }
  },
}));
```

`!origin` permite peticiones sin encabezado Origin (curl, Postman) — útil en desarrollo local.

---

### 5.2 Rate Limiting

#### Qué es y por qué importa
Sin rate limiting, un atacante puede hacer 1000 requests en un segundo y agotar todo el crédito de la API. El rate limiting limita cuántas requests puede hacer una IP en un período de tiempo.

#### La instalación
```bash
npm install express-rate-limit
```

#### El uso
```js
import rateLimit from "express-rate-limit";

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,  // Ventana de tiempo: 1 minuto (en milisegundos)
  max: 5,               // Máximo 5 requests por IP en esa ventana
  standardHeaders: true, // Envía headers RateLimit-* al cliente
  legacyHeaders: false,  // No envía los viejos headers X-RateLimit-*
  message: { error: "Demasiadas solicitudes. Intenta en un minuto." },
});

// Se aplica como middleware SOLO en este endpoint:
app.post("/api/generate", generateLimiter, validateGenerateInput, async (req, res) => {
  // ...
});
```

Los **middlewares** en Express son funciones que se ejecutan en cadena antes del handler final. El orden importa: `generateLimiter` se ejecuta primero, luego `validateGenerateInput`, luego el handler `async (req, res) => { ... }`. Si el rate limit se excede, el flujo se corta y nunca llega al handler.

---

### 5.3 Validación de inputs

#### Por qué validar en el servidor
Nunca confíes en el cliente. Cualquier persona puede hacer una petición HTTP directamente (con curl, Postman, o código propio) y enviar datos malformados. El servidor debe validar independientemente del frontend.

#### El middleware de validación
```js
const MAX_PROMPT_LENGTH = 500;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

function validateGenerateInput(req, res, next) {
  const { imageData, prompt } = req.body;

  // 1. imageData debe existir y ser string
  if (!imageData || typeof imageData !== "string") {
    return res.status(400).json({ error: "imageData es requerido." });
    // 400 = Bad Request (el cliente envió datos inválidos)
  }

  // 2. Debe ser un Data URL de imagen (formato: "data:image/png;base64,...")
  if (!imageData.startsWith("data:image/")) {
    return res.status(400).json({ error: "imageData debe ser una imagen en base64." });
  }

  // 3. Tamaño aproximado (base64 infla el tamaño ~33%)
  const approxBytes = (imageData.length * 3) / 4;
  if (approxBytes > MAX_IMAGE_BYTES) {
    return res.status(413).json({ error: "La imagen supera el tamaño máximo de 8 MB." });
    // 413 = Payload Too Large
  }

  // 4. prompt es opcional, pero si existe debe ser string corto
  if (prompt !== undefined && typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt debe ser texto." });
  }
  if (prompt && prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: `El prompt no puede superar ${MAX_PROMPT_LENGTH} caracteres.` });
  }

  next(); // Todo OK, pasar al siguiente middleware/handler
}
```

`next()` es la función que le indica a Express que continúe al siguiente paso en la cadena. Si no se llama `next()` (ni se envía respuesta), la petición queda colgada.

#### Códigos HTTP relevantes
| Código | Significado | Cuándo usarlo |
|---|---|---|
| `200` | OK | Todo bien |
| `400` | Bad Request | El cliente envió datos inválidos |
| `413` | Payload Too Large | El cuerpo de la petición es demasiado grande |
| `429` | Too Many Requests | Rate limit excedido |
| `500` | Internal Server Error | Error inesperado en el servidor |

---

### 5.4 Sanitización de errores

#### El problema
```js
catch (error) {
  res.status(500).json({ error: error.message }); // ← expone detalles internos
}
```

`error.message` puede contener rutas del sistema, nombres de variables, stack traces o detalles de la base de datos. Esta información le facilita el trabajo a un atacante.

#### La corrección
```js
catch (error) {
  console.error("Error en /api/generate:", error); // Detalle completo solo en logs del servidor
  res.status(500).json({ error: "Error al generar el modelo. Inténtalo de nuevo." }); // Mensaje genérico al cliente
}
```

**Regla general:** Los errores detallados van a los logs del servidor. Los clientes solo reciben mensajes genéricos.

---

### 5.5 Validación del parámetro de ruta

#### El problema
```js
app.get("/api/status/:id", async (req, res) => {
  const { id } = req.params; // ← sin validación
  const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, ...);
```

Si `id` contiene caracteres especiales o una URL, podría resultar en un request inesperado.

#### La corrección con expresión regular
```js
if (!/^[a-zA-Z0-9-]+$/.test(id)) {
  return res.status(400).json({ error: "ID de predicción inválido." });
}
```

Desglose de la regex `/^[a-zA-Z0-9-]+$/`:
| Parte | Significado |
|---|---|
| `/` | Delimitador de inicio de regex |
| `^` | Inicio del string |
| `[a-zA-Z0-9-]` | Solo letras (mayus/minus), números y guiones |
| `+` | Al menos un carácter |
| `$` | Fin del string |
| `/` | Delimitador de fin de regex |

`.test(id)` retorna `true` si el id cumple el patrón. El `!` lo invierte: si NO cumple, rechazar.

---

## Conceptos generales aplicados a lo largo del proyecto

### Principio de mínimo privilegio
Dar a cada parte del sistema solo los permisos que necesita. El servidor antes aceptaba cualquier origen, cualquier input, sin límites — ahora solo lo que está explícitamente permitido.

### Separación de responsabilidades
Cada módulo hace una sola cosa. Cuando algo falla, sabes exactamente dónde buscar.

### Fail fast
Validar inputs lo antes posible y rechazar inmediatamente si son inválidos. No esperar hasta el final de la función para detectar que los datos eran malos.

### Feedback sincronizado con la operación real
El usuario debe ver el resultado cuando la operación terminó de verdad, no cuando empezó a ejecutarse.

---

*Documento generado durante sesión de refactorización y hardening — Mayo 2026*
