// js/main.js
import { Editor } from "./core/Editor.js";
import { GridConfig } from "./ui/GridConfig.js";
import { UIComponents } from "./ui/UIComponents.js";
import { PreviewManager } from "./tools/PreviewManager.js";
import { InputHandler } from "./tools/InputHandler.js";
import { PropertiesPanel } from "./ui/PropertiesPanel.js";
import { CameraManager } from "./cameras/CameraManager.js";
import { DrawingTools } from "./tools/DrawingTools.js";
import { TransformManager } from "./controls/TransformManager.js";
import { GridShader } from "./ui/GridShader.js";
import { TextureManager } from "./core/TextureManager.js";
import { AssetsPanel } from "./ui/AssetsPanel.js";
import { LightingPanel } from "./ui/LightingPanel.js";
import { Tools2DPanel } from "./ui/Tools2dPanel.js";
import { Tools3DPanel } from "./ui/Tools3DPanel.js";
import { CameraPanel } from "./ui/CameraPanel.js";

// ============================================
// 1. INICIALIZACIÓN
// ============================================
const editor = new Editor();
editor.init("canvas-container");

const gridShader = new GridShader(editor);
gridShader.addToScene();

const propertiesPanel = new PropertiesPanel(editor, gridShader);
const textureManager = new TextureManager(editor);
const ui = new UIComponents(editor);
window.textureManager = textureManager;
const gridConfig = new GridConfig(editor);
const previewManager = new PreviewManager(editor);
const transformManager = new TransformManager(
  editor,
  editor.camera,
  editor.renderer.domElement,
);
const assetsPanel = new AssetsPanel(
  editor,
  textureManager,
  propertiesPanel,
  transformManager,
  "btn-assets",
);
const lightingPanel = new LightingPanel(editor, "btn-lighting");
const inputHandler = new InputHandler(
  editor,
  gridConfig,
  previewManager,
  ui,
  propertiesPanel,
  transformManager,
  assetsPanel,
);
const tools2DPanel = new Tools2DPanel(editor, inputHandler, "btn-tools-2d");
const tools3DPanel = new Tools3DPanel(editor, inputHandler, "btn-tools-3d");
const cameraManager = new CameraManager(editor);
const cameraPanel = new CameraPanel(editor, cameraManager, "btn-camera");
const drawingTools = new DrawingTools(editor, inputHandler);

// Elementos UI
const modeSelect = document.getElementById("drawing-mode");
const colorPicker = document.getElementById("color-picker");

// Ejemplo de textura favorita
assetsPanel.addAsset(
  "favorite-textures",
  "tex1",
  "Madera",
  "https://via.placeholder.com/70",
  () => {
    if (editor.selectedObject) {
      textureManager.loadTexture(
        "ruta/a/madera.jpg",
        editor.selectedObject.material,
      );
    } else {
      alert("Selecciona un objeto primero");
    }
  },
);

// Ejemplo de objeto 3D
assetsPanel.addAsset(
  "objects-3d",
  "obj1",
  "Cubo",
  "https://via.placeholder.com/70",
  () => {
    // Crear un cubo en el centro
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0.5, 0);
    cube.userData = { type: "cube", mode: "3d" };
    editor.addObject(cube);
  },
);

// Ejemplo de sprite
assetsPanel.addAsset(
  "sprites",
  "spr1",
  "Personaje",
  "https://via.placeholder.com/70",
  () => {
    // Crear un sprite (plano con textura) en el centro
    // Esto requeriría cargar una textura, etc.
  },
);

// ============================================
// 2. CONFIGURAR EVENTOS DE UI
// ============================================
inputHandler.onToolChange = (tool, mode) => {
  // Actualizar el botón activo (resalta el botón correspondiente)
  updateActiveButton();

  // Actualizar el selector de modo (select 2D/3D)
  const modeSelect = document.getElementById("drawing-mode");
  if (modeSelect) {
    modeSelect.value = mode;
  }

  console.log(`Herramienta cambiada a: ${tool} (modo ${mode})`);

  // Si la herramienta es 'select', aseguramos modo trasladar
  if (tool === "select" && transformManager) {
    transformManager.setMode("translate");
    console.log("Modo transformador: trasladar");
  }
  if (["rect2d", "circle2d", "line", "freehand"].includes(tool)) {
    tools2DPanel.updateActiveTool(tool);
  }
  if (["cube", "sphere", "cylinder"].includes(tool)) {
    tools3DPanel.updateActiveTool(tool);
  }
};

// Cambiar modo 2D/3D
modeSelect.addEventListener("change", (e) => {
  const newMode = e.target.value;
  inputHandler.drawingMode = newMode;

  // Si la herramienta actual es incompatible, cambiar a select
  if (
    newMode === "2d" &&
    ["cube", "sphere", "cylinder"].includes(inputHandler.currentTool)
  ) {
    inputHandler.setTool("select", newMode);
    updateActiveButton();
  } else if (
    newMode === "3d" &&
    ["rect2d", "circle2d", "line", "freehand"].includes(
      inputHandler.currentTool,
    )
  ) {
    inputHandler.setTool("select", newMode);
    updateActiveButton();
  }
});

document.getElementById("btn-lighting").addEventListener("click", () => {
  lightingPanel.toggle();
});

document.getElementById("btn-tools-2d").addEventListener("click", () => {
  tools2DPanel.toggle();
});

document.getElementById("btn-tools-3d").addEventListener("click", () => {
  tools3DPanel.toggle();
});

document.getElementById("btn-camera").addEventListener("click", () => {
  cameraPanel.toggle();
});

// ============================================
// 5. MANEJO DEL MENÚ SUPERIOR
// ============================================
document.querySelectorAll(".submenu-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    const action = e.target.dataset.action;
    console.log("Menú acción:", action);
    switch (action) {
      case "deshacer":
        editor.undo();
        break;
      case "rehacer":
        editor.redo();
        break;
      case "nuevo":
        if (
          confirm(
            "¿Crear nuevo proyecto? Se perderán los cambios no guardados.",
          )
        ) {
          editor.clearScene();
        }
        break;
      case "abrir":
        alert("Abrir proyecto - funcionalidad pendiente");
        break;
      case "guardar":
        alert("Guardar - funcionalidad pendiente");
        break;
      case "guardarComo":
        alert("Guardar como... - funcionalidad pendiente");
        break;
      case "importar":
        alert("Importar - funcionalidad pendiente");
        break;
      case "exportar":
        alert("Exportar - funcionalidad pendiente");
        break;
      case "addToGroup":
        alert("Add to group - funcionalidad pendiente");
        break;
      case "createGroup":
        alert("Create new group - funcionalidad pendiente");
        break;
      case "aiCharacter":
        alert("AI Character creation - funcionalidad pendiente");
        break;
      case "insertText":
        alert("Insert Text - funcionalidad pendiente");
        break;
      case "landscapes":
        alert("Landscapes - funcionalidad pendiente");
        break;
      default:
        console.log("Acción no definida:", action);
    }
  });
});

// Botones de herramientas

//document.getElementById('btn-freehand').addEventListener('click', () => {
//    inputHandler.setTool('freehand', '2d');
//    modeSelect.value = '2d';
//    updateActiveButton();
//});

//document.getElementById('btn-select').addEventListener('click', () => {
//    inputHandler.setTool('select', inputHandler.drawingMode);
//    updateActiveButton();
//});

// Botones de deshacer/rehacer (pendientes)
document.getElementById("btn-undo")?.addEventListener("click", () => {
  editor.undo();
});

document.getElementById("btn-redo")?.addEventListener("click", () => {
  editor.redo();
});

document.getElementById("btn-assets").addEventListener("click", () => {
  assetsPanel.toggle();
});

document.getElementById("btn-paint-bucket").addEventListener("click", () => {
  if (editor.selectedObject) {
    const color = document.getElementById("color-picker").value;
    // Aplicar color al material del objeto seleccionado
    if (editor.selectedObject.material) {
      editor.selectedObject.material.color.set(color);
      console.log("Color aplicado:", color);
    } else {
      console.warn("El objeto seleccionado no tiene material");
    }
  } else {
    alert("Selecciona un objeto primero");
  }
});

// ============================================
// 3. FUNCIÓN PARA ACTUALIZAR BOTÓN ACTIVO
// ============================================
function updateActiveButton() {
  document.querySelectorAll("#toolbar button").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Si la herramienta actual es de tipo 2D, activar el botón 2D
  const is2DTool = ["rect2d", "circle2d", "line", "freehand"].includes(
    inputHandler.currentTool,
  );
  const is3DTool = ["cube", "sphere", "cylinder"].includes(
    inputHandler.currentTool,
  );

  if (is2DTool) {
    const btn2d = document.getElementById("btn-tools-2d");
    if (btn2d) btn2d.classList.add("active");
  } else if (is3DTool) {
    const btn3d = document.getElementById("btn-tools-3d");
    if (btn3d) btn3d.classList.add("active");
  } else if (inputHandler.currentTool === "select") {
    const btnSelect = document.getElementById("btn-select");
    if (btnSelect) btnSelect.classList.add("active");
  }

  const activeButton = document.querySelector(
    `[id="btn-${inputHandler.currentTool}"]`,
  );
  if (activeButton) {
    activeButton.classList.add("active");
  }
}

// ============================================
// 4. INICIAR
// ============================================
inputHandler.setupEventListeners();

// ============================================
// ZOOM CON TECLA ALT
// ============================================
let altPressed = false;

// Detectar cuándo se presiona o suelta la tecla Alt
window.addEventListener("keydown", (e) => {
  if (e.key === "Alt") {
    altPressed = true;
  }
});
window.addEventListener("keyup", (e) => {
  if (e.key === "Alt") {
    altPressed = false;
  }
});

// Escuchar la rueda del mouse en el canvas
editor.renderer.domElement.addEventListener("wheel", (e) => {
  if (altPressed) {
    e.preventDefault(); // Evita que el zoom normal de OrbitControls se active

    // Velocidad del zoom (ajusta el valor 0.05 para hacerlo más rápido/lento)
    const delta = Math.sign(e.deltaY) * -0.05;

    // Dirección desde la cámara hacia el punto de mira
    const direction = new THREE.Vector3()
      .subVectors(editor.camera.position, editor.controls.target)
      .normalize();

    // Nueva posición de la cámara desplazada en esa dirección
    const newPosition = editor.camera.position
      .clone()
      .add(direction.multiplyScalar(delta));
    editor.camera.position.copy(newPosition);

    // Actualizar los controles para que mantengan el punto de mira
    editor.controls.update();
  }
});

// Reemplazar editor.animate() por un bucle personalizado
function animate() {
  requestAnimationFrame(animate);
  editor.controls.update();
  editor.renderer.render(editor.scene, editor.camera);
  if (lightingPanel) lightingPanel.syncLights();
  if (cameraPanel) cameraPanel.updateIndicator();
}

animate();

// Debug
window.editor = editor;
window.inputHandler = inputHandler;
window.propertiesPanel = propertiesPanel;
