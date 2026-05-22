// js/ui/ImportPanel.js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { SimplifyModifier } from "three/addons/modifiers/SimplifyModifier.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class ImportPanel {
  constructor(editor) {
    this.editor = editor;
    this.panel = null;
    this.visible = false;
    this.loadedScene = null; // Escena cargada temporalmente
    this.objectTree = []; // Lista jerárquica de objetos
    this.simplifyPercent = 0.5; // Conservar 50% de polígonos por defecto
    this.modifier = new SimplifyModifier();
    this.previewRenderer = null;
    this.previewScene = null;
    this.previewCamera = null;
    this.previewControls = null;
    this.animationId = null;
    this.currentPreviewModel = null; // Para guardar el modelo actual en preview
    this.lastHighlighted = null; // Para el resaltado temporal
    this.init();
  }

  init() {
    this.panel = document.createElement("div");
    this.panel.className = "import-panel";
    this.panel.style.display = "none";
    this.panel.innerHTML = this.getHTML();
    document.body.appendChild(this.panel);
    this.setupEventListeners();
    this.centerPanel();
    window.addEventListener("resize", () => this.centerPanel());
  }

  getHTML() {
    return `
    <div class="import-panel-header">
      <span>📁 Importar modelo 3D</span>
      <button class="close-btn">×</button>
    </div>
    <div class="import-panel-content">
      <div class="import-file-area">
        <input type="file" id="import-file-input" accept=".gltf,.glb,.obj,.fbx" />
        <button id="load-file-btn" class="load-btn">Cargar archivo</button>
      </div>
      <div class="import-simplify-area">
        <label>Simplificación: <span id="simplify-value">50%</span></label>
        <input type="range" id="simplify-slider" min="0" max="100" step="5" value="50" />
        <p class="help-text">Reduce la cantidad de polígonos (0% = máximo, 100% = original)</p>
      </div>
      <div class="import-split-layout">
        <div class="import-objects-tree">
            <div class="tree-header">
                <label>
                    <input type="checkbox" id="select-all-checkbox" /> Seleccionar todos
                </label>
            </div>
            <div id="objects-tree-container" class="tree-container">
                <div class="empty-message">Carga un archivo para ver los objetos</div>
            </div>
        </div>
        <div class="import-preview-area">
          <h4>Vista previa</h4>
          <div id="preview-canvas-container" class="preview-canvas-container"></div>
          <p class="help-text">Arrastra con el ratón para rotar la vista</p>
        </div>
      </div>
      <div class="import-buttons">
        <button id="confirm-import-btn" class="confirm-btn" disabled>✅ Importar seleccionados</button>
        <button id="cancel-import-btn" class="cancel-btn">Cancelar</button>
      </div>
    </div>
  `;
  }

  setupPreview() {
    const container = this.panel.querySelector("#preview-canvas-container");
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) {
      setTimeout(() => this.setupPreview(), 50);
      return;
    }

    this.previewRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.previewRenderer.setSize(width, height);
    this.previewRenderer.setClearColor(0x1f2a36);
    container.appendChild(this.previewRenderer.domElement);

    this.previewCamera = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.1,
      1000,
    );
    this.previewCamera.position.set(2, 2, 3);
    this.previewCamera.lookAt(0, 0, 0);

    this.previewControls = new OrbitControls(
      this.previewCamera,
      this.previewRenderer.domElement,
    );
    this.previewControls.enableDamping = true;
    this.previewControls.dampingFactor = 0.05;
    this.previewControls.rotateSpeed = 1.0;
    this.previewControls.enableZoom = true;
    this.previewControls.enablePan = false;
    this.previewControls.target.set(0, 0, 0);

    this.previewScene = new THREE.Scene();
    this.previewScene.background = new THREE.Color(0x1f2a36);

    // Luces
    const ambientLight = new THREE.AmbientLight(0x404060);
    this.previewScene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(1, 2, 1);
    this.previewScene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0x88aaff, 0.5);
    backLight.position.set(-1, 1, -1);
    this.previewScene.add(backLight);

    const gridHelper = new THREE.GridHelper(5, 20, 0x888888, 0x444444);
    gridHelper.position.y = -0.5;
    this.previewScene.add(gridHelper);

    this.startPreviewAnimation();

    this.resizeObserver = new ResizeObserver(() => this.resizePreview());
    this.resizeObserver.observe(container);
  }

  destroyPreview() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.previewControls) this.previewControls.dispose();
    if (this.previewRenderer) {
      this.previewRenderer.dispose();
      this.previewRenderer = null;
    }
    if (this.previewScene) {
      // Limpiar la escena de objetos temporales (no el modelo cargado)
      while (this.previewScene.children.length) {
        this.previewScene.remove(this.previewScene.children[0]);
      }
      this.previewScene = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    const container = this.panel?.querySelector("#preview-canvas-container");
    if (container) container.innerHTML = "";
  }

  resizePreview() {
    const container = this.panel?.querySelector("#preview-canvas-container");
    if (!container || !this.previewRenderer) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    this.previewRenderer.setSize(width, height);
    this.previewCamera.aspect = width / height;
    this.previewCamera.updateProjectionMatrix();
  }

  startPreviewAnimation() {
    const animate = () => {
      if (
        !this.visible ||
        !this.previewRenderer ||
        !this.previewScene ||
        !this.previewCamera
      )
        return;
      if (this.previewControls) this.previewControls.update();
      this.previewRenderer.render(this.previewScene, this.previewCamera);
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  setupEventListeners() {
    const selectAllCheckbox = this.panel.querySelector("#select-all-checkbox");
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        this.setAllCheckboxes(isChecked);
      });
    }
    const closeBtn = this.panel.querySelector(".close-btn");
    closeBtn.addEventListener("click", () => this.hide());

    const loadBtn = this.panel.querySelector("#load-file-btn");
    loadBtn.addEventListener("click", () => this.loadFile());

    const simplifySlider = this.panel.querySelector("#simplify-slider");
    const simplifyValue = this.panel.querySelector("#simplify-value");
    simplifySlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      simplifyValue.innerText = val + "%";
      this.simplifyPercent = val / 100;
    });

    const confirmBtn = this.panel.querySelector("#confirm-import-btn");
    confirmBtn.addEventListener("click", () => this.importSelected());

    const cancelBtn = this.panel.querySelector("#cancel-import-btn");
    cancelBtn.addEventListener("click", () => this.hide());
  }

  async loadFile() {
    if (!this.previewRenderer) {
      this.setupPreview();
      // Esperar un frame para que se cree la escena
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const fileInput = this.panel.querySelector("#import-file-input");
    const file = fileInput.files[0];
    if (!file) {
      alert("Selecciona un archivo (glTF, OBJ, FBX)");
      return;
    }

    const MAX_SIZE_MB = 50;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`El archivo supera el tamaño máximo de ${MAX_SIZE_MB} MB.`);
      return;
    }

    const extension = file.name.split(".").pop().toLowerCase();
    let loader;
    if (extension === "gltf" || extension === "glb") {
      loader = new GLTFLoader();
    } else if (extension === "obj") {
      loader = new OBJLoader();
    } else if (extension === "fbx") {
      loader = new FBXLoader();
    } else {
      alert("Formato no soportado. Usa .gltf, .glb, .obj o .fbx");
      return;
    }

    const url = URL.createObjectURL(file);
    try {
      const loaded = await loader.loadAsync(url);
      URL.revokeObjectURL(url);

      // Normalizar a un grupo (escena para glTF, grupo para OBJ/FBX)
      let sceneGroup;
      if (loaded.scene) sceneGroup = loaded.scene;
      else sceneGroup = loaded;

      this.loadedScene = sceneGroup;
      this.buildObjectTree(sceneGroup);
      console.log(
        "Árbol construido, número de elementos:",
        this.objectTree.length,
      );
      this.enableImportButton(true);

      // Mostrar en el área de preview (sin clonar, usando el mismo grupo)
      if (this.previewScene) {
        // Eliminar modelo anterior si existe (solo el modelo, no toda la escena)
        if (this.currentPreviewModel) {
          this.previewScene.remove(this.currentPreviewModel);
        }
        // Añadir el nuevo modelo (el original, no un clon)
        this.currentPreviewModel = sceneGroup;
        console.log(
          "currentPreviewModel asignado correctamente:",
          this.currentPreviewModel,
        );
        if (!this.previewScene) {
          console.warn("previewScene no disponible, llamando a setupPreview");
          this.setupPreview();
        }
        this.previewScene.add(this.currentPreviewModel);

        // Ajustar cámara para encuadrar todo el modelo
        const bbox = new THREE.Box3().setFromObject(sceneGroup);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (this.previewCamera) {
          const distance = maxDim * 1.5;
          this.previewCamera.position.set(distance, distance * 0.8, distance);
          this.previewCamera.lookAt(center);
          if (this.previewControls) {
            this.previewControls.target.copy(center);
            this.previewControls.update();
          }
        }
      }
    } catch (err) {
      console.error("Error cargando modelo:", err);
      alert("Error al cargar el archivo. Ver consola.");
      URL.revokeObjectURL(url);
    }
  }

  setAllCheckboxes(checked) {
    const allCheckboxes = this.panel.querySelectorAll(
      ".tree-item input[type='checkbox']",
    );
    allCheckboxes.forEach((cb) => {
      cb.checked = checked;
    });
    // Actualizar el estado del "Seleccionar todos" si es necesario (ya lo está)
  }

  buildObjectTree(group, parentContainer = null, parentList = null) {
    const container =
      parentContainer || this.panel.querySelector("#objects-tree-container");
    if (!container) return;
    container.innerHTML = "";
    this.objectTree = [];
    const rootList = document.createElement("div");
    rootList.className = "tree-list";
    this.traverseAndBuild(group, rootList, this.objectTree);
    container.appendChild(rootList);
    this.updateSelectAllCheckbox();
  }

  traverseAndBuild(obj, parentElement, parentArray) {
    const itemDiv = document.createElement("div");
    itemDiv.className = "tree-item";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = false;
    checkbox.dataset.id = obj.id || obj.uuid || Math.random();
    const label = document.createElement("span");
    label.textContent =
      obj.name || (obj.isMesh ? "Malla" : obj.isGroup ? "Grupo" : "Objeto");
    label.style.marginLeft = "5px";
    label.style.cursor = "pointer";
    label.style.textDecoration = "underline";
    label.title = "Haz clic para previsualizar";
    label.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log("Clic en objeto:", obj.name);
      this.previewObject(obj);
    });
    checkbox.addEventListener("change", () => {
      this.updateSelectAllCheckbox();
    });

    itemDiv.appendChild(checkbox);
    itemDiv.appendChild(label);
    parentElement.appendChild(itemDiv);

    const entry = { obj, checkbox, children: [] };
    parentArray.push(entry);

    // Si tiene hijos (group o scene)
    if (obj.children && obj.children.length) {
      const childrenContainer = document.createElement("div");
      childrenContainer.style.marginLeft = "20px";
      itemDiv.appendChild(childrenContainer);
      obj.children.forEach((child) => {
        this.traverseAndBuild(child, childrenContainer, entry.children);
      });
    }
  }

  previewObject(obj) {
    console.log("previewObject llamado para:", obj.name, "tipo:", obj.type);
    if (!this.previewScene) {
      console.warn("previewScene no existe, intentando crear...");
      this.setupPreview();
      // Pequeña espera para que se inicialice
      setTimeout(() => this.previewObject(obj), 100);
      return;
    }
    if (!this.currentPreviewModel) {
      console.warn("No hay modelo cargado en la vista previa");
      return;
    }

    // Buscar el objeto equivalente en la escena de preview usando uuid
    const findInScene = (targetUuid, root) => {
      if (root.uuid === targetUuid) return root;
      if (root.children) {
        for (let child of root.children) {
          const found = findInScene(targetUuid, child);
          if (found) return found;
        }
      }
      return null;
    };

    const targetObj = findInScene(obj.uuid, this.currentPreviewModel);
    if (!targetObj) {
      console.warn(
        "No se encontró el objeto equivalente en la vista previa",
        obj.name,
      );
      return;
    }

    console.log("Objeto encontrado en preview:", targetObj.name);

    // Restaurar resaltado anterior
    if (this.lastHighlighted) {
      this.lastHighlighted.traverse((child) => {
        if (child.isMesh && child.userData.originalColor) {
          child.material.color.copy(child.userData.originalColor);
          delete child.userData.originalColor;
        }
      });
    }

    // Calcular el centro del objeto (usamos targetObj, no el original)
    const bbox = new THREE.Box3().setFromObject(targetObj);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Ajustar cámara
    if (this.previewCamera) {
      const direction = new THREE.Vector3(1, 0.5, 1).normalize();
      const distance = Math.max(2, maxDim * 1.5);
      this.previewCamera.position.copy(
        center.clone().add(direction.multiplyScalar(distance)),
      );
      this.previewCamera.lookAt(center);
      if (this.previewControls) {
        this.previewControls.target.copy(center);
        // Forzar actualización después de un breve retardo
        setTimeout(() => this.previewControls.update(), 50);
      }
    }

    // Resaltar el objeto (cambiar color temporalmente)
    targetObj.traverse((child) => {
      if (child.isMesh) {
        if (!child.userData.originalColor) {
          child.userData.originalColor = child.material.color.clone();
        }
        child.material.color.setHex(0xffaa44);
      }
    });
    this.lastHighlighted = targetObj;

    // Restaurar después de 2 segundos
    setTimeout(() => {
      if (this.lastHighlighted === targetObj) {
        targetObj.traverse((child) => {
          if (child.isMesh && child.userData.originalColor) {
            child.material.color.copy(child.userData.originalColor);
            delete child.userData.originalColor;
          }
        });
        this.lastHighlighted = null;
      }
    }, 2000);
  }

  updateSelectAllCheckbox() {
    const allCheckboxes = this.panel.querySelectorAll(
      ".tree-item input[type='checkbox']",
    );
    const selectAll = this.panel.querySelector("#select-all-checkbox");
    if (!selectAll) return;
    const total = allCheckboxes.length;
    const checked = Array.from(allCheckboxes).filter((cb) => cb.checked).length;
    if (total === 0) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    } else if (checked === total) {
      selectAll.checked = true;
      selectAll.indeterminate = false;
    } else if (checked === 0) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    } else {
      selectAll.indeterminate = true;
    }
  }

  enableImportButton(enabled) {
    const btn = this.panel.querySelector("#confirm-import-btn");
    btn.disabled = !enabled;
  }

  importSelected() {
    if (!this.loadedScene) return;

    // Recorrer el árbol y recoger objetos marcados
    const selectedMeshes = [];
    const collectSelected = (list) => {
      for (let item of list) {
        if (item.checkbox.checked) {
          // Solo interesan las mallas (Mesh)
          if (item.obj.isMesh) {
            selectedMeshes.push(item.obj);
          }
        }
        if (item.children.length) collectSelected(item.children);
      }
    };
    collectSelected(this.objectTree);
    console.log("Objetos seleccionados (Mesh):", selectedMeshes.length);
    selectedMeshes.forEach((m) => console.log(" -", m.name, m.type));

    if (selectedMeshes.length === 0) {
      alert("No has seleccionado ningún objeto para importar");
      return;
    }

    // Aplicar simplificación a cada malla
    const simplifiedMeshes = [];
    selectedMeshes.forEach((mesh) => {
      let geometry = mesh.geometry;
      if (this.simplifyPercent < 1.0) {
        // ... simplificación (sin cambios) ...
      }
      const material = mesh.material.clone();
      const newMesh = new THREE.Mesh(geometry, material);

      // === NUEVO: Centrar la geometría ===
      if (geometry && geometry.attributes.position) {
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        const centerX = (box.min.x + box.max.x) / 2;
        const centerY = (box.min.y + box.max.y) / 2;
        const centerZ = (box.min.z + box.max.z) / 2;

        const positionAttribute = geometry.attributes.position;
        const array = positionAttribute.array;
        for (let i = 0; i < array.length; i += 3) {
          array[i] -= centerX;
          array[i + 1] -= centerY;
          array[i + 2] -= centerZ;
        }
        positionAttribute.needsUpdate = true;
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        const minY = geometry.boundingBox.min.y;
        newMesh.position.set(0, -minY, 0);
      } else {
        newMesh.position.set(0, 0, 0);
      }

      // Copiar rotación y escala (pero ya no copiamos la posición original)
      newMesh.rotation.copy(mesh.rotation);
      newMesh.scale.copy(mesh.scale);
      newMesh.castShadow = true;
      newMesh.receiveShadow = true;
      newMesh.userData = {
        imported: true,
        originalName: mesh.name,
        simplified: this.simplifyPercent < 1.0,
      };
      simplifiedMeshes.push(newMesh);
    });

    // Añadir a la escena del editor
    simplifiedMeshes.forEach((mesh) => this.editor.addObject(mesh));
    alert(`Importados ${simplifiedMeshes.length} objetos correctamente.`);
    this.hide();
    // Limpiar estado
    this.loadedScene = null;
    this.objectTree = [];
  }

  centerPanel() {
    if (!this.panel) return;
    this.panel.style.left = "50%";
    this.panel.style.top = "50%";
    this.panel.style.transform = "translate(-50%, -50%)";
  }

  show() {
    this.centerPanel();
    this.panel.style.display = "block";
    this.visible = true;
    if (!this.previewRenderer) {
      this.setupPreview();
    }
  }

  hide() {
    this.panel.style.display = "none";
    this.visible = false;
    // this.destroyPreview();
    // Limpiar recursos del modelo cargado
    if (this.loadedScene) this.loadedScene = null;
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }
}
