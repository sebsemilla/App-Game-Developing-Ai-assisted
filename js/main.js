// js/main.js
import { Editor } from "./core/Editor.js";
import { GridConfig } from "./ui/GridConfig.js";
import { UIComponents } from "./ui/UIComponents.js";
import { PreviewManager } from "./tools/PreviewManager.js";
import { InputHandler } from "./tools/InputHandler.js";
import { PropertiesPanel } from "./ui/PropertiesPanel.js";
import { CameraManager } from "./cameras/CameraManager.js";
import { TransformManager } from "./controls/TransformManager.js";
import { GridShader } from "./ui/GridShader.js";
import { TextureManager } from "./core/TextureManager.js";
import { AssetsPanel } from "./ui/AssetsPanel.js";
import { LightingPanel } from "./ui/LightingPanel.js";
import { Tools2DPanel } from "./ui/Tools2dPanel.js";
import { Tools3DPanel } from "./ui/Tools3DPanel.js";
import { CameraPanel } from "./ui/CameraPanel.js";
import { AICharacterPanel } from "./ui/AICharacterPanel.js";
import { PanelManager } from "./ui/PanelManager.js";
import * as THREE from "three";

// ============================================
// 1. INICIALIZACIÓN DE DEPENDENCIAS BÁSICAS
// ============================================

const editor = new Editor();
editor.init("canvas-container");

const gridShader = new GridShader(editor);
gridShader.addToScene();

const gridConfig = new GridConfig(editor);
const ui = new UIComponents(editor);
const previewManager = new PreviewManager(editor);
const cameraManager = new CameraManager(editor);
const textureManager = new TextureManager(editor);

const transformManager = new TransformManager(
  editor,
  editor.camera,
  editor.renderer.domElement,
  gridConfig,
);

const propertiesPanel = new PropertiesPanel(editor, gridShader, gridConfig);

// ============================================
// 2. CREAR INPUT HANDLER
// ============================================

const inputHandler = new InputHandler(
  editor,
  gridConfig,
  previewManager,
  ui,
  propertiesPanel,
  transformManager,
  null,
);

// ============================================
// 3. CREAR PANELES QUE DEPENDEN DE INPUT HANDLER
// ============================================

const tools2DPanel = new Tools2DPanel(editor, inputHandler, "btn-tools-2d");
const tools3DPanel = new Tools3DPanel(editor, inputHandler, "btn-tools-3d");
const cameraPanel = new CameraPanel(editor, cameraManager, "btn-camera");
const lightingPanel = new LightingPanel(editor, "btn-lighting");
const assetsPanel = new AssetsPanel(
  editor,
  textureManager,
  propertiesPanel,
  transformManager,
  "btn-assets",
);
const aiCharacterPanel = new AICharacterPanel(editor);

inputHandler.assetsPanel = assetsPanel;

// ============================================
// 4. CREAR PANEL MANAGER Y REGISTRAR PANELES
// ============================================

const panelManager = new PanelManager();
panelManager.register(tools2DPanel);
panelManager.register(tools3DPanel);
panelManager.register(lightingPanel);
panelManager.register(cameraPanel);
panelManager.register(assetsPanel);
panelManager.register(aiCharacterPanel);
panelManager.register(gridConfig);

// ============================================
// 5. CONFIGURACIÓN INICIAL DE INPUT HANDLER
// ============================================

inputHandler.drawingMode = "2d";
inputHandler.setTool("select", inputHandler.drawingMode);
inputHandler.setMarqueeMode(false);

// ============================================
// 6. FUNCIÓN UPDATE ACTIVE BUTTON (DEFINIR ANTES DE USAR)
// ============================================

function updateActiveButton() {
  document.querySelectorAll("#toolbar button").forEach((btn) => {
    btn.classList.remove("active");
  });

  if (inputHandler.currentTool === "select") {
    const btnSelect = document.getElementById("btn-select");
    if (btnSelect) btnSelect.classList.add("active");
  }

  if (inputHandler.marqueeMode) {
    const btnMarquee = document.getElementById("btn-marquee");
    if (btnMarquee) btnMarquee.classList.add("active");
  }
}

// ============================================
// 7. CONFIGURACIÓN DE EVENTOS DE BOTONES (DESPUÉS DE DEFINIR updateActiveButton)
// ============================================

// Botón herramientas 2D
const btnTools2D = document.getElementById("btn-tools-2d");
if (btnTools2D) {
  btnTools2D.addEventListener("click", () => {
    console.log("📐 Botón 2D clickeado");
    panelManager.open(tools2DPanel);
  });
}

// Botón herramientas 3D
const btnTools3D = document.getElementById("btn-tools-3d");
if (btnTools3D) {
  btnTools3D.addEventListener("click", () => {
    console.log("🧊 Botón 3D clickeado");
    panelManager.open(tools3DPanel);
  });
}

// Botón assets
const btnAssets = document.getElementById("btn-assets");
if (btnAssets) {
  btnAssets.addEventListener("click", () => {
    console.log("📦 Botón Assets clickeado");
    panelManager.open(assetsPanel);
  });
}

// Botón iluminación
const btnLighting = document.getElementById("btn-lighting");
if (btnLighting) {
  btnLighting.addEventListener("click", () => {
    console.log("💡 Botón Iluminación clickeado");
    panelManager.open(lightingPanel);
  });
}

// Botón cámara
const btnCamera = document.getElementById("btn-camera");
if (btnCamera) {
  btnCamera.addEventListener("click", () => {
    console.log("🎥 Botón Cámara clickeado");
    panelManager.open(cameraPanel);
  });
}

// Botón selección
const btnSelect = document.getElementById("btn-select");
if (btnSelect) {
  btnSelect.addEventListener("click", () => {
    console.log("🖱️ Botón Selección clickeado");
    inputHandler.setTool("select", inputHandler.drawingMode);
    inputHandler.setMarqueeMode(false);
    updateActiveButton();
  });
}

// Botón marquee
const marqueeBtn = document.getElementById("btn-marquee");
if (marqueeBtn) {
  marqueeBtn.addEventListener("click", () => {
    console.log("🔲 Botón Marquee clickeado");
    const newState = !inputHandler.marqueeMode;
    inputHandler.setMarqueeMode(newState);
    if (newState) {
      inputHandler.setTool("select", inputHandler.drawingMode);
      updateActiveButton();
    }
  });
}

// Botón paint bucket
const paintBucketBtn = document.getElementById("btn-paint-bucket");
if (paintBucketBtn) {
  paintBucketBtn.addEventListener("click", () => {
    if (editor.selectedObject) {
      const color = document.getElementById("color-picker").value;
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
}

// ============================================
// 8. ON TOOL CHANGE CALLBACK
// ============================================

inputHandler.onToolChange = (tool, mode) => {
  updateActiveButton();
  console.log(`Herramienta cambiada a: ${tool} (modo ${mode})`);

  if (tool === "select" && transformManager) {
    transformManager.setMode("translate");
  }
  if (["rect2d", "circle2d", "line", "freehand"].includes(tool)) {
    tools2DPanel.updateActiveTool(tool);
  }
  if (["cube", "sphere", "cylinder"].includes(tool)) {
    tools3DPanel.updateActiveTool(tool);
  }
};

// ============================================
// 9. MANEJO DEL MENÚ SUPERIOR
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
        panelManager.open(aiCharacterPanel);
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

// ============================================
// 10. EJEMPLOS DE ASSETS
// ============================================

assetsPanel.addAsset(
  "favorite-textures",
  "tex1",
  "Madera",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70' viewBox='0 0 70 70'%3E%3Crect width='70' height='70' fill='%238B5A2B'/%3E%3Ctext x='35' y='40' text-anchor='middle' fill='white' font-size='10'%3EMadera%3C/text%3E%3C/svg%3E",
  () => {
    if (editor.selectedObject) {
      textureManager.loadTexture(
        "assets/textures/madera.jpg",
        editor.selectedObject.material,
      );
    } else {
      alert("Selecciona un objeto primero");
    }
  },
);

assetsPanel.addAsset(
  "objects-3d",
  "obj1",
  "Cubo",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70' viewBox='0 0 70 70'%3E%3Crect width='70' height='70' fill='%2344aa88'/%3E%3Ctext x='35' y='40' text-anchor='middle' fill='white' font-size='10'%3ECubo%3C/text%3E%3C/svg%3E",
  () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0.5, 0);
    cube.userData = { type: "cube", mode: "3d" };
    editor.addObject(cube);
  },
);

// ============================================
// 11. ZOOM CON TECLA ALT
// ============================================

let altPressed = false;

window.addEventListener("keydown", (e) => {
  if (e.key === "Alt") altPressed = true;
});
window.addEventListener("keyup", (e) => {
  if (e.key === "Alt") altPressed = false;
});

editor.renderer.domElement.addEventListener("wheel", (e) => {
  if (altPressed) {
    e.preventDefault();
    const delta = Math.sign(e.deltaY) * -0.05;
    const direction = new THREE.Vector3()
      .subVectors(editor.camera.position, editor.controls.target)
      .normalize();
    const newPosition = editor.camera.position
      .clone()
      .add(direction.multiplyScalar(delta));
    editor.camera.position.copy(newPosition);
    editor.controls.update();
  }
});

// ============================================
// 12. INICIAR EVENT LISTENERS Y ANIMACIÓN
// ============================================

inputHandler.setupEventListeners();

function animate() {
  requestAnimationFrame(animate);
  editor.controls.update();
  editor.renderer.render(editor.scene, editor.camera);
  if (lightingPanel) lightingPanel.syncLights();
  if (cameraPanel) cameraPanel.updateIndicator();
}
animate();

// ============================================
// 13. EXPONER GLOBALMENTE
// ============================================

window.editor = editor;
window.inputHandler = inputHandler;
window.panelManager = panelManager;
window.tools2DPanel = tools2DPanel;
window.tools3DPanel = tools3DPanel;
window.lightingPanel = lightingPanel;
window.cameraPanel = cameraPanel;
window.assetsPanel = assetsPanel;
window.aiCharacterPanel = aiCharacterPanel;
window.gridConfig = gridConfig;
window.propertiesPanel = propertiesPanel;

// Al final de main.js, antes del console.log final
// Reasignar eventos de botones (solución para eventos que no funcionan)
const fixButtons = () => {
  const btns = [
    {
      id: "btn-tools-2d",
      handler: () => panelManager.open(tools2DPanel),
      log: "📐 Botón 2D",
    },
    {
      id: "btn-tools-3d",
      handler: () => panelManager.open(tools3DPanel),
      log: "🧊 Botón 3D",
    },
    {
      id: "btn-assets",
      handler: () => panelManager.open(assetsPanel),
      log: "📦 Botón Assets",
    },
    {
      id: "btn-lighting",
      handler: () => panelManager.open(lightingPanel),
      log: "💡 Botón Iluminación",
    },
    {
      id: "btn-camera",
      handler: () => panelManager.open(cameraPanel),
      log: "🎥 Botón Cámara",
    },
    {
      id: "btn-select",
      handler: () => {
        inputHandler.setTool("select", inputHandler.drawingMode);
        inputHandler.setMarqueeMode(false);
        updateActiveButton();
      },
      log: "🖱️ Botón Selección",
    },
    {
      id: "btn-marquee",
      handler: () => {
        const newState = !inputHandler.marqueeMode;
        inputHandler.setMarqueeMode(newState);
        if (newState) {
          inputHandler.setTool("select", inputHandler.drawingMode);
          updateActiveButton();
        }
      },
      log: "🔲 Botón Marquee",
    },
  ];

  btns.forEach(({ id, handler, log }) => {
    const btn = document.getElementById(id);
    if (btn) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.onclick = () => {
        console.log(log, "clickeado");
        handler();
      };
    }
  });
  console.log("✅ Botones reasignados correctamente");
};

fixButtons();

console.log("✅ Gamefy inicializado correctamente");
console.log("📐 Botones disponibles:", {
  "btn-tools-2d": !!document.getElementById("btn-tools-2d"),
  "btn-tools-3d": !!document.getElementById("btn-tools-3d"),
  "btn-assets": !!document.getElementById("btn-assets"),
  "btn-lighting": !!document.getElementById("btn-lighting"),
  "btn-camera": !!document.getElementById("btn-camera"),
});
